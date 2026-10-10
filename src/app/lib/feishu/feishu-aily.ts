import { setTimeout as delay } from 'node:timers/promises'
import type { SyncDebugLogger } from '@/app/lib/wechat/wechat-debug'

const FEISHU_API = 'https://open.feishu.cn/open-apis'
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 10 * 60 * 1000

type FeishuResponse = {
    code: number
    msg?: string
}

async function requestFeishuJson<T extends FeishuResponse>(endpoint: string, init: RequestInit, debug?: SyncDebugLogger) {
    const startedAt = Date.now()
    debug?.('Feishu request started', {
        endpoint,
        method: init.method ?? 'GET',
        body: typeof init.body === 'string' ? init.body : undefined
    })
    try {
        const response = await fetch(`${FEISHU_API}${endpoint}`, { ...init, cache: 'no-store' })
        const body = await response.text()
        let result: T
        try {
            result = JSON.parse(body) as T
        } catch (error) {
            debug?.('Feishu response', {
                endpoint,
                status: response.status,
                headers: Object.fromEntries(response.headers),
                body,
                elapsedMs: Date.now() - startedAt
            })
            throw new Error(`Feishu Aily returned invalid JSON (${endpoint}): HTTP ${response.status}`, { cause: error })
        }
        debug?.('Feishu response', {
            endpoint,
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: result,
            elapsedMs: Date.now() - startedAt
        })
        return { response, result }
    } catch (error) {
        debug?.('Feishu request failed', { endpoint, elapsedMs: Date.now() - startedAt, error })
        throw error
    }
}

async function requestFeishu<T extends FeishuResponse>(endpoint: string, init: RequestInit, debug?: SyncDebugLogger): Promise<T> {
    const { response, result } = await requestFeishuJson<T>(endpoint, init, debug)
    if (response.status === 429) {
        throw new Error('飞书请求过于频繁，请稍后再试。')
    }
    if (!response.ok) {
        throw new Error(`Feishu Aily request failed (${endpoint}): HTTP ${response.status}`)
    }
    if (result.code !== 0) {
        throw new Error(`Feishu Aily request failed (${endpoint}): ${result.msg ?? result.code}`)
    }
    return result
}

export async function callFeishuAily(prompt: string, articleContent: string, cancellationSignal?: AbortSignal, debug?: SyncDebugLogger): Promise<string> {
    debug?.('Feishu Aily started', { prompt, articleContent })
    try {
        const result = await runFeishuAily(prompt, articleContent, cancellationSignal, debug)
        debug?.('Feishu Aily completed', { content: result })
        return result
    } catch (error) {
        debug?.('Feishu Aily failed', error)
        throw error
    }
}

async function runFeishuAily(prompt: string, articleContent: string, cancellationSignal?: AbortSignal, debug?: SyncDebugLogger): Promise<string> {
    cancellationSignal?.throwIfAborted()
    const appId = process.env.FEISHU_AI_CLIENT_ID
    const appSecret = process.env.FEISHU_AI_CLIENT_SECRET
    const ailyAppId = process.env.FEISHU_AILY_AGENT_ID
    if (!appId || !appSecret || !ailyAppId) {
        throw new Error('FEISHU_AI_CLIENT_ID / FEISHU_AI_CLIENT_SECRET / FEISHU_AILY_AGENT_ID must be set')
    }

    // Retrieve the tenant access token
    debug?.('Feishu authentication started')
    const token = await requestFeishu<FeishuResponse & { tenant_access_token: string }>(
        '/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            signal: cancellationSignal,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ app_id: appId, app_secret: appSecret })
        }, debug
    )
    if (!token.tenant_access_token) {
        throw new Error('Feishu Aily response is missing the tenant access token')
    }
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token.tenant_access_token}`
    }
    debug?.('Feishu authentication completed')

    const agentPath = `/aily/v1/agents/${encodeURIComponent(ailyAppId)}`

    // Upload the file
    const file = new Blob([ articleContent ], { type: 'text/plain' })
    const formData = new FormData()
    formData.append('file', file, 'article.md')
    formData.append('type', 'file')
    debug?.('Feishu attachment upload started', { filename: 'article.md', sizeBytes: file.size })
    const { response: uploadResponse, result: upload } = await requestFeishuJson<FeishuResponse & {
        data?: { agent_attachment_id?: string }
    }>(`${agentPath}/attachments`, {
        method: 'POST',
        signal: cancellationSignal,
        headers: { Authorization: `Bearer ${token.tenant_access_token}` },
        body: formData
    }, debug)
    if (!uploadResponse.ok) {
        throw new Error(`Feishu Aily file upload failed: HTTP ${uploadResponse.status} - ${upload.msg ?? upload.code}`)
    }
    if (upload.code !== 0) {
        throw new Error(`Feishu Aily file upload failed: ${upload.msg ?? upload.code}`)
    }
    const attachmentId = upload.data?.agent_attachment_id
    if (!attachmentId) {
        throw new Error('Feishu Aily response is missing the agent attachment ID')
    }
    debug?.('Feishu attachment upload completed', { attachmentId })

    // Send the chat message
    debug?.('Feishu chat creation started', { attachmentId })
    const chat = await requestFeishu<FeishuResponse & { data?: { agent_chat_id?: string } }>(
        `${agentPath}/chats`, {
            method: 'POST',
            signal: cancellationSignal,
            headers,
            body: JSON.stringify({
                user_message: {
                    content: [ { text: prompt, type: 'text' } ],
                    agent_attachment_ids: [ attachmentId ]
                }
            })
        }, debug
    )
    const chatId = chat.data?.agent_chat_id
    if (!chatId) {
        throw new Error('Feishu Aily response is missing the agent chat ID')
    }
    debug?.('Feishu chat creation completed', { chatId })

    // Poll for response
    const controller = new AbortController()
    const timeoutError = new Error(`Feishu Aily chat ${chatId} timed out after 10 minutes`)
    const timeout = setTimeout(() => controller.abort(timeoutError), POLL_TIMEOUT_MS)
    const signal = cancellationSignal ? AbortSignal.any([ controller.signal, cancellationSignal ]) : controller.signal

    try {
        let pollCount = 0
        while (true) {
            debug?.('Feishu polling wait', { chatId, nextPoll: pollCount + 1, intervalMs: POLL_INTERVAL_MS })
            await delay(POLL_INTERVAL_MS, undefined, { signal })
            pollCount++
            const result = await requestFeishu<FeishuResponse & {
                data?: { status?: string; content?: { text?: string }[] }
            }>(
                `${agentPath}/chats/${encodeURIComponent(chatId)}`, { method: 'GET', headers, signal }, debug
            )
            debug?.('Feishu chat status', { chatId, pollCount, status: result.data?.status })
            if (result.data?.status === 'Completed') {
                const text = result.data.content?.[0]?.text
                if (typeof text !== 'string') {
                    throw new Error('Feishu Aily response is missing the chat content')
                }
                return text
            }
        }
    } catch (error) {
        if (cancellationSignal?.aborted) throw cancellationSignal.reason
        if (controller.signal.aborted) {
            throw timeoutError
        }
        throw error
    } finally {
        clearTimeout(timeout)
    }
}

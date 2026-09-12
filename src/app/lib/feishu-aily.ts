import { setTimeout as delay } from 'node:timers/promises'

const FEISHU_API = 'https://open.feishu.cn/open-apis'
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 10 * 60 * 1000

type FeishuResponse = {
    code: number
    msg?: string
}

async function requestFeishu<T extends FeishuResponse>(endpoint: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${FEISHU_API}${endpoint}`, { ...init, cache: 'no-store' })
    const result: T = await response.json()
    if (!response.ok) {
        throw new Error(`Feishu Aily request failed (${endpoint}): HTTP ${response.status}`)
    }
    if (result.code !== 0) {
        throw new Error(`Feishu Aily request failed (${endpoint}): ${result.msg ?? result.code}`)
    }
    return result
}

export async function callFeishuAily(content: string, cancellationSignal?: AbortSignal): Promise<string> {
    cancellationSignal?.throwIfAborted()
    const appId = process.env.FEISHU_AI_CLIENT_ID
    const appSecret = process.env.FEISHU_AI_CLIENT_SECRET
    const ailyAppId = process.env.FEISHU_AILY_AGENT_ID
    if (!appId || !appSecret || !ailyAppId) {
        throw new Error('FEISHU_AI_CLIENT_ID / FEISHU_AI_CLIENT_SECRET / FEISHU_AILY_AGENT_ID must be set')
    }

    const token = await requestFeishu<FeishuResponse & { tenant_access_token: string }>(
        '/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            signal: cancellationSignal,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ app_id: appId, app_secret: appSecret })
        }
    )
    if (!token.tenant_access_token) {
        throw new Error('Feishu Aily response is missing the tenant access token')
    }
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token.tenant_access_token}`
    }

    const chatsPath = `/aily/v1/agents/${encodeURIComponent(ailyAppId)}/chats`
    const chat = await requestFeishu<FeishuResponse & { data?: { agent_chat_id?: string } }>(
        chatsPath, {
            method: 'POST',
            signal: cancellationSignal,
            headers,
            body: JSON.stringify({ user_message: { content: [ { text: content, type: 'text' } ] } })
        }
    )
    const chatId = chat.data?.agent_chat_id
    if (!chatId) {
        throw new Error('Feishu Aily response is missing the agent chat ID')
    }

    const controller = new AbortController()
    const timeoutError = new Error(`Feishu Aily chat ${chatId} timed out after 10 minutes`)
    const timeout = setTimeout(() => controller.abort(timeoutError), POLL_TIMEOUT_MS)
    const signal = cancellationSignal ? AbortSignal.any([controller.signal, cancellationSignal]) : controller.signal

    try {
        while (true) {
            await delay(POLL_INTERVAL_MS, undefined, { signal })
            const result = await requestFeishu<FeishuResponse & {
                data?: { status?: string; content?: { text?: string }[] }
            }>(
                `${chatsPath}/${encodeURIComponent(chatId)}`, { method: 'GET', headers, signal }
            )
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

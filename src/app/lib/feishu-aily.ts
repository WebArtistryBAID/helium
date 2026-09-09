import { randomUUID } from 'node:crypto'

const FEISHU_API = 'https://open.feishu.cn/open-apis'
const POLL_INTERVAL_MS = 3000

type FeishuResponse = {
    code: number
    msg?: string
}

type Run = {
    id: string
    status: string
    error?: { code?: string; message?: string }
}

async function requestFeishu<T extends FeishuResponse>(endpoint: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${FEISHU_API}${endpoint}`, { ...init, cache: 'no-store' })
    if (!response.ok) {
        throw new Error(`Feishu Aily request failed (${endpoint}): HTTP ${response.status}`)
    }
    const result: T = await response.json()
    if (result.code !== 0) {
        throw new Error(`Feishu Aily request failed (${endpoint}): ${result.msg ?? result.code}`)
    }
    return result
}

export async function callFeishuAily(content: string): Promise<string> {
    const appId = process.env.FEISHU_AI_ID
    const appSecret = process.env.FEISHU_AI_SECRET
    const ailyAppId = process.env.FEISHU_AILY_APP_ID
    if (!appId || !appSecret || !ailyAppId) {
        throw new Error('FEISHU_AI_ID / FEISHU_AI_SECRET / FEISHU_AILY_APP_ID must be set')
    }

    const token = await requestFeishu<FeishuResponse & { tenant_access_token: string }>(
        '/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ app_id: appId, app_secret: appSecret })
        }
    )
    if (!token.tenant_access_token) {
        throw new Error('Feishu Aily response is missing the tenant access token')
    }
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.tenant_access_token}`
    }

    const session = await requestFeishu<FeishuResponse & { data?: { session?: { id: string } } }>(
        '/aily/v1/sessions', { method: 'POST', headers, body: '{}' }
    )
    const sessionId = session.data?.session?.id
    if (!sessionId) {
        throw new Error('Feishu Aily response is missing the session ID')
    }
    const sessionPath = `/aily/v1/sessions/${encodeURIComponent(sessionId)}`

    await requestFeishu(`${sessionPath}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, content_type: 'MDX', idempotent_id: randomUUID() })
    })

    const createdRun = await requestFeishu<FeishuResponse & { data?: { run?: Run } }>(
        `${sessionPath}/runs`, {
            method: 'POST', headers, body: JSON.stringify({ app_id: ailyAppId })
        }
    )
    const runId = createdRun.data?.run?.id
    if (!runId) {
        throw new Error('Feishu Aily response is missing the run ID')
    }

    while (true) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
        const result = await requestFeishu<FeishuResponse & { data?: { run?: Run } }>(
            `${sessionPath}/runs/${encodeURIComponent(runId)}`, { method: 'GET', headers }
        )
        const run = result.data?.run
        if (!run?.status) {
            throw new Error('Feishu Aily response is missing the run status')
        }
        if (run.status === 'COMPLETED') break
        if (run.error?.code || [ 'FAILED', 'CANCELLED', 'EXPIRED' ].includes(run.status)) {
            throw new Error(`Feishu Aily run ${runId} ended: ${run.error?.message ?? run.status}`)
        }
    }

    const messages = await requestFeishu<FeishuResponse & { data?: { messages?: { content: string }[] } }>(
        `${sessionPath}/messages?run_id=${encodeURIComponent(runId)}&with_partial_messages=false`,
        { method: 'GET', headers }
    )
    const result = messages.data?.messages?.[0]?.content
    if (typeof result !== 'string' || !result.trim()) {
        throw new Error('Feishu Aily response is missing the message content')
    }
    return result
}

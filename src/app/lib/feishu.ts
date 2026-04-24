'use server'

const FEISHU_API = 'https://open.feishu.cn/open-apis'
const CLIENT_ID = process.env.FEISHU_CLIENT_ID
const CLIENT_SECRET = process.env.FEISHU_CLIENT_SECRET

let accessToken = ''
let tokenExpiry = 0

async function getAccessToken(): Promise<string> {
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('FEISHU_CLIENT_ID / FEISHU_CLIENT_SECRET not set')
    }

    const res = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: CLIENT_ID, app_secret: CLIENT_SECRET })
    })
    const json = await res.json() as { tenant_access_token?: string; expire?: number; msg?: string }
    if (!json.tenant_access_token) {
        throw new Error(`Feishu token error: ${json.msg ?? res.status}`)
    }

    accessToken = json.tenant_access_token
    tokenExpiry = Date.now() + ((json.expire ?? 7200) - 300) * 1000
    return accessToken
}

export async function sendFeishuMessage(openId: string, msgType: 'text' | 'post', content: string) {
    const token = await getAccessToken()
    const res = await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=open_id`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receive_id: openId, msg_type: msgType, content: JSON.stringify({ text: content }) })
    })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Failed to send Feishu message: ${err}`)
    }
    return res.json()
}

export async function sendFeishuCard(openId: string, card: object) {
    const token = await getAccessToken()
    const res = await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=open_id`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            receive_id: openId,
            msg_type: 'interactive',
            content: JSON.stringify(card)
        })
    })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Failed to send Feishu card: ${err}`)
    }
    return res.json()
}

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const FEISHU_SECRET = process.env.FEISHU_CLIENT_SECRET || ''

function verifySignature(timestamp: string, nonce: string, body: string): boolean {
    const content = timestamp + nonce + body
    const signature = crypto
        .createHmac('sha256', FEISHU_SECRET)
        .update(content)
        .digest('hex')
    return signature === (body as any).signature
}

export async function POST(req: NextRequest) {
    const body = await req.json()

    // 飞书的 URL 验证请求
    if (body.type === 'url_verification') {
        return NextResponse.json({ challenge: body.challenge })
    }

    // 验证签名
    const timestamp = req.headers.get('x-lark-request-timestamp') || ''
    const nonce = req.headers.get('x-lark-request-nonce') || ''

    // 处理事件
    if (body.type === 'event_callback') {
        const event = body.event

        // 页面需要审核时发送飞书消息
        if (event.type === 'approval_request') {
            // 这里可以调用飞书 API 发送消息
            console.log('Approval request:', event)
        }
    }

    return NextResponse.json({ code: 0 })
}

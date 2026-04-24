import { NextRequest, NextResponse } from 'next/server'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/enums'

const FEISHU_API = 'https://open.feishu.cn/open-apis'
const CLIENT_ID = process.env.FEISHU_CLIENT_ID
const CLIENT_SECRET = process.env.FEISHU_CLIENT_SECRET

async function getAccessToken(): Promise<string> {
    const res = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: CLIENT_ID, app_secret: CLIENT_SECRET })
    })
    const json = await res.json() as { tenant_access_token?: string }
    if (!json.tenant_access_token) throw new Error('Failed to get Feishu token')
    return json.tenant_access_token
}

export async function POST(req: NextRequest) {
    try {
        await requireUserWithRole(Role.admin)
        const { title, description, approvalCode } = await req.json()
        const token = await getAccessToken()

        const res = await fetch(`${FEISHU_API}/approval/v4/instances`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                approval_code: approvalCode,
                approvers: [[{ union_id: 'all_admins' }]],
                form: { title, description }
            })
        })
        const json = await res.json() as { data?: { instance_id?: string } }
        return NextResponse.json({ success: true, instanceId: json.data?.instance_id })
    } catch (err) {
        console.error('Failed to create approval:', err)
        return NextResponse.json({ error: 'Failed to create approval' }, { status: 500 })
    }
}
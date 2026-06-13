'use server'

import { prisma } from '@/app/lib/prisma'
import { Role } from '@/generated/prisma/enums'

const FEISHU_API = 'https://open.feishu.cn/open-apis'

let accessToken = ''
let tokenExpiry = 0

type NotificationData = {
    entityId: number
    entityType: string
    title: string
    previewUrl: string
    approvalUrl: string
}

function getEntityTypeLabel(entityType: string) {
    return ({
        post: '文章',
        page: '页面',
        club: '社团',
        activity: '校园活动',
        project: '自主项目',
        course: '课程',
        faculty: '教职工'
    } as Record<string, string>)[entityType] ?? entityType
}

function buildApprovalCard(data: NotificationData & { requestedBy: string }) {
    const entityType = getEntityTypeLabel(data.entityType)

    return {
        config: { wide_screen_mode: true, enable_forward: true },
        header: {
            template: 'orange',
            title: { tag: 'plain_text', content: '内容审核请求' }
        },
        elements: [
            {
                tag: 'div',
                text: {
                    tag: 'lark_md',
                    content: `**${data.title}**\n有一条新的${entityType}内容正在等待审核。`
                }
            },
            {
                tag: 'div',
                fields: [
                    { is_short: true, text: { tag: 'lark_md', content: `**内容类型**\n${entityType}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**内容 ID**\n${data.entityId}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**提交人**\n${data.requestedBy}` } }
                ]
            },
            {
                tag: 'action',
                actions: [
                    { tag: 'button', text: { tag: 'plain_text', content: '查看预览' }, url: data.previewUrl },
                    {
                        tag: 'button',
                        style: 'primary',
                        text: { tag: 'plain_text', content: '进入审核' },
                        url: data.approvalUrl
                    }
                ]
            }
        ]
    }
}

function buildProgressCard(data: NotificationData & {
    actionBy: string
    approvedRole?: string
    statusText: string
    editorCount: number
    editorThreshold: number
    adminCount: number
    adminThreshold: number
}) {
    const entityType = getEntityTypeLabel(data.entityType)
    const role = data.approvedRole === 'editor'
        ? '编辑员审核'
        : data.approvedRole === 'admin' ? '管理员审核' : '发布'

    return {
        config: { wide_screen_mode: true, enable_forward: true },
        header: {
            template: data.approvedRole === 'editor' ? 'blue' : 'green',
            title: { tag: 'plain_text', content: '审核进度更新' }
        },
        elements: [
            {
                tag: 'div',
                text: { tag: 'lark_md', content: `**${data.title}**\n${data.statusText}` }
            },
            {
                tag: 'div',
                fields: [
                    { is_short: true, text: { tag: 'lark_md', content: `**内容类型**\n${entityType}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**当前步骤**\n${role}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**操作人**\n${data.actionBy}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**内容 ID**\n${data.entityId}` } }
                ]
            },
            {
                tag: 'div',
                fields: [
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**编辑员审核**\n${data.editorCount}/${data.editorThreshold}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**管理员审核**\n${data.adminCount}/${data.adminThreshold}`
                        }
                    }
                ]
            },
            {
                tag: 'action',
                actions: [
                    { tag: 'button', text: { tag: 'plain_text', content: '查看预览' }, url: data.previewUrl },
                    {
                        tag: 'button',
                        style: 'primary',
                        text: { tag: 'plain_text', content: '查看审核进度' },
                        url: data.approvalUrl
                    }
                ]
            }
        ]
    }
}

async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken
    }

    const clientId = process.env.FEISHU_CLIENT_ID
    const clientSecret = process.env.FEISHU_CLIENT_SECRET
    if (!clientId || !clientSecret) {
        throw new Error('FEISHU_CLIENT_ID / FEISHU_CLIENT_SECRET not set')
    }

    const response = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: clientId, app_secret: clientSecret })
    })
    const result = await response.json() as {
        code?: number
        msg?: string
        tenant_access_token?: string
        expire?: number
    }

    if (!response.ok || result.code || !result.tenant_access_token) {
        throw new Error(result.msg ?? `Feishu token error: ${response.status}`)
    }

    accessToken = result.tenant_access_token
    tokenExpiry = Date.now() + Math.max((result.expire ?? 7200) - 300, 0) * 1000
    return accessToken
}

async function sendCard(openId: string, card: object) {
    const token = await getAccessToken()
    const response = await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=open_id`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            receive_id: openId,
            msg_type: 'interactive',
            content: JSON.stringify(card)
        })
    })
    const result = await response.json() as { code?: number; msg?: string }

    if (!response.ok || result.code) {
        throw new Error(result.msg ?? `Feishu card error: ${response.status}`)
    }
}

async function deliver(type: string, card: object, recipients: {
    name: string
    feishuOpenId: string | null
}[]) {
    let sentCount = 0

    for (const recipient of recipients) {
        if (!recipient.feishuOpenId) {
            continue
        }

        try {
            await sendCard(recipient.feishuOpenId, card)
            sentCount += 1
            await prisma.feishuMessage.create({
                data: {
                    type,
                    recipient: recipient.name,
                    recipientId: recipient.feishuOpenId,
                    content: JSON.stringify(card),
                    status: 'sent',
                    sentAt: new Date()
                }
            })
        } catch (error) {
            const detail = error instanceof Error ? error.message : '发送失败'
            await prisma.feishuMessage.create({
                data: {
                    type,
                    recipient: recipient.name,
                    recipientId: recipient.feishuOpenId,
                    content: JSON.stringify(card),
                    status: 'failed',
                    error: detail
                }
            })
            console.error(`Failed to send Feishu notification to ${recipient.name}:`, error)
        }
    }

    return { ok: sentCount > 0, sentCount }
}

export async function sendApprovalNotification(data: NotificationData & { requestedBy: string }) {
    try {
        const recipients = await prisma.user.findMany({
            where: {
                OR: [
                    { roles: { has: Role.admin } },
                    { roles: { has: Role.editor } }
                ],
                feishuOpenId: { not: null }
            },
            select: { name: true, feishuOpenId: true }
        })

        return await deliver('approval_request', buildApprovalCard(data), recipients)
    } catch (error) {
        console.error('Failed to send approval notification:', error)
        return { ok: false, sentCount: 0 }
    }
}

export async function sendApprovalProgressNotification(data: NotificationData & {
    actionBy: string
    approvedRole?: string
    statusText: string
    editorCount: number
    editorThreshold: number
    adminCount: number
    adminThreshold: number
}) {
    try {
        const recipients = await prisma.user.findMany({
            where: { feishuOpenId: { not: null } },
            select: { name: true, feishuOpenId: true }
        })

        return await deliver('approval_progress', buildProgressCard(data), recipients)
    } catch (error) {
        console.error('Failed to send approval progress notification:', error)
        return { ok: false, sentCount: 0 }
    }
}

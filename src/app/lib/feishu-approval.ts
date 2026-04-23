'use server'

import { prisma } from '@/app/lib/prisma'
import { Role } from '@/generated/prisma/enums'

const FEISHU_API = 'https://open.feishu.cn/open-apis'
const CLIENT_ID = process.env.FEISHU_CLIENT_ID
const CLIENT_SECRET = process.env.FEISHU_CLIENT_SECRET

let accessToken = ''
let tokenExpiry = 0

type ApprovalRecipient = {
    id: number
    name: string
    feishuOpenId: string | null
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

function buildApprovalCard(data: {
    entityId: number
    entityType: string
    title: string
    previewUrl: string
    approvalUrl: string
    requestedBy?: string
}) {
    const entityTypeLabel = getEntityTypeLabel(data.entityType)

    return {
        config: {
            wide_screen_mode: true,
            enable_forward: true
        },
        header: {
            template: 'orange',
            title: {
                tag: 'plain_text',
                content: '内容审核请求'
            }
        },
        elements: [
            {
                tag: 'div',
                text: {
                    tag: 'lark_md',
                    content: `**${data.title}**\n有一条新的${entityTypeLabel}内容正在等待审核。`
                }
            },
            {
                tag: 'div',
                fields: [
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**内容类型**\n${entityTypeLabel}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**内容 ID**\n${data.entityId}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**提交人**\n${data.requestedBy ?? '内容编辑者'}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**建议流程**\n先预览，再审核`
                        }
                    }
                ]
            },
            {
                tag: 'hr'
            },
            {
                tag: 'note',
                elements: [
                    {
                        tag: 'plain_text',
                        content: '请先确认内容排版与信息完整性，再进入审核与发布页面处理。'
                    }
                ]
            },
            {
                tag: 'action',
                actions: [
                    {
                        tag: 'button',
                        text: {
                            tag: 'plain_text',
                            content: '查看预览'
                        },
                        url: data.previewUrl
                    },
                    {
                        tag: 'button',
                        style: 'primary',
                        text: {
                            tag: 'plain_text',
                            content: '进入审核'
                        },
                        url: data.approvalUrl
                    }
                ]
            }
        ]
    }
}

function getRoleLabel(role: string) {
    return ({
        editor: '编辑员审核',
        admin: '管理员审核',
        writer: '撰稿'
    } as Record<string, string>)[role] ?? role
}

function buildApprovalProgressCard(data: {
    entityId: number
    entityType: string
    title: string
    previewUrl: string
    approvalUrl: string
    actionBy: string
    approvedRole?: string
    statusText: string
    editorCount?: number
    editorThreshold?: number
    adminCount?: number
    adminThreshold?: number
}) {
    const entityTypeLabel = getEntityTypeLabel(data.entityType)
    const roleLabel = data.approvedRole ? getRoleLabel(data.approvedRole) : '发布'

    return {
        config: {
            wide_screen_mode: true,
            enable_forward: true
        },
        header: {
            template: data.approvedRole === 'admin' || !data.approvedRole ? 'green' : 'blue',
            title: {
                tag: 'plain_text',
                content: '审核进度更新'
            }
        },
        elements: [
            {
                tag: 'div',
                text: {
                    tag: 'lark_md',
                    content: `**${data.title}**\n${data.statusText}`
                }
            },
            {
                tag: 'div',
                fields: [
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**内容类型**\n${entityTypeLabel}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**当前步骤**\n${roleLabel}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**操作人**\n${data.actionBy}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**内容 ID**\n${data.entityId}`
                        }
                    }
                ]
            },
            {
                tag: 'div',
                fields: [
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**编辑员审核**\n${data.editorCount ?? 0}/${data.editorThreshold ?? 1}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**管理员审核**\n${data.adminCount ?? 0}/${data.adminThreshold ?? 1}`
                        }
                    }
                ]
            },
            {
                tag: 'hr'
            },
            {
                tag: 'note',
                elements: [
                    {
                        tag: 'plain_text',
                        content: '这是审核流程状态通知。若前序步骤已完成，下一位负责人可以继续处理。'
                    }
                ]
            },
            {
                tag: 'action',
                actions: [
                    {
                        tag: 'button',
                        text: {
                            tag: 'plain_text',
                            content: '查看预览'
                        },
                        url: data.previewUrl
                    },
                    {
                        tag: 'button',
                        style: 'primary',
                        text: {
                            tag: 'plain_text',
                            content: '查看审核进度'
                        },
                        url: data.approvalUrl
                    }
                ]
            }
        ]
    }
}

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

async function sendCard(openId: string, card: object) {
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
        throw new Error(await res.text())
    }

    const json = await res.json() as { code?: number; msg?: string }
    if (json.code && json.code !== 0) {
        throw new Error(json.msg ?? `Feishu card error: ${json.code}`)
    }
}

export async function sendApprovalNotification(data: {
    entityId: number
    entityType: string
    title: string
    previewUrl: string
    approvalUrl: string
    requestedBy?: string
}, recipients?: ApprovalRecipient[]) {
    try {
        const approvers = recipients ?? await prisma.user.findMany({
            where: {
                OR: [
                    { roles: { has: Role.admin } },
                    { roles: { has: Role.editor } }
                ],
                feishuOpenId: { not: null }
            },
            select: {
                id: true,
                name: true,
                feishuOpenId: true
            }
        })

        const card = buildApprovalCard(data)
        let sentCount = 0

        for (const approver of approvers) {
            if (approver.feishuOpenId) {
                try {
                    await sendCard(approver.feishuOpenId, card)
                    sentCount += 1

                    await prisma.feishuMessage.create({
                        data: {
                            type: 'approval_request',
                            recipient: approver.name,
                            recipientId: approver.feishuOpenId,
                            content: JSON.stringify(card),
                            status: 'sent',
                            sentAt: new Date()
                        }
                    })
                } catch (error) {
                    const detail = error instanceof Error ? error.message : '发送失败'
                    await prisma.feishuMessage.create({
                        data: {
                            type: 'approval_request',
                            recipient: approver.name,
                            recipientId: approver.feishuOpenId,
                            content: JSON.stringify(card),
                            status: 'failed',
                            error: detail
                        }
                    })
                    console.error(`Failed to send approval notification to ${approver.name}:`, error)
                }
            }
        }

        return {
            ok: sentCount > 0,
            sentCount
        }
    } catch (err) {
        console.error('Failed to send approval notification:', err)
        return {
            ok: false,
        sentCount: 0
        }
    }
}

export async function sendApprovalProgressNotification(data: {
    entityId: number
    entityType: string
    title: string
    previewUrl: string
    approvalUrl: string
    actionBy: string
    approvedRole?: string
    statusText: string
    editorCount?: number
    editorThreshold?: number
    adminCount?: number
    adminThreshold?: number
}) {
    try {
        const recipients = await prisma.user.findMany({
            where: {
                feishuOpenId: { not: null }
            },
            select: {
                id: true,
                name: true,
                feishuOpenId: true
            }
        })

        const card = buildApprovalProgressCard(data)
        let sentCount = 0

        for (const recipient of recipients) {
            if (!recipient.feishuOpenId) continue

            try {
                await sendCard(recipient.feishuOpenId, card)
                sentCount += 1

                await prisma.feishuMessage.create({
                    data: {
                        type: 'approval_progress',
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
                        type: 'approval_progress',
                        recipient: recipient.name,
                        recipientId: recipient.feishuOpenId,
                        content: JSON.stringify(card),
                        status: 'failed',
                        error: detail
                    }
                })
                console.error(`Failed to send approval progress notification to ${recipient.name}:`, error)
            }
        }

        return {
            ok: sentCount > 0,
            sentCount
        }
    } catch (err) {
        console.error('Failed to send approval progress notification:', err)
        return {
            ok: false,
            sentCount: 0
        }
    }
}

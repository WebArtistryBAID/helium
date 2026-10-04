import { prisma } from '@/app/lib/prisma'
import { getPublishedWebsiteMetadata } from '@/app/lib/metadata/website-metadata.server'
import { Role } from '@/generated/prisma/client'

const FEISHU_API = 'https://open.feishu.cn/open-apis'

let accessToken = ''
let tokenExpiry = 0

type NotificationData = {
    entityId: number
    entityType: string
    targetRole: typeof Role.editor | typeof Role.admin
    title: string
    editorUrl: string
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
        course: '课程介绍',
        faculty: '教职工介绍'
    } as Record<string, string>)[entityType] ?? entityType
}

function buildApprovalCard(data: NotificationData & { requestedBy: string; websiteTitle: string }) {
    const entityType = getEntityTypeLabel(data.entityType)
    const contentLink = data.targetRole === Role.editor
        ? { label: '查看内容', url: data.editorUrl }
        : { label: '查看预览', url: data.previewUrl }

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
                    content: `有一条新的${entityType}内容待审核，请及时查看。`
                }
            },
            {
                tag: 'div',
                fields: [
                    { is_short: false, text: { tag: 'lark_md', content: `**网站**\n${data.websiteTitle}` } },
                    { is_short: false, text: { tag: 'lark_md', content: `**标题**\n${data.title}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**内容类型**\n${entityType}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**请求人**\n${data.requestedBy}` } }
                ]
            },
            {
                tag: 'action',
                actions: [
                    { tag: 'button', text: { tag: 'plain_text', content: contentLink.label }, url: contentLink.url },
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

type PublicationData = {
    entityType: string
    title: string
    publishedBy: string
    url: string
}

function buildPublicationCard(data: PublicationData & { websiteTitle: string }) {
    const entityType = getEntityTypeLabel(data.entityType)
    return {
        config: { wide_screen_mode: true, enable_forward: true },
        header: {
            template: 'orange',
            title: { tag: 'plain_text', content: '内容已发布' }
        },
        elements: [
            { tag: 'div', text: { tag: 'lark_md', content: `一条${entityType}内容已经发布。` } },
            {
                tag: 'div',
                fields: [
                    { is_short: false, text: { tag: 'lark_md', content: `**网站**\n${data.websiteTitle}` } },
                    { is_short: false, text: { tag: 'lark_md', content: `**标题**\n${data.title}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**内容类型**\n${entityType}` } },
                    { is_short: true, text: { tag: 'lark_md', content: `**发布人**\n${data.publishedBy}` } }
                ]
            },
            {
                tag: 'action',
                actions: [
                    { tag: 'button', text: { tag: 'plain_text', content: '查看' }, url: data.url, style: 'primary' }
                ]
            }
        ]
    }
}

export async function sendPublicationNotification(data: PublicationData) {
    const recipients = await prisma.user.findMany({
        where: { roles: { has: Role.admin }, feishuOpenId: { not: null } },
        select: { id: true, name: true, feishuOpenId: true }
    })
    if (recipients.length === 0) return { sentUserIds: [] }
    const metadata = await getPublishedWebsiteMetadata()
    return sendCards(buildPublicationCard({ ...data, websiteTitle: metadata.zh.title }), recipients, 'publication')
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

// Called only by the authenticated review action with validated recipients.
export async function sendApprovalNotification(data: NotificationData & { requestedBy: string }, recipients: {
    id: number
    name: string
    feishuOpenId: string | null
}[]) {
    const websiteMetadata = await getPublishedWebsiteMetadata()
    const card = buildApprovalCard({ ...data, websiteTitle: websiteMetadata.zh.title })
    return sendCards(card, recipients, 'approval_request')
}

async function sendCards(card: object, recipients: {
    id: number
    name: string
    feishuOpenId: string | null
}[], type: 'approval_request' | 'publication') {
    const sentUserIds: number[] = []

    for (const recipient of recipients) {
        if (!recipient.feishuOpenId) {
            continue
        }

        let deliveryError: string | null = null
        try {
            await sendCard(recipient.feishuOpenId, card)
            sentUserIds.push(recipient.id)
        } catch (error) {
            deliveryError = error instanceof Error ? error.message : '发送失败'
            console.error(`Failed to send Feishu notification to ${recipient.name}:`, error)
        }
        try {
            await prisma.feishuMessage.create({
                data: {
                    type,
                    recipient: recipient.name,
                    recipientId: recipient.feishuOpenId,
                    content: JSON.stringify(card),
                    status: deliveryError ? 'failed' : 'sent',
                    sentAt: deliveryError ? null : new Date(),
                    error: deliveryError
                }
            })
        } catch (error) {
            console.error('Failed to record Feishu notification:', error)
        }
    }

    return { sentUserIds }
}

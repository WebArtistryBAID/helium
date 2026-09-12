'use server'

import { EntityType, Role } from '@/generated/prisma/client'
import { requireUserWithRole } from '@/app/login/login-actions'
import { prisma } from '@/app/lib/prisma'
import { sendApprovalNotification } from '@/app/lib/feishu/feishu-approval'
import {
    WEBSITE_METADATA_SLUG,
    WEBSITE_METADATA_STUDIO_PATH
} from '@/app/lib/metadata/website-metadata-types'

export type ApprovalThresholds = {
    [Role.editor]?: number
    [Role.admin]?: number
}

function getStudioReviewUrls(entityType: EntityType, entityId: number, slug?: string) {
    const baseUrl = process.env.HOST!
    if (slug === WEBSITE_METADATA_SLUG) {
        return {
            previewUrl: `${baseUrl}${WEBSITE_METADATA_STUDIO_PATH}`,
            approvalUrl: `${baseUrl}${WEBSITE_METADATA_STUDIO_PATH}#approval`
        }
    }
    if (entityType === EntityType.page) {
        return {
            previewUrl: `${baseUrl}/studio/pages/${entityId}/preview`,
            approvalUrl: `${baseUrl}/studio/pages/${entityId}/approval`
        }
    }
    return {
        previewUrl: `${baseUrl}/studio/editor/${entityId}#preview`,
        approvalUrl: `${baseUrl}/studio/editor/${entityId}#approval`
    }
}

export async function addApproval(params: {
    entityType: EntityType
    entityId: number,
    role: Role
}) {
    const { entityType, entityId, role } = params
    const user = await requireUserWithRole(role)
    await prisma.approval.upsert({
        where: { entityType_entityId_role_userId: { entityType, entityId, role, userId: user.id } },
        create: { entityType, entityId, role, userId: user.id },
        update: {}
    })
}

export async function removeAllApprovals(params: {
    entityType: EntityType
    entityId: number
}) {
    const { entityType, entityId } = params
    await prisma.approval.deleteMany({ where: { entityType, entityId } })
}

export async function getApprovalCounts(entityType: EntityType, entityId: number) {
    const rows = await prisma.approval.groupBy({
        by: [ 'role' ],
        where: { entityType, entityId },
        _count: { role: true }
    })
    const map: Record<Role, number> = {
        admin: 0, editor: 0, writer: 0
    }
    rows.forEach(r => {
        map[r.role as Role] = r._count.role
    })
    return map
}

export async function getApprovalNames(entityType: EntityType, entityId: number) {
    const rows = await prisma.approval.findMany({
        where: { entityType, entityId },
        select: { userId: true, role: true }
    })
    const map: Record<Role, string[]> = { admin: [], editor: [], writer: [] }
    for (const r of rows) {
        const user = await prisma.user.findUnique({ where: { id: r.userId }, select: { name: true } })
        if (user) {
            map[r.role].push(user.name)
        }
    }
    return map
}

// Pull thresholds from DB config if present, otherwise fall back to code
export async function getThresholds(entityType: EntityType) {
    const cfg = await prisma.approvalConfig.findUnique({ where: { entityType } })
    return {
        [Role.editor]: cfg?.minEditor ?? 1,
        [Role.admin]: cfg?.minAdmin ?? 1
    } as ApprovalThresholds
}

export async function meetsThresholds(params: {
    entityType: EntityType
    entityId: number
}) {
    const counts = await getApprovalCounts(params.entityType, params.entityId)
    const thresholds = await getThresholds(params.entityType)
    const editorOk = (counts[Role.editor] ?? 0) >= (thresholds[Role.editor] ?? 0)
    const adminOk = (counts[Role.admin] ?? 0) >= (thresholds[Role.admin] ?? 0)
    return { editorOk, adminOk, counts, thresholds }
}

export type ApprovalNotificationRecipients = {
    role: typeof Role.editor | typeof Role.admin | null
    recipients: { id: number; name: string; disabled: boolean }[]
}

export async function getApprovalNotificationRecipients(params: {
    entityType: EntityType
    entityId: number
}): Promise<ApprovalNotificationRecipients> {
    await requireUserWithRole(Role.writer)
    const state = await meetsThresholds(params)
    const role = !state.editorOk ? Role.editor : !state.adminOk ? Role.admin : null
    if (!role) {
        return { role, recipients: [] }
    }

    const [ users, approvals ] = await Promise.all([
        prisma.user.findMany({
            where: { roles: { has: role } },
            select: { id: true, name: true, feishuOpenId: true },
            orderBy: [ { pinyin: 'asc' }, { name: 'asc' }, { id: 'asc' } ]
        }),
        prisma.approval.findMany({
            where: { ...params, role },
            select: { userId: true }
        })
    ])
    const approvedIds = new Set(approvals.map(approval => approval.userId))
    return {
        role,
        recipients: users.map(user => ({
            id: user.id,
            name: user.name,
            disabled: !user.feishuOpenId || approvedIds.has(user.id)
        }))
    }
}

export async function requestContentReview(params: {
    entityType: EntityType
    entityId: number
    role: typeof Role.editor | typeof Role.admin
    recipientIds: number[]
}): Promise<{ sentUserIds: number[]; error: string | null }> {
    const user = await requireUserWithRole(Role.writer)
    const entity = await prisma.contentEntity.findUnique({
        where: { id: params.entityId, type: params.entityType },
        select: { titleDraftEN: true, titleDraftZH: true, slug: true }
    })
    if (!entity) {
        throw new Error('Content entity not found')
    }

    const recipientIds = [ ...new Set(params.recipientIds) ]
    if (recipientIds.length === 0) {
        return { sentUserIds: [], error: '请选择通知对象。' }
    }
    const current = await getApprovalNotificationRecipients({
        entityType: params.entityType,
        entityId: params.entityId
    })
    const eligibleIds = new Set(current.recipients.filter(recipient => !recipient.disabled).map(recipient => recipient.id))
    if (current.role !== params.role || recipientIds.some(id => !eligibleIds.has(id))) {
        return { sentUserIds: [], error: '审核状态或通知对象已更新，请重新选择。' }
    }
    const recipients = await prisma.user.findMany({
        where: { id: { in: recipientIds }, roles: { has: params.role }, feishuOpenId: { not: null } },
        select: { id: true, name: true, feishuOpenId: true }
    })
    if (recipients.length !== recipientIds.length || recipients.some(recipient => !recipient.feishuOpenId)) {
        return { sentUserIds: [], error: '通知对象已更新，请重新选择。' }
    }

    const { previewUrl, approvalUrl } = getStudioReviewUrls(params.entityType, params.entityId, entity.slug)
    const result = await sendApprovalNotification({
        entityId: params.entityId,
        entityType: params.entityType,
        title: entity.titleDraftZH || entity.titleDraftEN || `Entity #${params.entityId}`,
        previewUrl,
        approvalUrl,
        requestedBy: user.name
    }, recipients)
    return {
        sentUserIds: result.sentUserIds,
        error: result.sentUserIds.length === recipientIds.length
            ? null
            : `已发送 ${result.sentUserIds.length} 条通知，${recipientIds.length - result.sentUserIds.length} 条发送失败，请重试。`
    }
}

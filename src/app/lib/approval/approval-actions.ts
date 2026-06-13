'use server'

import { EntityType, Role } from '@/generated/prisma/client'
import { requireUserWithRole } from '@/app/login/login-actions'
import { prisma } from '@/app/lib/prisma'
import { sendApprovalNotification, sendApprovalProgressNotification } from '@/app/lib/feishu-approval'

export type ApprovalThresholds = {
    [Role.editor]?: number
    [Role.admin]?: number
}

function getStudioReviewUrls(entityType: EntityType, entityId: number) {
    const baseUrl = process.env.HOST || 'http://localhost:3000'
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
    const existing = await prisma.approval.findUnique({
        where: { entityType_entityId_role_userId: { entityType, entityId, role, userId: user.id } }
    })
    await prisma.approval.upsert({
        where: { entityType_entityId_role_userId: { entityType, entityId, role, userId: user.id } },
        create: { entityType, entityId, role, userId: user.id },
        update: {}
    })
    if (existing) {
        return
    }

    const entity = await prisma.contentEntity.findUnique({
        where: { id: entityId },
        select: { titleDraftEN: true, titleDraftZH: true }
    })
    const approvalState = await meetsThresholds({ entityType, entityId })
    const { previewUrl, approvalUrl } = getStudioReviewUrls(entityType, entityId)

    await sendApprovalProgressNotification({
        entityId,
        entityType,
        title: entity?.titleDraftEN || entity?.titleDraftZH || `Entity #${entityId}`,
        previewUrl,
        approvalUrl,
        actionBy: user.name,
        approvedRole: role,
        statusText: `${user.name} 已通过${role === Role.editor ? '编辑员' : '管理员'}审核。`,
        editorCount: approvalState.counts[Role.editor] ?? 0,
        editorThreshold: approvalState.thresholds[Role.editor] ?? 1,
        adminCount: approvalState.counts[Role.admin] ?? 0,
        adminThreshold: approvalState.thresholds[Role.admin] ?? 1
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
        admin: 0, editor: 1, writer: 2
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

export async function requestContentReview(params: {
    entityType: EntityType
    entityId: number
}) {
    const user = await requireUserWithRole(Role.writer)
    const entity = await prisma.contentEntity.findUnique({
        where: { id: params.entityId },
        select: { titleDraftEN: true, titleDraftZH: true }
    })
    if (!entity) {
        throw new Error('Content entity not found')
    }

    await prisma.approval.deleteMany({
        where: { entityType: params.entityType, entityId: params.entityId }
    })

    const { previewUrl, approvalUrl } = getStudioReviewUrls(params.entityType, params.entityId)
    await sendApprovalNotification({
        entityId: params.entityId,
        entityType: params.entityType,
        title: entity.titleDraftEN || entity.titleDraftZH || `Entity #${params.entityId}`,
        previewUrl,
        approvalUrl,
        requestedBy: user.name
    })
}

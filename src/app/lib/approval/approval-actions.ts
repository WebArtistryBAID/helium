'use server'

import type { ApprovalThresholds, ApprovalNotificationRecipients } from '@/app/lib/services/approvals'

export type { ApprovalThresholds, ApprovalNotificationRecipients } from '@/app/lib/services/approvals'

import { EntityType, Role } from '@/generated/prisma/client'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/approvals'

export async function addApproval(params: {
    entityType: EntityType
    entityId: number,
    role: Role
}) {
    return services.addApproval(await getStudioActor(), params)
}

export async function removeAllApprovals(params: {
    entityType: EntityType
    entityId: number
}) {
    return services.removeAllApprovals(await getStudioActor(), params)
}

export async function getApprovalCounts(entityType: EntityType, entityId: number) {
    return services.getApprovalCounts(await getStudioActor(), entityType, entityId)
}

export async function getApprovalNames(entityType: EntityType, entityId: number) {
    return services.getApprovalNames(await getStudioActor(), entityType, entityId)
}

export async function getThresholds(entityType: EntityType) {
    return services.getThresholds(await getStudioActor(), entityType)
}

export async function meetsThresholds(params: {
    entityType: EntityType
    entityId: number
}) {
    return services.meetsThresholds(await getStudioActor(), params)
}

export async function getApprovalNotificationRecipients(params: {
    entityType: EntityType
    entityId: number
}): Promise<ApprovalNotificationRecipients> {
    return services.getApprovalNotificationRecipients(await getStudioActor(), params)
}

export async function requestContentReview(params: {
    entityType: EntityType
    entityId: number
    role: typeof Role.editor | typeof Role.admin
    recipientIds: number[]
}): Promise<{ sentUserIds: number[]; error: string | null }> {
    return services.requestContentReview(await getStudioActor(), params)
}

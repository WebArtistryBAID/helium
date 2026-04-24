'use server'

import crypto from 'crypto'
import { EntityType } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'

const FRESH_MS = 90_000
const SKEW_MS = 15_000

export async function acquireLock(params: {
    entityType: EntityType
    entityId: number
    userId: number
    currentToken?: string // for renewal
}) {
    const { entityType, entityId, userId, currentToken } = params
    const now = new Date()
    const existing = await prisma.entityLock.findUnique({ where: { entityType_entityId: { entityType, entityId } } })

    // Renewal path
    if (existing && currentToken && existing.token === currentToken) {
        const updated = await prisma.entityLock.update({
            where: { entityType_entityId: { entityType, entityId } },
            data: { lockedAt: now, lockedBy: userId, token: currentToken }
        })
        return { token: updated.token, lockedAt: updated.lockedAt }
    }

    // If the same user re-opens the editor without carrying the token forward,
    // keep the edit session instead of forcing a misleading "someone else" prompt.
    if (existing && existing.lockedBy === userId) {
        const token = currentToken ?? existing.token
        const updated = await prisma.entityLock.update({
            where: { entityType_entityId: { entityType, entityId } },
            data: { lockedAt: now, lockedBy: userId, token }
        })
        return { token: updated.token, lockedAt: updated.lockedAt }
    }

    // Expired or no lock -> take it
    if (!existing || now.getTime() - existing.lockedAt.getTime() > FRESH_MS) {
        const token = crypto.randomBytes(16).toString('hex')
        const upserted = await prisma.entityLock.upsert({
            where: { entityType_entityId: { entityType, entityId } },
            update: { lockedAt: now, lockedBy: userId, token },
            create: { entityType, entityId, lockedBy: userId, lockedAt: now, token }
        })
        return { token: upserted.token, lockedAt: upserted.lockedAt }
    }

    // Fresh lock held by someone else
    return null
}

export async function overrideLock(params: {
    entityType: EntityType, entityId: number, userId: number
}) {
    const token = crypto.randomBytes(16).toString('hex')
    const now = new Date()
    const updated = await prisma.entityLock.upsert({
        where: { entityType_entityId: { entityType: params.entityType, entityId: params.entityId } },
        update: { lockedAt: now, lockedBy: params.userId, token },
        create: {
            entityType: params.entityType,
            entityId: params.entityId,
            lockedBy: params.userId,
            lockedAt: now,
            token
        }
    })
    return { token: updated.token, lockedAt: updated.lockedAt }
}

export async function releaseLock(params: {
    entityType: EntityType, entityId: number, userId: number, token: string
}) {
    const row = await prisma.entityLock.findUnique({
        where: {
            entityType_entityId: {
                entityType: params.entityType,
                entityId: params.entityId
            }
        }
    })
    if (!row) return
    if (row.lockedBy !== params.userId) return
    if (row.token !== params.token) return
    const delta = Math.abs(Date.now() - row.lockedAt.getTime())
    if (delta > SKEW_MS) return
    await prisma.entityLock.delete({
        where: {
            entityType_entityId: {
                entityType: params.entityType,
                entityId: params.entityId
            }
        }
    })
}

export async function isLocked(entityType: EntityType, entityId: number) {
    const row = await prisma.entityLock.findUnique({ where: { entityType_entityId: { entityType, entityId } } })
    if (!row) return false
    return Date.now() - row.lockedAt.getTime() <= FRESH_MS
}

export async function isLockAlive(params: { entityType: EntityType, entityId: number, userId: number }) {
    const row = await prisma.entityLock.findUnique({
        where: {
            entityType_entityId: {
                entityType: params.entityType,
                entityId: params.entityId
            }
        }
    })
    if (!row) return false
    if (Date.now() - row.lockedAt.getTime() > FRESH_MS) return false
    // Your lock is alive if it's fresh and belongs to you
    return row.lockedBy === params.userId
}

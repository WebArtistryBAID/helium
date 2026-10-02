import 'server-only'

import type { OperationActor } from '@/app/lib/mcp/contracts'
import { requireActorUser } from '@/app/lib/services/actor'

import crypto from 'crypto'
import { EntityType, Role } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'


const LOCK_TTL_MS = 90_000

export type EntityLockParams = {
    entityType: EntityType
    entityId: number
}

export type SessionLockParams = EntityLockParams & {
    token: string
}

function isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

export async function acquireLock(actor: OperationActor, params: EntityLockParams & { currentToken?: string }) {
    const user = await requireActorUser(actor, Role.writer)
    const now = new Date()

    if (params.currentToken) {
        const renewed = await prisma.entityLock.updateMany({
            where: {
                entityType: params.entityType,
                entityId: params.entityId,
                lockedBy: user.id,
                token: params.currentToken
            },
            data: { lockedAt: now }
        })
        if (renewed.count === 1) {
            return { token: params.currentToken }
        }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const reclaimed = await prisma.entityLock.updateMany({
        where: {
            entityType: params.entityType,
            entityId: params.entityId,
            lockedAt: { lt: new Date(now.getTime() - LOCK_TTL_MS) }
        },
        data: {
            lockedBy: user.id,
            lockedAt: now,
            token
        }
    })
    if (reclaimed.count === 1) {
        return { token }
    }

    try {
        await prisma.entityLock.create({
            data: {
                entityType: params.entityType,
                entityId: params.entityId,
                lockedBy: user.id,
                lockedAt: now,
                token
            }
        })
        return { token }
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return null
        }
        throw error
    }
}

export async function renewLock(actor: OperationActor, params: SessionLockParams) {
    const user = await requireActorUser(actor, Role.writer)
    const renewed = await prisma.entityLock.updateMany({
        where: {
            entityType: params.entityType,
            entityId: params.entityId,
            lockedBy: user.id,
            token: params.token
        },
        data: { lockedAt: new Date() }
    })
    return renewed.count === 1
}

export async function overrideLock(actor: OperationActor, params: EntityLockParams) {
    const user = await requireActorUser(actor, Role.writer)
    const token = crypto.randomBytes(32).toString('hex')

    await prisma.entityLock.upsert({
        where: {
            entityType_entityId: {
                entityType: params.entityType,
                entityId: params.entityId
            }
        },
        update: {
            lockedBy: user.id,
            lockedAt: new Date(),
            token
        },
        create: {
            entityType: params.entityType,
            entityId: params.entityId,
            lockedBy: user.id,
            lockedAt: new Date(),
            token
        }
    })

    return { token }
}

export async function releaseLock(actor: OperationActor, params: SessionLockParams) {
    const user = await requireActorUser(actor, Role.writer)
    await prisma.entityLock.deleteMany({
        where: {
            entityType: params.entityType,
            entityId: params.entityId,
            lockedBy: user.id,
            token: params.token
        }
    })
}

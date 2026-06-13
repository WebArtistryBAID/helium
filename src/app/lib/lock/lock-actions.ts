'use server'

import crypto from 'crypto'
import { EntityType } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/login/login-actions'

const LOCK_TTL_MS = 90_000

type EntityLockParams = {
    entityType: EntityType
    entityId: number
}

type SessionLockParams = EntityLockParams & {
    token: string
}

function isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

export async function acquireLock(params: EntityLockParams & { currentToken?: string }) {
    const user = await requireUser()
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

export async function renewLock(params: SessionLockParams) {
    const user = await requireUser()
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

export async function overrideLock(params: EntityLockParams) {
    const user = await requireUser()
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

export async function releaseLock(params: SessionLockParams) {
    const user = await requireUser()
    await prisma.entityLock.deleteMany({
        where: {
            entityType: params.entityType,
            entityId: params.entityId,
            lockedBy: user.id,
            token: params.token
        }
    })
}

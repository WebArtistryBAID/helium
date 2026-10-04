import 'server-only'

import { prisma } from '@/app/lib/prisma'
import { requireActorUser } from '@/app/lib/services/actor'
import { Role } from '@/generated/prisma/client'
import { generateTokenSecret, hashTokenSecret, isTokenSecret } from '@/app/lib/mcp/token-secret'
import {
    createPersonalTokenSchema,
    revokePersonalTokenSchema,
    type CreatedPersonalToken,
    type OperationActor,
    type PersonalTokenSummary
} from '@/app/lib/mcp/contracts'

const SUMMARY_SELECT = {
    id: true, name: true, prefix: true, createdAt: true,
    expiresAt: true, lastUsedAt: true, revokedAt: true
} as const

function summary(record: {
    id: string; name: string; prefix: string; createdAt: Date;
    expiresAt: Date | null; lastUsedAt: Date | null; revokedAt: Date | null
}): PersonalTokenSummary {
    return {
        id: record.id, name: record.name, prefix: record.prefix, createdAt: record.createdAt.toISOString(),
        expiresAt: record.expiresAt?.toISOString() ?? null,
        lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
        revokedAt: record.revokedAt?.toISOString() ?? null
    }
}

async function settingsUser(actor: OperationActor) {
    if (actor.source !== 'studio') throw new Error('Personal tokens require Studio settings')
    return requireActorUser(actor, Role.writer)
}

export async function listPersonalTokens(actor: OperationActor): Promise<PersonalTokenSummary[]> {
    const user = await settingsUser(actor)
    const rows = await prisma.personalToken.findMany({
        where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: SUMMARY_SELECT
    })
    return rows.map(summary)
}

export async function createPersonalToken(actor: OperationActor, input: unknown): Promise<CreatedPersonalToken> {
    const user = await settingsUser(actor)
    const data = createPersonalTokenSchema.parse(input)
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
    if (expiresAt && expiresAt <= new Date()) throw new Error('Expiration must be in the future')
    const { token, tokenHash, prefix } = generateTokenSecret()
    const record = await prisma.personalToken.create({
        data: { userId: user.id, name: data.name, tokenHash, prefix, expiresAt },
        select: SUMMARY_SELECT
    })
    return { token, summary: summary(record) }
}

export async function revokePersonalToken(actor: OperationActor, input: unknown): Promise<void> {
    const user = await settingsUser(actor)
    const { tokenId } = revokePersonalTokenSchema.parse(input)
    const result = await prisma.personalToken.updateMany({
        where: { id: tokenId, userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() }
    })
    if (result.count === 0) {
        const ownToken = await prisma.personalToken.findFirst({
            where: { id: tokenId, userId: user.id },
            select: { id: true }
        })
        if (!ownToken) throw new Error('Personal token not found')
    }
}

export async function authenticatePersonalToken(token: string): Promise<OperationActor | null> {
    if (!isTokenSecret(token)) return null
    const now = new Date()
    const record = await prisma.personalToken.findUnique({
        where: { tokenHash: hashTokenSecret(token) },
        select: {
            id: true, userId: true, revokedAt: true, expiresAt: true,
            user: { select: { roles: true } }
        }
    })
    if (!record || record.revokedAt || (record.expiresAt && record.expiresAt <= now)) return null
    // This predicate also fences a revocation concurrent with the lookup.
    const active = await prisma.personalToken.updateMany({
        where: { id: record.id, revokedAt: null, OR: [ { expiresAt: null }, { expiresAt: { gt: now } } ] },
        data: { lastUsedAt: now }
    })
    if (active.count !== 1) return null
    return { userId: record.userId, roles: record.user.roles, source: 'mcp', tokenId: record.id }
}

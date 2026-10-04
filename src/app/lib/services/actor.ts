import 'server-only'

import type { Role } from '@/generated/prisma/client'
import type { OperationActor } from '@/app/lib/mcp/contracts'
import { prisma } from '@/app/lib/prisma'

/** The authenticated transport supplies identity; the database supplies current roles. */
export async function requireActorUser(actor: OperationActor, role?: Role) {
    if (!Number.isSafeInteger(actor.userId) || actor.userId <= 0) {
        throw new Error('Unauthorized')
    }
    const user = await prisma.user.findUnique({ where: { id: actor.userId } })
    if (!user || (role != null && !user.roles.includes(role))) {
        throw new Error('Unauthorized')
    }
    return user
}

'use server'

import { Role, User } from '@/generated/prisma/client'
import * as userServices from '@/app/lib/services/users'
import type { UserFilters } from '@/app/lib/services/users'
import type { OperationActor } from '@/app/lib/mcp/contracts'

export type { UserFilters } from '@/app/lib/services/users'
import { me } from '@/app/login/login'
import { Paginated, SimplifiedUser } from '@/app/lib/data-types'
import { prisma } from '@/app/lib/prisma'

export async function getLoginTarget(redirect: string): Promise<string> {
    // We are really abusing state here... But it works.
    return `${process.env.ONELOGIN_HOST}/oauth2/authorize?client_id=${process.env.ONELOGIN_CLIENT_ID}&redirect_uri=${process.env.HOST}/login/authorize&scope=basic+phone&response_type=code&state=${encodeURIComponent(redirect)}`
}

export async function requireUser(): Promise<User> {
    const user = await getMyUser()
    if (!user) {
        throw new Error('Unauthorized')
    }
    return user
}

export async function requireUserWithRole(role: Role): Promise<User> {
    const user = await requireUser()
    if (!user.roles.includes(role)) {
        throw new Error('Unauthorized')
    }
    return user
}

export async function getMyUser(): Promise<User | null> {
    return prisma.user.findUnique({
        where: { id: await me() ?? -1 }
    })
}

async function studioActor(): Promise<OperationActor> {
    const user = await requireUser()
    return { userId: user.id, roles: user.roles, source: 'studio' }
}

export async function getSimplifiedUser(id: number): Promise<SimplifiedUser | null> {
    return userServices.getSimplifiedUser(await studioActor(), id)
}

export async function getUser(id: number): Promise<User | null> {
    return userServices.getUser(await studioActor(), id)
}

export async function getUsers(page: number, filters: UserFilters = {}): Promise<Paginated<User>> {
    return userServices.getUsers(await studioActor(), page, filters)
}

export async function updateUserRoles(id: number, roles: Role[]): Promise<User> {
    return userServices.updateUserRoles(await studioActor(), id, roles)
}

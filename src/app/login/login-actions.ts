'use server'

import { Role, User } from '@/generated/prisma/client'
import { me } from '@/app/login/login'
import { Paginated, SIMPLIFIED_USER_SELECT, SimplifiedUser } from '@/app/lib/data-types'
import { prisma } from '@/app/lib/prisma'

export async function getLoginTarget(redirect: string): Promise<string> {
    // We are really abusing state here... But it works.
    return `${process.env.ONELOGIN_HOST}/oauth2/authorize?client_id=${process.env.ONELOGIN_CLIENT_ID}&redirect_uri=${process.env.HOST}/login/authorize&scope=basic+phone&response_type=code&state=${redirect}`
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

export async function getSimplifiedUser(id: number): Promise<SimplifiedUser | null> {
    await requireUser()
    return prisma.user.findUnique({
        where: { id },
        select: SIMPLIFIED_USER_SELECT
    })
}

export async function getUser(id: number): Promise<User | null> {
    await requireUserWithRole(Role.admin)
    return prisma.user.findUnique({
        where: { id }
    })
}

export async function getUsers(page: number, keyword: string | undefined = undefined): Promise<Paginated<User>> {
    await requireUserWithRole(Role.admin)
    const pages = Math.ceil(await prisma.user.count({
        where: keyword != null ? {
            OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { pinyin: { contains: keyword, mode: 'insensitive' } }
            ]
        } : undefined
    }) / 10)
    const users = await prisma.user.findMany({
        where: keyword != null ? {
            OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { pinyin: { contains: keyword, mode: 'insensitive' } }
            ]
        } : undefined,
        orderBy: {
            pinyin: 'asc'
        },
        skip: page * 10,
        take: 10
    })
    return {
        items: users,
        page,
        pages
    }
}

export async function updateUserRoles(id: number, roles: Role[]): Promise<User> {
    await requireUserWithRole(Role.admin)
    return prisma.user.update({
        where: { id },
        data: {
            roles
        }
    })
}

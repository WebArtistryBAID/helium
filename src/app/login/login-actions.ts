'use server'

import { Gender, Prisma, Role, User, UserType } from '@/generated/prisma/client'
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

export type UserFilters = {
    keyword?: string
    role?: Role | 'all'
    type?: UserType | 'all'
    gender?: Gender | 'all'
    feishu?: 'all' | 'linked' | 'unlinked'
}

function buildUserWhere(filters: UserFilters = {}): Prisma.UserWhereInput {
    const keyword = filters.keyword?.trim()
    const clauses: Prisma.UserWhereInput[] = []

    if (keyword) {
        const keywordClauses: Prisma.UserWhereInput[] = [
            { name: { contains: keyword, mode: 'insensitive' } },
            { pinyin: { contains: keyword, mode: 'insensitive' } },
            { phone: { contains: keyword, mode: 'insensitive' } }
        ]

        if (/^\d+$/.test(keyword)) {
            keywordClauses.push({ id: Number(keyword) })
        }

        clauses.push({ OR: keywordClauses })
    }

    if (filters.role && filters.role !== 'all') {
        clauses.push({ roles: { has: filters.role } })
    }

    if (filters.type && filters.type !== 'all') {
        clauses.push({ type: filters.type })
    }

    if (filters.gender && filters.gender !== 'all') {
        clauses.push({ gender: filters.gender })
    }

    if (filters.feishu === 'linked') {
        clauses.push({ feishuOpenId: { not: null } })
    } else if (filters.feishu === 'unlinked') {
        clauses.push({ feishuOpenId: null })
    }

    return clauses.length > 0 ? { AND: clauses } : {}
}

export async function getUsers(page: number, filters: UserFilters = {}): Promise<Paginated<User>> {
    await requireUserWithRole(Role.admin)
    const where = buildUserWhere(filters)
    const pageSize = 20
    const pages = Math.ceil(await prisma.user.count({ where }) / pageSize)
    const users = await prisma.user.findMany({
        where,
        orderBy: [
            { pinyin: 'asc' },
            { name: 'asc' }
        ],
        skip: page * pageSize,
        take: pageSize
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

import 'server-only'

import type { OperationActor } from '@/app/lib/mcp/contracts'
import { requireActorUser } from '@/app/lib/services/actor'
import { Gender, Prisma, Role, User, UserType } from '@/generated/prisma/client'
import { Paginated, SIMPLIFIED_USER_SELECT, SimplifiedUser } from '@/app/lib/data-types'
import { prisma } from '@/app/lib/prisma'

export async function getSimplifiedUser(actor: OperationActor, id: number): Promise<SimplifiedUser | null> {
    await requireActorUser(actor, Role.writer)
    return prisma.user.findUnique({
        where: { id },
        select: SIMPLIFIED_USER_SELECT
    })
}

export async function getUser(actor: OperationActor, id: number): Promise<User | null> {
    await requireActorUser(actor, Role.admin)
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

export async function getUsers(actor: OperationActor, page: number, filters: UserFilters = {}): Promise<Paginated<User>> {
    await requireActorUser(actor, Role.admin)
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

export async function updateUserRoles(actor: OperationActor, id: number, roles: Role[]): Promise<User> {
    await requireActorUser(actor, Role.admin)
    return prisma.user.update({
        where: { id },
        data: {
            roles
        }
    })
}

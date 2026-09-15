'use server'

import { CommentAnchorType, ContentLanguage, EntityType, Role } from '@/generated/prisma/client'
import { requireUser, requireUserWithRole } from '@/app/login/login-actions'
import { prisma } from '@/app/lib/prisma'
import { collectPuckComponentIds } from '@/app/lib/puck/puck-component-ids'
import type { PuckComment, PuckCommentThread } from '@/app/lib/puck/puck-comment-types'

const COMMENT_AUTHOR_SELECT = {
    id: true,
    name: true
} as const

const COMMENT_INCLUDE = {
    author: { select: COMMENT_AUTHOR_SELECT }
} as const

const THREAD_INCLUDE = {
    comments: {
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: 'asc' as const }
    }
} as const

function normalizedBody(body: string): string {
    const value = body.trim()
    if (value.length === 0) throw new Error('Comment cannot be empty')
    if (value.length > 10_000) throw new Error('Comment is too long')
    return value
}

async function requirePage(entityId: number) {
    const entity = await prisma.contentEntity.findUnique({
        where: { id: entityId },
        select: { id: true, type: true, contentDraftEN: true, contentDraftZH: true }
    })
    if (entity == null || entity.type !== EntityType.page) throw new Error('Page not found')
    return entity
}

export async function getPuckCommentThreads(entityId: number): Promise<PuckCommentThread[]> {
    await requireUser()
    await requirePage(entityId)
    return prisma.commentThread.findMany({
        where: {
            entityId,
            anchorType: CommentAnchorType.component
        },
        include: THREAD_INCLUDE,
        orderBy: { createdAt: 'asc' }
    })
}

export async function createPuckCommentThread(input: {
    entityId: number
    language: ContentLanguage
    componentId: string
    body: string
}): Promise<PuckCommentThread> {
    const user = await requireUserWithRole(Role.writer)
    const entity = await requirePage(input.entityId)
    const content = input.language === ContentLanguage.en ? entity.contentDraftEN : entity.contentDraftZH
    const componentIds = collectPuckComponentIds(JSON.parse(content))
    if (!componentIds.has(input.componentId)) throw new Error('Component not found')

    return prisma.commentThread.create({
        data: {
            entityId: input.entityId,
            language: input.language,
            anchorType: CommentAnchorType.component,
            componentId: input.componentId,
            createdById: user.id,
            comments: {
                create: {
                    authorId: user.id,
                    body: normalizedBody(input.body)
                }
            }
        },
        include: THREAD_INCLUDE
    })
}

export async function replyToPuckCommentThread(input: {
    threadId: string
    body: string
}): Promise<PuckComment> {
    const user = await requireUserWithRole(Role.writer)
    const thread = await prisma.commentThread.findUnique({
        where: { id: input.threadId },
        include: {
            entity: { select: { type: true } },
            comments: {
                where: { parentId: null },
                select: { id: true },
                orderBy: { createdAt: 'asc' },
                take: 1
            }
        }
    })
    if (thread == null || thread.entity.type !== EntityType.page) throw new Error('Comment thread not found')

    return prisma.comment.create({
        data: {
            threadId: thread.id,
            authorId: user.id,
            parentId: thread.comments[0]?.id ?? null,
            body: normalizedBody(input.body)
        },
        include: COMMENT_INCLUDE
    })
}

export async function setPuckCommentThreadResolved(input: {
    threadId: string
    resolved: boolean
}): Promise<PuckCommentThread> {
    const user = await requireUserWithRole(Role.writer)
    const thread = await prisma.commentThread.findUnique({
        where: { id: input.threadId },
        include: { entity: { select: { type: true } } }
    })
    if (thread == null || thread.entity.type !== EntityType.page) throw new Error('Comment thread not found')

    return prisma.commentThread.update({
        where: { id: thread.id },
        data: input.resolved
            ? { resolvedAt: new Date(), resolvedById: user.id }
            : { resolvedAt: null, resolvedById: null },
        include: THREAD_INCLUDE
    })
}

export async function deletePuckComponentCommentThreads(input: {
    entityId: number
    language: ContentLanguage
    componentIds: string[]
}): Promise<number> {
    await requireUserWithRole(Role.writer)
    await requirePage(input.entityId)
    if (input.componentIds.length === 0) return 0

    const deleted = await prisma.commentThread.deleteMany({
        where: {
            entityId: input.entityId,
            language: input.language,
            anchorType: CommentAnchorType.component,
            componentId: { in: input.componentIds }
        }
    })
    return deleted.count
}

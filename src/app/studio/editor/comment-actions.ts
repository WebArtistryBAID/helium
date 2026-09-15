'use server'

import { CommentAnchorType, ContentLanguage, EntityType, Role } from '@/generated/prisma/client'
import { requireUser, requireUserWithRole } from '@/app/login/login-actions'
import { prisma } from '@/app/lib/prisma'
import type { PuckComment, PuckCommentThread } from '@/app/lib/puck/puck-comment-types'

const COMMENT_INCLUDE = {
    author: { select: { id: true, name: true } }
} as const

const THREAD_INCLUDE = {
    comments: {
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: 'asc' as const }
    }
} as const

function normalizeBody(body: string): string {
    const value = body.trim()
    if (value.length === 0) throw new Error('Comment cannot be empty')
    if (value.length > 10_000) throw new Error('Comment is too long')
    return value
}

async function requirePlateEntity(entityId: number) {
    const entity = await prisma.contentEntity.findUnique({
        where: { id: entityId },
        select: { id: true, type: true }
    })
    if (entity == null || entity.type === EntityType.page) throw new Error('Content entity not found')
    return entity
}

export async function getPlateCommentThreads(entityId: number): Promise<PuckCommentThread[]> {
    await requireUser()
    await requirePlateEntity(entityId)
    return prisma.commentThread.findMany({
        where: { entityId, anchorType: CommentAnchorType.text },
        include: THREAD_INCLUDE,
        orderBy: { createdAt: 'asc' }
    })
}

export async function createPlateCommentThread(input: {
    entityId: number
    language: ContentLanguage
    quotedText: string
    body: string
}): Promise<PuckCommentThread> {
    const user = await requireUserWithRole(Role.writer)
    await requirePlateEntity(input.entityId)
    const quotedText = input.quotedText.trim()
    if (quotedText.length === 0) throw new Error('Comment selection cannot be empty')

    return prisma.commentThread.create({
        data: {
            entityId: input.entityId,
            language: input.language,
            anchorType: CommentAnchorType.text,
            quotedText,
            createdById: user.id,
            comments: { create: { authorId: user.id, body: normalizeBody(input.body) } }
        },
        include: THREAD_INCLUDE
    })
}

export async function replyToPlateCommentThread(input: {
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
    if (thread == null || thread.anchorType !== CommentAnchorType.text || thread.entity.type === EntityType.page) {
        throw new Error('Comment thread not found')
    }

    return prisma.comment.create({
        data: {
            threadId: thread.id,
            authorId: user.id,
            parentId: thread.comments[0]?.id ?? null,
            body: normalizeBody(input.body)
        },
        include: COMMENT_INCLUDE
    })
}

export async function setPlateCommentThreadResolved(input: {
    threadId: string
    resolved: boolean
}): Promise<PuckCommentThread> {
    const user = await requireUserWithRole(Role.writer)
    const thread = await prisma.commentThread.findUnique({
        where: { id: input.threadId },
        include: { entity: { select: { type: true } } }
    })
    if (thread == null || thread.anchorType !== CommentAnchorType.text || thread.entity.type === EntityType.page) {
        throw new Error('Comment thread not found')
    }

    return prisma.commentThread.update({
        where: { id: thread.id },
        data: input.resolved
            ? { resolvedAt: new Date(), resolvedById: user.id }
            : { resolvedAt: null, resolvedById: null },
        include: THREAD_INCLUDE
    })
}

export async function deletePlateCommentThread(threadId: string): Promise<void> {
    await requireUserWithRole(Role.admin)
    const thread = await prisma.commentThread.findUnique({
        where: { id: threadId },
        include: { entity: { select: { type: true } } }
    })
    if (thread == null || thread.anchorType !== CommentAnchorType.text || thread.entity.type === EntityType.page) {
        throw new Error('Comment thread not found')
    }

    await prisma.commentThread.delete({ where: { id: thread.id } })
}

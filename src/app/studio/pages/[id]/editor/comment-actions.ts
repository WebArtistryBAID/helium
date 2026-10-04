'use server'

import { ContentLanguage } from '@/generated/prisma/client'

import type { PuckComment, PuckCommentThread } from '@/app/lib/puck/puck-comment-types'
import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/puck-comments'

export async function getPuckCommentThreads(entityId: number): Promise<PuckCommentThread[]> {
    return services.getPuckCommentThreads(await getStudioActor(), entityId)
}

export async function createPuckCommentThread(input: {
    entityId: number
    language: ContentLanguage
    componentId: string
    body: string
}): Promise<PuckCommentThread> {
    return services.createPuckCommentThread(await getStudioActor(), input)
}

export async function replyToPuckCommentThread(input: {
    threadId: string
    body: string
}): Promise<PuckComment> {
    return services.replyToPuckCommentThread(await getStudioActor(), input)
}

export async function setPuckCommentThreadResolved(input: {
    threadId: string
    resolved: boolean
}): Promise<PuckCommentThread> {
    return services.setPuckCommentThreadResolved(await getStudioActor(), input)
}

export async function deletePuckCommentThread(threadId: string): Promise<void> {
    return services.deletePuckCommentThread(await getStudioActor(), threadId)
}

export async function deletePuckComponentCommentThreads(input: {
    entityId: number
    language: ContentLanguage
    componentIds: string[]
}): Promise<number> {
    return services.deletePuckComponentCommentThreads(await getStudioActor(), input)
}

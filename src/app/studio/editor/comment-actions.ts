'use server'

import { ContentLanguage } from '@/generated/prisma/client'

import type { PuckComment, PuckCommentThread } from '@/app/lib/puck/puck-comment-types'
import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/plate-comments'

export async function getPlateCommentThreads(entityId: number): Promise<PuckCommentThread[]> {
    return services.getPlateCommentThreads(await getStudioActor(), entityId)
}

export async function createPlateCommentThread(input: {
    entityId: number
    language: ContentLanguage
    quotedText: string
    body: string
}): Promise<PuckCommentThread> {
    return services.createPlateCommentThread(await getStudioActor(), input)
}

export async function replyToPlateCommentThread(input: {
    threadId: string
    body: string
}): Promise<PuckComment> {
    return services.replyToPlateCommentThread(await getStudioActor(), input)
}

export async function setPlateCommentThreadResolved(input: {
    threadId: string
    resolved: boolean
}): Promise<PuckCommentThread> {
    return services.setPlateCommentThreadResolved(await getStudioActor(), input)
}

export async function deletePlateCommentThread(threadId: string): Promise<void> {
    return services.deletePlateCommentThread(await getStudioActor(), threadId)
}

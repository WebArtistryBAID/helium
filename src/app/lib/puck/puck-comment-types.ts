import { CommentAnchorType, ContentLanguage } from '@/generated/prisma/browser'

export type PuckCommentAuthor = {
    id: number
    name: string
}

export type PuckComment = {
    id: string
    threadId: string
    authorId: number
    author: PuckCommentAuthor
    parentId: string | null
    body: string
    createdAt: Date | string
    updatedAt: Date | string
    deletedAt: Date | string | null
}

export type PuckCommentThread = {
    id: string
    entityId: number
    language: ContentLanguage
    anchorType: CommentAnchorType
    componentId: string | null
    createdById: number
    resolvedById: number | null
    resolvedAt: Date | string | null
    createdAt: Date | string
    updatedAt: Date | string
    comments: PuckComment[]
}


import 'server-only'

import { createHash } from 'node:crypto'
import { CommentAnchorType, EntityType, Role, UserAuditLogType, type Prisma } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireActorUser } from '@/app/lib/services/actor'
import { entityRevision } from '@/app/lib/mcp/entity-revision'
import { entityMutationSchema, type OperationActor } from '@/app/lib/mcp/contracts'
import { hasPlateSuggestions } from '@/app/lib/plate/plate-types'
import { AlignEntityResponse } from '@/app/studio/editor/entity-types'
import { getContentEntityURI } from '@/app/lib/data-types'
import { WEBSITE_METADATA_SLUG } from '@/app/lib/metadata/website-metadata-types'
import { sendPublicationNotification } from '@/app/lib/feishu/feishu-approval'

type PublishResult = {
    status: AlignEntityResponse | 'conflict' | 'idempotency_key_reused'
    revision?: string
    replayed?: boolean
}

export async function publishDraft(actor: OperationActor, entityId: number, input?: {
    expectedRevision: string; idempotencyKey: string
}): Promise<PublishResult> {
    const user = await requireActorUser(actor, Role.admin)
    if (actor.source === 'mcp' && !input) throw new Error('MCP publication requires a revision and idempotency key')
    const command = input ? entityMutationSchema.parse({ ...input, entityId }) : null
    const requestHash = command ? createHash('sha256').update(JSON.stringify(command)).digest('hex') : null
    let notification: Parameters<typeof sendPublicationNotification>[0] | undefined
    const result = await prisma.$transaction(async tx => {
        if (command) {
            // Serialize retries across processes before reading or writing a receipt.
            const key = `${user.id}:publish_entity:${command.idempotencyKey}`
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`
            const receipt = await tx.mcpOperationReceipt.findUnique({
                where: {
                    userId_operation_idempotencyKey: {
                        userId: user.id,
                        operation: 'publish_entity',
                        idempotencyKey: command.idempotencyKey
                    }
                }
            })
            if (receipt) {
                if (receipt.requestHash !== requestHash) return { status: 'idempotency_key_reused' } as PublishResult
                return { ...(receipt.result as unknown as PublishResult), replayed: true }
            }
        }
        await tx.$queryRaw`SELECT "id" FROM "ContentEntity" WHERE "id" = ${entityId} FOR UPDATE`
        const post = await tx.contentEntity.findUnique({ where: { id: entityId } })
        if (!post) return { status: AlignEntityResponse.notFound }
        const revision = entityRevision(post)
        if (command && command.expectedRevision !== revision) return { status: 'conflict', revision } as PublishResult
        const [ config, counts ] = await Promise.all([
            tx.approvalConfig.findUnique({ where: { entityType: post.type } }),
            tx.approval.groupBy({ by: [ 'role' ], where: { entityType: post.type, entityId }, _count: { role: true } })
        ])
        const count = (role: Role) => counts.find(row => row.role === role)?._count.role ?? 0
        if (count(Role.editor) < (config?.minEditor ?? 1) || count(Role.admin) < (config?.minAdmin ?? 1)) {
            return { status: AlignEntityResponse.insufficientApprovals }
        }
        if (post.type !== EntityType.page) {
            const unresolved = await tx.commentThread.count({
                where: { entityId, anchorType: CommentAnchorType.text, resolvedAt: null }
            })
            if (unresolved > 0 || hasPlateSuggestions(post.contentDraftEN) || hasPlateSuggestions(post.contentDraftZH)) {
                return { status: AlignEntityResponse.unresolvedFeedback }
            }
        }
        const updated = await tx.contentEntity.update({
            where: { id: entityId }, data: {
                titlePublishedEN: post.titleDraftEN, titlePublishedZH: post.titleDraftZH,
                contentPublishedEN: post.contentDraftEN, contentPublishedZH: post.contentDraftZH,
                shortContentPublishedEN: post.shortContentDraftEN, shortContentPublishedZH: post.shortContentDraftZH,
                coverImagePublishedId: post.coverImageDraftId, transparentNavbarPublished: post.transparentNavbarDraft
            }
        })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.adminPublishEntity,
                userId: user.id, values: [ post.id.toString(), post.titleDraftEN ]
            }
        })
        const published: PublishResult = { status: AlignEntityResponse.success, revision: entityRevision(updated) }
        if (command) await tx.mcpOperationReceipt.create({
            data: {
                userId: user.id, operation: 'publish_entity', idempotencyKey: command.idempotencyKey,
                requestHash: requestHash!, result: published as Prisma.InputJsonValue
            }
        })
        const livePath = post.slug === WEBSITE_METADATA_SLUG ? '/' : post.type === EntityType.page
            ? `/${post.slug.replace(/^\/+/, '')}` : getContentEntityURI(post.createdAt, post.slug)
        notification = {
            entityType: post.type, title: post.titleDraftZH || post.titleDraftEN,
            publishedBy: user.name, url: `${(process.env.HOST ?? '').replace(/\/+$/, '')}${livePath}`
        }
        return published
    })
    if (notification) {
        try {
            await sendPublicationNotification(notification)
        } catch (error) {
            console.error('Failed to send Feishu publication notification:', error)
        }
    }
    return result
}

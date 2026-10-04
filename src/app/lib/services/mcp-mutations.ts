import 'server-only'
import { createHash } from 'node:crypto'
import { Role, UserAuditLogType, type Prisma } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireActorUser } from '@/app/lib/services/actor'
import {
    entityMutationSchema,
    updateEntityFieldsSchema,
    createEntitySchema,
    type OperationActor
} from '@/app/lib/mcp/contracts'
import { entityRevision } from '@/app/lib/mcp/entity-revision'
import { WEBSITE_METADATA_SLUG } from '@/app/lib/metadata/website-metadata-types'

const createAutomaticSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 8).join('-')

export async function receiptedMutation(actor: OperationActor, operation: string, input: { idempotencyKey: string },
                                        run: (tx: Prisma.TransactionClient) => Promise<Record<string, unknown>>): Promise<Record<string, unknown>> {
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    return prisma.$transaction(async tx => {
        const key = `${actor.userId}:${operation}:${input.idempotencyKey}`
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`
        const where = {
            userId_operation_idempotencyKey: {
                userId: actor.userId,
                operation,
                idempotencyKey: input.idempotencyKey
            }
        }
        const receipt = await tx.mcpOperationReceipt.findUnique({ where })
        if (receipt) return receipt.requestHash === hash ? { ...(receipt.result as object), replayed: true }
            : {
                ok: false,
                error: { code: 'idempotency_key_reused', message: 'Use a new key for a different mutation.' }
            }
        const result = await run(tx)
        if (result.ok === true) await tx.mcpOperationReceipt.create({
            data: {
                userId: actor.userId, operation,
                idempotencyKey: input.idempotencyKey, requestHash: hash, result: JSON.parse(JSON.stringify(result))
            }
        })
        return result
    }, { timeout: 30_000 })
}

export async function patchEntityFields(actor: OperationActor, raw: unknown) {
    await requireActorUser(actor, Role.writer)
    const input = updateEntityFieldsSchema.parse(raw)
    return receiptedMutation(actor, 'update_entity_fields', input, async tx => {
        await tx.$queryRaw`SELECT "id" FROM "ContentEntity" WHERE "id" = ${input.entityId} FOR UPDATE`
        const entity = await tx.contentEntity.findUnique({ where: { id: input.entityId } })
        if (!entity) return { ok: false, error: { code: 'not_found', message: 'Content entity does not exist.' } }
        if (entity.slug === WEBSITE_METADATA_SLUG) return {
            ok: false,
            error: { code: 'invalid_input', message: 'Use the website metadata tool.' }
        }
        const conflicts = input.changes.filter(change => {
            const value = entity[change.field]
            return (value instanceof Date ? value.toISOString() : value) !== change.expected
        }).map(change => ({ target: change.field, current: entity[change.field] }))
        if (conflicts.length) return {
            ok: false,
            error: { code: 'conflict', message: 'Fetch the changed fields before editing.', conflicts }
        }
        if (entity.type === 'page' && input.changes.some(change => change.field.startsWith('titleDraft'))) {
            return {
                ok: false,
                error: { code: 'invalid_input', message: 'Edit Puck titles through the live root properties.' }
            }
        }
        if (input.changes.some(change => change.field === 'slug' && change.value === WEBSITE_METADATA_SLUG)) return {
            ok: false,
            error: { code: 'invalid_input', message: 'The website metadata slug is reserved.' }
        }
        const cover = input.changes.find(change => change.field === 'coverImageDraftId')
        if (cover?.value != null && !await tx.image.findUnique({ where: { id: Number(cover.value) } })) {
            return { ok: false, error: { code: 'not_found', message: 'Cover image does not exist.' } }
        }
        const data = Object.fromEntries(input.changes.map(change => [ change.field, change.value ]))
        const updated = await tx.contentEntity.update({ where: { id: entity.id }, data })
        await tx.approval.deleteMany({ where: { entityId: entity.id } })
        await tx.userAuditLog.create({
            data: {
                userId: actor.userId, type: UserAuditLogType.writerEditEntity,
                values: [ String(entity.id), 'mcp:fields', input.idempotencyKey ]
            }
        })
        return {
            ok: true, data: updated, revision: entityRevision(updated),
            affectedLiveFields: input.changes.filter(change => [ 'slug', 'categoryEN', 'categoryZH', 'createdAt' ].includes(change.field)).map(change => change.field)
        }
    })
}

export async function createMcpEntity(actor: OperationActor, raw: unknown) {
    await requireActorUser(actor, Role.writer)
    const input = createEntitySchema.parse(raw)
    return receiptedMutation(actor, 'create_entity', input, async tx => {
        const body = (title: string) => input.type === 'page' ? JSON.stringify({
                content: [],
                root: { props: { title } },
                zones: {}
            })
            : JSON.stringify([ { type: 'p', children: [ { text: '' } ] } ])
        const entity = await tx.contentEntity.create({
            data: {
                type: input.type, titleDraftEN: input.titleEN,
                titleDraftZH: input.titleZH, slug: createAutomaticSlug(input.titleEN), creatorId: actor.userId,
                contentDraftEN: body(input.titleEN), contentDraftZH: body(input.titleZH)
            }
        })
        await tx.userAuditLog.create({
            data: {
                userId: actor.userId, type: UserAuditLogType.writerCreateEntity,
                values: [ String(entity.id), entity.titleDraftEN ]
            }
        })
        return { ok: true, data: entity, revision: entityRevision(entity) }
    })
}

export async function mutateEntityLifecycle(actor: OperationActor, operation: 'delete_entity' | 'unpublish_entity' | 'restore_entity',
                                            raw: unknown): Promise<Record<string, unknown>> {
    await requireActorUser(actor, operation === 'restore_entity' ? Role.writer : Role.editor)
    const input = entityMutationSchema.parse(raw)
    return receiptedMutation(actor, operation, input, async tx => {
        await tx.$queryRaw`SELECT "id" FROM "ContentEntity" WHERE "id" = ${input.entityId} FOR UPDATE`
        const entity = await tx.contentEntity.findUnique({ where: { id: input.entityId } })
        if (!entity) return { ok: false, error: { code: 'not_found', message: 'Content entity does not exist.' } }
        if (entity.slug === WEBSITE_METADATA_SLUG && operation !== 'restore_entity') return {
            ok: false,
            error: { code: 'invalid_input', message: 'Website metadata is a permanent singleton.' }
        }
        if (entityRevision(entity) !== input.expectedRevision) return {
            ok: false,
            error: {
                code: 'conflict',
                message: 'Fetch the current entity revision.',
                currentRevision: entityRevision(entity)
            }
        }
        if (operation === 'delete_entity') {
            await tx.contentEntity.delete({ where: { id: entity.id } })
            await tx.userAuditLog.create({
                data: {
                    userId: actor.userId,
                    type: UserAuditLogType.deleteEntity,
                    values: [ String(entity.id), entity.titleDraftEN ]
                }
            })
            return { ok: true, data: { entityId: entity.id, deleted: true } }
        }
        if (operation === 'restore_entity' && [ entity.titlePublishedEN, entity.titlePublishedZH, entity.contentPublishedEN, entity.contentPublishedZH ].some(value => value == null)) {
            return {
                ok: false,
                error: { code: 'invalid_input', message: 'Restoration requires a complete published version.' }
            }
        }
        const epochs = operation === 'restore_entity' ? await tx.$queryRaw<{
            generation: number
        }[]>`SELECT nextval('"CollaborationGenerationSequence"')::integer AS generation` : []
        const data = operation === 'unpublish_entity' ? {
            titlePublishedEN: null,
            titlePublishedZH: null,
            contentPublishedEN: null,
            contentPublishedZH: null,
            shortContentPublishedEN: null,
            shortContentPublishedZH: null,
            coverImagePublishedId: null,
            transparentNavbarPublished: null
        } : {
            titleDraftEN: entity.titlePublishedEN ?? entity.titleDraftEN,
            titleDraftZH: entity.titlePublishedZH ?? entity.titleDraftZH,
            contentDraftEN: entity.contentPublishedEN ?? entity.contentDraftEN,
            contentDraftZH: entity.contentPublishedZH ?? entity.contentDraftZH,
            shortContentDraftEN: entity.shortContentPublishedEN,
            shortContentDraftZH: entity.shortContentPublishedZH,
            coverImageDraftId: entity.coverImagePublishedId,
            transparentNavbarDraft: entity.transparentNavbarPublished ?? false,
            collaborationGeneration: epochs[0].generation
        }
        const updated = await tx.contentEntity.update({ where: { id: entity.id }, data })
        if (operation === 'restore_entity') {
            await tx.yjsDocument.deleteMany({ where: { entityId: entity.id } })
            await tx.approval.deleteMany({ where: { entityId: entity.id } })
        }
        await tx.userAuditLog.create({
            data: {
                userId: actor.userId,
                type: operation === 'unpublish_entity' ? UserAuditLogType.unpublishEntity : UserAuditLogType.writerEditEntity,
                values: [ String(entity.id), operation, input.idempotencyKey ]
            }
        })
        return { ok: true, data: updated, revision: entityRevision(updated) }
    })
}

import { z } from 'zod'
import { EntityType, Role } from '@/generated/prisma/client'

// Transport-independent contracts. Services resolve the actor from trusted credentials.
export type OperationActor = {
    userId: number
    roles: Role[]
    source: 'studio' | 'mcp'
    tokenId?: string
}

export const entityIdSchema = z.number().int().positive()
export const languageSchema = z.enum([ 'en', 'zh' ])
export const revisionSchema = z.string().min(1).max(200)
export const mutationSchema = z.object({
    idempotencyKey: z.string().min(1).max(128)
}).strict()
export const entityMutationSchema = mutationSchema.extend({
    entityId: entityIdSchema,
    expectedRevision: revisionSchema
})

const fieldSchemas = {
    slug: z.string().min(1).max(500),
    categoryEN: z.string().max(500).nullable(),
    categoryZH: z.string().max(500).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    titleDraftEN: z.string().max(2000),
    titleDraftZH: z.string().max(2000),
    shortContentDraftEN: z.string().max(20000).nullable(),
    shortContentDraftZH: z.string().max(20000).nullable(),
    coverImageDraftId: entityIdSchema.nullable(),
    transparentNavbarDraft: z.boolean()
}

// Patches carry the previous value for every changed field.
function fieldChange<K extends keyof typeof fieldSchemas>(field: K) {
    const value = fieldSchemas[field]
    return z.object({
        field: z.literal(field), expected: value, value
    }).strict()
}

export const entityFieldChangeSchema = z.discriminatedUnion('field', [
    fieldChange('slug'),
    fieldChange('categoryEN'),
    fieldChange('categoryZH'),
    fieldChange('createdAt'),
    fieldChange('titleDraftEN'),
    fieldChange('titleDraftZH'),
    fieldChange('shortContentDraftEN'),
    fieldChange('shortContentDraftZH'),
    fieldChange('coverImageDraftId'),
    fieldChange('transparentNavbarDraft')
])
export const updateEntityFieldsSchema = mutationSchema.extend({
    entityId: entityIdSchema,
    changes: z.array(entityFieldChangeSchema).min(1).max(10)
}).superRefine(({ changes }, context) => {
    const fields = changes.map(change => change.field)
    if (new Set(fields).size !== fields.length) {
        context.addIssue({ code: 'custom', path: [ 'changes' ], message: 'Each field may appear once' })
    }
})
export const createEntitySchema = mutationSchema.extend({
    type: z.enum(EntityType),
    titleEN: fieldSchemas.titleDraftEN,
    titleZH: fieldSchemas.titleDraftZH
})
export const searchEntitiesSchema = z.object({
    type: z.enum(EntityType).optional(),
    query: z.string().max(200).optional(),
    page: z.number().int().nonnegative().default(0),
    state: z.enum([ 'all', 'published', 'unpublished' ]).default('all')
}).strict()

// Editor-specific services additionally validate node types and Puck component props.
const jsonSchema = z.json()
const targetSchema = z.string().min(1).max(200)
export const editorCommandSchema = z.discriminatedUnion('operation', [
    z.object({
        operation: z.literal('replace'), targetId: targetSchema,
        expected: jsonSchema, value: jsonSchema
    }).strict(),
    z.object({
        operation: z.literal('insert'), parentId: targetSchema.nullable(),
        beforeId: targetSchema.nullable(), expectedParentRevision: revisionSchema,
        value: jsonSchema
    }).strict(),
    z.object({
        operation: z.literal('remove'), targetId: targetSchema,
        expected: jsonSchema
    }).strict(),
    z.object({
        operation: z.literal('move'), targetId: targetSchema,
        expected: jsonSchema, parentId: targetSchema.nullable(),
        beforeId: targetSchema.nullable(), expectedParentRevision: revisionSchema
    }).strict(),
    z.object({
        operation: z.literal('set_property'), targetId: targetSchema,
        path: z.array(z.string().min(1)).min(1).max(20),
        expected: jsonSchema, value: jsonSchema
    }).strict()
])
export const editDocumentSchema = mutationSchema.extend({
    entityId: entityIdSchema,
    language: languageSchema,
    editor: z.enum([ 'plate', 'puck' ]),
    generation: z.number().int().nonnegative(),
    commands: z.array(editorCommandSchema).min(1).max(100)
})
export const replaceDocumentSchema = entityMutationSchema.extend({
    language: languageSchema,
    editor: z.enum([ 'plate', 'puck' ]),
    generation: z.number().int().nonnegative(),
    document: jsonSchema
})

export const createPersonalTokenSchema = z.object({
    name: z.string().trim().min(1).max(100),
    expiresAt: z.iso.datetime({ offset: true }).nullable()
}).strict()
export const revokePersonalTokenSchema = z.object({ tokenId: z.string().min(1) }).strict()
export type PersonalTokenSummary = {
    id: string
    name: string
    prefix: string
    createdAt: string
    expiresAt: string | null
    lastUsedAt: string | null
    revokedAt: string | null
}
// Only creation returns the secret; listings expose summaries.
export type CreatedPersonalToken = { token: string; summary: PersonalTokenSummary }
export type PersonalSettingsState = {
    feishuLinked: boolean
    tokens: PersonalTokenSummary[]
}

export type OperationErrorCode =
    | 'unauthorized' | 'forbidden' | 'not_found' | 'invalid_input'
    | 'conflict' | 'document_busy' | 'stale_generation'
    | 'insufficient_approvals' | 'unresolved_feedback'
    | 'idempotency_key_reused' | 'storage_unavailable'

export type OperationResult<T> =
    | { ok: true; data: T; revision?: string; replayed?: boolean }
    | {
    ok: false; error: {
        code: OperationErrorCode; message: string;
        currentRevision?: string; conflicts?: { target: string; current: z.infer<typeof jsonSchema> }[]
    }
}

export type CreateEntityInput = z.infer<typeof createEntitySchema>
export type UpdateEntityFieldsInput = z.infer<typeof updateEntityFieldsSchema>
export type EditDocumentInput = z.infer<typeof editDocumentSchema>
export type ReplaceDocumentInput = z.infer<typeof replaceDocumentSchema>

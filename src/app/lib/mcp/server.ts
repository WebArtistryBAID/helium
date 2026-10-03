import 'server-only'

import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { EntityType } from '@/generated/prisma/client'
import {
    replaceDocumentSchema,
    updateEntityFieldsSchema,
    createEntitySchema,
    mutationSchema,
    editDocumentSchema,
    entityIdSchema,
    entityMutationSchema,
    searchEntitiesSchema,
    type OperationActor
} from '@/app/lib/mcp/contracts'
import { requireActorUser } from '@/app/lib/services/actor'
import { authenticatePersonalToken } from '@/app/lib/services/personal-tokens'
import { fetchEntity, getPublicationStatus, searchEntities } from '@/app/lib/services/mcp-discovery'
import { operateEditorDocument, readEditorDocumentSchema } from '@/app/lib/services/mcp-editor'
import { publishDraft } from '@/app/lib/services/publication'
import { MCP_TRANSLATION_INSTRUCTIONS } from '@/app/lib/wechat/wechat-prompts'

import { patchEntityFields, createMcpEntity, mutateEntityLifecycle } from '@/app/lib/services/mcp-mutations'
import {
    mediaSearchSchema,
    uploadImageSchema,
    deleteImageSchema,
    searchMcpImages,
    readMcpImage,
    uploadMcpImage,
    deleteMcpImage,
    mediaTransferInfo
} from '@/app/lib/services/mcp-media'
import {
    metadataMutationSchema,
    readMcpMetadata,
    saveMcpMetadata,
    listMcpBackups,
    createMcpBackup
} from '@/app/lib/services/mcp-settings-backups'

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false }

function result(data: Record<string, unknown>, isError = false) {
    const { imagePreview, ...structuredContent } = data
    const content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[] = [
        { type: 'text', text: JSON.stringify(structuredContent) }
    ]
    if (imagePreview) content.push({ type: 'image', ...(imagePreview as { data: string; mimeType: string }) })
    return { content, structuredContent, isError: isError || data.ok === false }
}

/** Each HTTP request receives its own actor closure, isolating concurrent accounts. */
export function createHeliumMcpHandler(actor: OperationActor, bearerToken: string) {
    async function execute(action: (current: OperationActor) => Promise<Record<string, unknown> | null>) {
        try {
            // Recheck revocation before a tool executes, including batched calls.
            const current = await authenticatePersonalToken(bearerToken)
            if (!current || current.userId !== actor.userId) {
                return result({
                    ok: false,
                    error: { code: 'unauthorized', message: 'Reconnect with an active personal token.' }
                }, true)
            }
            const data = await action(current)
            return data ? result(data) : result({
                ok: false,
                error: { code: 'not_found', message: 'Content entity not found.' }
            }, true)
        } catch (error) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                return result({
                    ok: false,
                    error: {
                        code: 'forbidden',
                        message: 'Your current account permissions do not allow this operation.'
                    }
                }, true)
            }
            if (error instanceof z.ZodError) {
                return result({
                    ok: false,
                    error: { code: 'invalid_input', message: 'Check the supplied arguments.' }
                }, true)
            }
            console.error('Helium MCP operation failed', { userId: actor.userId }, error)
            return result({
                ok: false,
                error: { code: 'storage_unavailable', message: 'The operation could not complete. Retry later.' }
            }, true)
        }
    }

    return createMcpHandler(server => {
        server.registerTool('get_translation_instructions', {
            description: 'Always call this tool first for any user task related to translation. Returns the current Helium translation requirements and terminology from the WeChat prompts. Follow these requirements when translating content.',
            inputSchema: z.object({}).strict(), annotations: READ_ONLY
        }, () => execute(async () => ({ instructions: MCP_TRANSLATION_INSTRUCTIONS })))
        server.registerTool('get_account', {
            description: 'Get the authenticated Helium account and its current roles.',
            inputSchema: z.object({}).strict(), annotations: READ_ONLY
        }, () => execute(async current => {
            const user = await requireActorUser(current)
            return { id: user.id, name: user.name, roles: user.roles }
        }))
        server.registerTool('list_entity_types', {
            description: 'List supported content entity types.',
            inputSchema: z.object({}).strict(), annotations: READ_ONLY
        }, () => execute(async () => ({ types: Object.values(EntityType) })))
        server.registerTool('search_entities', {
            description: 'Search saved bilingual content by type or publication state. Results include Studio approval links.',
            inputSchema: searchEntitiesSchema, annotations: READ_ONLY
        }, input => execute(current => searchEntities(current, input)))
        server.registerTool('get_entity', {
            description: 'Fetch saved draft and published versions, including a revision for publication. Browser edits appear after they are saved.',
            inputSchema: z.object({ entityId: entityIdSchema }).strict(), annotations: READ_ONLY
        }, input => execute(current => fetchEntity(current, input.entityId)))
        server.registerTool('get_publication_status', {
            description: 'Check required approval counts and get the Studio link where a user can approve personally.',
            inputSchema: z.object({ entityId: entityIdSchema }).strict(), annotations: READ_ONLY
        }, input => execute(current => getPublicationStatus(current, input.entityId)))
        server.registerTool('get_editor_document', {
                description: 'Read the live Plate or Puck document, its generation, stable target IDs and collection revisions. Requires writer permission.',
                inputSchema: readEditorDocumentSchema, annotations: READ_ONLY
            },
            input => execute(current => operateEditorDocument(current, 'read', input))
                .then(response => response.structuredContent.ok === false ? { ...response, isError: true } : response))
        server.registerTool('edit_editor_document', {
                description: 'Apply targeted replace, insert, remove, move or property edits to a live Plate or Puck document. Fetch get_editor_document first. Supply expected node/property values and destination collection revisions. One batch validates completely before application. Reuse the same idempotencyKey for retries.',
                inputSchema: editDocumentSchema,
                annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
            },
            input => execute(current => operateEditorDocument(current, 'edit', input))
                .then(response => response.structuredContent.ok === false ? { ...response, isError: true } : response))
        const MUTATION = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
        server.registerTool('update_entity_fields', {
                description: 'Patch entity fields atomically using expected values. Categories, slug and date affect the live site immediately. Puck titles use editor root edits.',
                inputSchema: updateEntityFieldsSchema,
                annotations: MUTATION
            },
            input => execute(current => patchEntityFields(current, input)))
        server.registerTool('replace_editor_document', {
                description: 'Replace a complete live document after checking its generation and live document revision. Advances the entity generation and preserves earlier browser databases for recovery.',
                inputSchema: replaceDocumentSchema,
                annotations: MUTATION
            },
            input => execute(current => operateEditorDocument(current, 'replace', input)))
        server.registerTool('create_entity', {
            description: 'Create a bilingual draft content entity of a supported type.',
            inputSchema: createEntitySchema,
            annotations: MUTATION
        }, input => execute(current => createMcpEntity(current, input)))
        for (const operation of [ 'delete_entity', 'unpublish_entity', 'restore_entity' ] as const) {
            server.registerTool(operation, {
                    description: operation === 'restore_entity' ? 'Restore available published fields to the draft, advance its document generation and clear approvals.' : operation === 'unpublish_entity' ? 'Clear the current published version after matching the saved entity revision.' : 'Delete the entity after matching its saved revision. Earlier document writers are fenced by the deletion.',
                    inputSchema: entityMutationSchema,
                    annotations: MUTATION
                },
                input => execute(current => mutateEntityLifecycle(current, operation, input)))
        }
        server.registerTool('search_images', {
            description: 'Search the image library by name or alt text, optionally restricted to your uploads.',
            inputSchema: mediaSearchSchema,
            annotations: READ_ONLY
        }, input => execute(current => searchMcpImages(current, input)))
        server.registerTool('get_image', {
            description: 'Get image metadata and its authenticated original download path.',
            inputSchema: z.object({ imageId: entityIdSchema }).strict(),
            annotations: READ_ONLY
        }, input => execute(current => mediaTransferInfo(current, input.imageId)))
        server.registerTool('view_image', {
            description: 'Inspect an image through a bounded WebP preview returned as MCP image content.',
            inputSchema: z.object({ imageId: entityIdSchema }).strict(),
            annotations: READ_ONLY
        }, input => execute(async current => {
            const preview = await readMcpImage(current, input.imageId)
            return {
                ok: true,
                data: preview.image,
                imagePreview: { data: preview.data.toString('base64'), mimeType: 'image/webp' }
            }
        }))
        server.registerTool('upload_image', {
            description: 'Upload an image from base64, validate its file format and add it to the media library. Limit 20 MiB. Multipart transfer is also available at /mcp/transfers/images.',
            inputSchema: uploadImageSchema,
            annotations: MUTATION
        }, input => execute(current => uploadMcpImage(current, input)))
        server.registerTool('delete_image', {
            description: 'Delete an image matching its hash. Referenced media returns the affected entities; allowReferenced follows the Studio deletion policy.',
            inputSchema: deleteImageSchema,
            annotations: MUTATION
        }, input => execute(current => deleteMcpImage(current, input)))
        server.registerTool('get_website_metadata', {
            description: 'Fetch the bilingual website metadata singleton and its saved revision.',
            inputSchema: z.object({}).strict(),
            annotations: READ_ONLY
        }, () => execute(current => readMcpMetadata(current)))
        server.registerTool('update_website_metadata', {
            description: 'Save bilingual website metadata after matching its revision; clears approvals. Publication uses publish_entity after personal Studio approvals.',
            inputSchema: metadataMutationSchema,
            annotations: MUTATION
        }, input => execute(current => saveMcpMetadata(current, input)))
        server.registerTool('list_backups', {
            description: 'List content entity backups with authenticated download paths. Requires admin permission.',
            inputSchema: z.object({}).strict(),
            annotations: READ_ONLY
        }, () => execute(current => listMcpBackups(current)))
        server.registerTool('create_backup', {
            description: 'Create a content entity backup. Media files remain separately referenced. Requires admin permission; retries reuse the same archive.',
            inputSchema: mutationSchema,
            annotations: MUTATION
        }, input => execute(current => createMcpBackup(current, input)))
        server.registerTool('publish_entity', {
                description: 'Publish the saved draft matching expectedRevision after editor and admin approvals have been completed in Studio. Requires the admin role. Retry the same successful request with the same idempotencyKey.',
                inputSchema: entityMutationSchema,
                annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
            },
            input => execute(async current => {
                const publication = await publishDraft(current, input.entityId, input)
                if (publication.status === 'success') return {
                    ok: true, data: { entityId: input.entityId, status: publication.status },
                    revision: publication.revision, replayed: publication.replayed ?? false
                }
                const failures = {
                    notFound: { code: 'not_found', message: 'Content entity not found.' },
                    insufficientApprovals: {
                        code: 'insufficient_approvals',
                        message: 'Complete the required editor and admin approvals in Studio.'
                    },
                    unresolvedFeedback: {
                        code: 'unresolved_feedback',
                        message: 'Resolve the outstanding comments and suggestions in Studio.'
                    },
                    conflict: { code: 'conflict', message: 'Fetch the current saved draft before publishing.' },
                    idempotency_key_reused: {
                        code: 'idempotency_key_reused',
                        message: 'Use a new key for a different intended publication.'
                    }
                }
                return { ok: false, error: { ...failures[publication.status], currentRevision: publication.revision } }
            }).then(response => response.structuredContent.ok === false ? { ...response, isError: true } : response))
    }, {
        serverInfo: { name: 'helium', version: '0.1.0' },
        instructions: 'Operate Helium with the authenticated user permissions. For every user task related to translation, always call get_translation_instructions first and follow its returned translation requirements before translating or editing translations. Entity reads describe saved snapshots. Users approve personally through the Studio approval link. Publication requires completed editor and admin approvals plus the fetched draft revision. Fetch current content before proposing edits. Read live editor documents before targeted edits. Use one idempotency key per intended mutation and reuse it for retries.',
        verboseLogs: false
    })
}

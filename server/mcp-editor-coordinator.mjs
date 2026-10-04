import * as Y from 'yjs'
import { slateNodesToInsertDelta } from '@slate-yjs/core'
import { randomUUID } from 'node:crypto'
import {
    validateEditorDocument,
    planEditorCommands,
    readPlateDocument,
    applyPlateDocument,
    describeEditorDocument,
    revisionOf
} from './editor-commands.mjs'
import { readPuckYjsDocument, updatePuckYjsDocument } from '../src/app/lib/puck/puck-yjs.ts'

const requests = new Map()
const pending = new Map()
export const pendingEditorReceipts = document => pending.get(document) ?? []

export function acknowledgeEditorReceipts(document, receipts) {
    const remaining = pendingEditorReceipts(document).filter(receipt => !receipts.includes(receipt))
    if (remaining.length) pending.set(document, remaining)
    else pending.delete(document)
}

const failure = (code, message, current) => ({
    ok: false,
    error: { code, message, ...(current === undefined ? {} : { current }) }
})

export async function coordinateEditorRequest({ pool, instance, persistDocument, actor, input, action }) {
    const user = await pool.query('SELECT "roles" FROM "User" WHERE "id" = $1', [ actor.userId ])
    if (!user.rows[0]?.roles?.includes('writer')) return failure('forbidden', 'Writer permission is required.')
    if (actor.source !== 'studio') {
        const token = await pool.query(`SELECT "id"
                                        FROM "PersonalToken"
                                        WHERE "id" = $1
                                          AND "userId" = $2
                                          AND "revokedAt" IS NULL
                                          AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`, [ actor.tokenId, actor.userId ])
        if (!token.rowCount) return failure('unauthorized', 'An active personal token is required.')
    }

    if (action !== 'read') {
        const operation = action === 'replace' ? 'replace_document' : 'edit_document'
        const committed = await pool.query(`SELECT "requestHash", "result"
                                            FROM "McpOperationReceipt"
                                            WHERE "userId" = $1
                                              AND "operation" = $2
                                              AND "idempotencyKey" = $3`, [ actor.userId, operation, input.idempotencyKey ])
        if (committed.rowCount) return committed.rows[0].requestHash === revisionOf(input)
            ? { ...committed.rows[0].result, replayed: true }
            : failure('idempotency_key_reused', 'Use a new key for a different edit.')
    }
    const entity = await pool.query('SELECT "type", "slug", "collaborationGeneration" FROM "ContentEntity" WHERE "id" = $1', [ input.entityId ])
    if (!entity.rowCount) return failure('not_found', 'Content entity does not exist.')
    if ((entity.rows[0].type === 'page') !== (input.editor === 'puck')) return failure('invalid_input', 'Editor kind does not match this entity.')
    if (entity.rows[0].slug === '__website-metadata') return failure('invalid_input', 'Use website metadata tools.')
    const currentGeneration = Number(entity.rows[0].collaborationGeneration ?? 0)
    const documentName = `${input.editor === 'puck' ? 'puck-page' : 'content-entity'}:${input.entityId}:${input.language}:g${currentGeneration}`
    const connection = await instance.openDirectConnection(documentName, { userId: actor.userId, source: 'mcp' })
    let mutationCommitted = false
    try {
        const document = connection.document
        const read = () => input.editor === 'plate' ? readPlateDocument(document) : readPuckYjsDocument(document)
        const generation = currentGeneration
        if (action === 'read') return {
            ok: true,
            data: { ...describeEditorDocument(read(), input.editor), generation }
        }
        const key = `${actor.userId}:${input.idempotencyKey}`
        const previous = requests.get(key) ?? Promise.resolve()
        const operation = previous.catch(() => {
        }).then(async () => {
            const requestHash = revisionOf(input)
            const operationName = action === 'replace' ? 'replace_document' : 'edit_document'
            const stored = await pool.query(`SELECT "requestHash", "result"
                                             FROM "McpOperationReceipt"
                                             WHERE "userId" = $1
                                               AND "operation" = $2
                                               AND "idempotencyKey" = $3`,
                [ actor.userId, operationName, input.idempotencyKey ])
            let receipt = stored.rows[0]
            let pendingOwner
            if (!receipt) {
                for (const [ owner, receipts ] of pending) {
                    const match = receipts.find(item => item.operation === operationName && item.userId === actor.userId && item.idempotencyKey === input.idempotencyKey)
                    if (match) {
                        receipt = match
                        pendingOwner = owner
                        break
                    }
                }
            }
            if (receipt) {
                if (receipt.requestHash !== requestHash) return failure('idempotency_key_reused', 'Use a new key for a different edit.')
                if (!stored.rowCount && pendingOwner !== document) {
                    acknowledgeEditorReceipts(pendingOwner, [ receipt ])
                    return failure('stale_generation', 'The pending edit belongs to an earlier document generation. Read the current document.')
                }
                if (!stored.rowCount) await persistDocument(documentName, document, actor.userId)
                return { ...receipt.result, replayed: true }
            }
            if (currentGeneration !== input.generation) return failure('stale_generation', 'Read the current document generation before editing.')
            if (document.mcpReplacing || document.mcpFenced) return failure('document_busy', 'The document is being replaced.')
            if (action === 'replace') {
                try {
                    validateEditorDocument(input.document, input.editor)
                } catch (error) {
                    return failure('invalid_input', error.message)
                }
                if (revisionOf(read()) !== input.expectedRevision) return failure('conflict', 'Read the current live document before replacing.')
                document.mcpReplacing = true
                let client
                try {
                    await persistDocument(documentName, document, actor.userId)
                    client = await pool.connect()
                    await client.query('BEGIN')
                    await client.query('SET LOCAL lock_timeout = \'5s\'')
                    const locked = await client.query('SELECT "collaborationGeneration" FROM "ContentEntity" WHERE "id" = $1 FOR UPDATE', [ input.entityId ])
                    if (Number(locked.rows[0]?.collaborationGeneration) !== generation) {
                        await client.query('ROLLBACK')
                        return failure('stale_generation', 'The document has already been replaced.')
                    }
                    const epoch = await client.query(`SELECT nextval('"CollaborationGenerationSequence"')::integer AS generation`)
                    const nextGeneration = epoch.rows[0].generation
                    const nextName = `${input.editor === 'puck' ? 'puck-page' : 'content-entity'}:${input.entityId}:${input.language}:g${nextGeneration}`
                    const next = new Y.Doc()
                    try {
                        if (input.editor === 'plate') next.get('content', Y.XmlText).applyDelta(slateNodesToInsertDelta(input.document))
                        else updatePuckYjsDocument(next, input.document, 'mcp-replace')
                        const contentColumn = input.language === 'en' ? 'contentDraftEN' : 'contentDraftZH'
                        const titleColumn = input.language === 'en' ? 'titleDraftEN' : 'titleDraftZH'
                        await client.query(`UPDATE "ContentEntity"
                                            SET "${contentColumn}" = $1,
                                                ${input.editor === 'puck' ? `"${titleColumn}" = $4,` : ''}
                                                    "collaborationGeneration" = $2,
                                                "updatedAt"        = NOW()
                                            WHERE "id" = $3`,
                            input.editor === 'puck' ? [ JSON.stringify(input.document), nextGeneration, input.entityId, String(input.document.root.props.title ?? '') ]
                                : [ JSON.stringify(input.document), nextGeneration, input.entityId ])
                        await client.query(`INSERT INTO "YjsDocument" ("name", "entityId", "language", "state", "createdAt", "updatedAt")
                                            VALUES ($1, $2, $3::"ContentLanguage", $4, NOW(), NOW())
                                            ON CONFLICT ("entityId","language")
                                                DO UPDATE SET "name"=EXCLUDED."name",
                                                              "state"=EXCLUDED."state",
                                                              "updatedAt"=NOW()`,
                            [ nextName, input.entityId, input.language, Buffer.from(Y.encodeStateAsUpdate(next)) ])
                        await client.query('DELETE FROM "Approval" WHERE "entityId" = $1', [ input.entityId ])
                        const result = {
                            ok: true, data: {
                                entityId: input.entityId,
                                language: input.language,
                                editor: input.editor,
                                generation: nextGeneration, ...describeEditorDocument(input.document, input.editor)
                            }
                        }
                        await client.query(`INSERT INTO "McpOperationReceipt" ("id", "userId", "operation",
                                                                               "idempotencyKey", "requestHash",
                                                                               "result", "createdAt")
                                            VALUES ($1, $2, $3, $4, $5, $6::jsonb,
                                                    NOW())`, [ randomUUID(), actor.userId, operationName, input.idempotencyKey, requestHash, JSON.stringify(result) ])
                        await client.query(`INSERT INTO "UserAuditLog" ("time", "type", "userId", "values")
                                            VALUES (NOW(), 'writerEditEntity', $1, $2)`,
                            [ actor.userId, [ String(input.entityId), 'mcp:replacement', input.idempotencyKey ] ])
                        await client.query('COMMIT')
                        document.mcpFenced = true
                        instance.closeConnections(documentName)
                        return result
                    } finally {
                        next.destroy()
                    }
                } catch (error) {
                    if (client) await client.query('ROLLBACK')
                    throw error
                } finally {
                    document.mcpReplacing = false
                    client?.release()
                }
            }
            // Planning and application run synchronously together after asynchronous lookups.
            // Incoming browser updates therefore precede or follow this whole command batch.
            let data
            try {
                data = planEditorCommands(read(), input.editor, input.commands)
            } catch (error) {
                return failure(error.code ?? 'invalid_input', error.message, error.current)
            }
            const result = {
                ok: true, data: {
                    entityId: input.entityId, language: input.language,
                    editor: input.editor, generation, ...describeEditorDocument(data, input.editor)
                }, replayed: false
            }
            receipt = {
                id: randomUUID(), userId: actor.userId, operation: operationName,
                idempotencyKey: input.idempotencyKey, requestHash, result
            }
            pending.set(document, [ ...pendingEditorReceipts(document), receipt ])
            document.transact(() => {
                if (input.editor === 'plate') applyPlateDocument(document, data)
                else updatePuckYjsDocument(document, data, 'mcp-edit')
            }, { source: 'mcp', userId: actor.userId, idempotencyKey: input.idempotencyKey })
            await persistDocument(documentName, document, actor.userId)
            return result
        })
        requests.set(key, operation)
        try {
            const result = await operation
            mutationCommitted = result.ok === true
            return result
        } finally {
            if (requests.get(key) === operation) requests.delete(key)
        }
    } finally {
        try {
            await connection.disconnect()
        } catch (error) {
            // Content and the retry receipt are already durable. Cleanup must preserve
            // that confirmed outcome even if Hocuspocus's additional store fails.
            if (!mutationCommitted) throw error
            console.error('MCP editor cleanup failed after committed mutation', {
                action, entityId: input.entityId, language: input.language,
                editor: input.editor, userId: actor.userId
            }, error)
        }
    }
}

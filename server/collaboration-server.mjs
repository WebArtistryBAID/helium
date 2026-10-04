import { coordinateEditorRequest, pendingEditorReceipts, acknowledgeEditorReceipts } from './mcp-editor-coordinator.mjs'
import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { jwtVerify } from 'jose'
import pg from 'pg'
import { slateToDeterministicYjsState } from '@platejs/yjs'
import * as Y from 'yjs'
import { yTextToSlateElement } from '@slate-yjs/core'

const { Pool } = pg
const port = Number(process.env.HOCUSPOCUS_PORT ?? 1234)
const secret = new TextEncoder().encode(process.env.JWT_SECRET)
const pool = new Pool({ connectionString: process.env.DATABASE_URI })
const PLATE_ROOM_PATTERN = /^content-entity:(\d+):(en|zh)(?::g(\d+))?$/
const PUCK_ROOM_PATTERN = /^puck-page:(\d+):(en|zh)(?::g(\d+))?$/
const COMPONENT_COLLECTION = '__puckComponentCollection'
const COMPONENT_ITEMS = 'items'
const COMPONENT_ORDER = 'order'

function parseRoom(documentName) {
    const plateMatch = PLATE_ROOM_PATTERN.exec(documentName)
    if (plateMatch != null) {
        return {
            entityId: Number(plateMatch[1]),
            kind: 'plate',
            language: plateMatch[2],
            generation: Number(plateMatch[3] ?? 0)
        }
    }
    const match = PUCK_ROOM_PATTERN.exec(documentName)
    if (match == null) throw new Error('Invalid collaboration document name')
    return { entityId: Number(match[1]), kind: 'puck', language: match[2], generation: Number(match[3] ?? 0) }
}

function initialPlateValue(content) {
    try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
        // Legacy content is retained as text until Plate saves it as JSON.
    }
    return [ { type: 'p', children: [ { text: content ?? '' } ] } ]
}

function toYValue(value) {
    if (typeof value === 'string') {
        const text = new Y.Text()
        text.insert(0, value)
        return text
    }
    if (Array.isArray(value) && value.length > 0 && value.every(component =>
        component != null && typeof component === 'object' && component.props != null &&
        typeof component.props.id === 'string' && typeof component.type === 'string')) {
        const collection = new Y.Map()
        const order = new Y.Array()
        const items = new Y.Map()
        order.insert(0, value.map(component => component.props.id))
        for (const component of value) items.set(component.props.id, toYValue(component))
        collection.set(COMPONENT_COLLECTION, true)
        collection.set(COMPONENT_ORDER, order)
        collection.set(COMPONENT_ITEMS, items)
        return collection
    }
    if (Array.isArray(value)) {
        const array = new Y.Array()
        array.insert(0, value.map(toYValue))
        return array
    }
    if (value != null && typeof value === 'object') {
        const map = new Y.Map()
        for (const [ key, child ] of Object.entries(value)) map.set(key, toYValue(child))
        return map
    }
    return value ?? null
}

function fromYValue(value) {
    if (value instanceof Y.Text) return value.toString()
    if (value instanceof Y.Array) return value.toArray().map(fromYValue)
    if (value instanceof Y.Map && value.get(COMPONENT_COLLECTION) === true) {
        const order = value.get(COMPONENT_ORDER)
        const items = value.get(COMPONENT_ITEMS)
        return order.toArray().flatMap(id => items.has(id) ? [ fromYValue(items.get(id)) ] : [])
    }
    if (value instanceof Y.Map) {
        return Object.fromEntries(Array.from(value.entries(), ([ key, child ]) => [ key, fromYValue(child) ]))
    }
    return value
}

function initialPuckState(content) {
    let data
    try {
        const parsed = JSON.parse(content)
        data = parsed != null && typeof parsed === 'object' && Array.isArray(parsed.content) &&
        parsed.root != null && typeof parsed.root === 'object' &&
        parsed.root.props != null && typeof parsed.root.props === 'object' &&
        parsed.zones != null && typeof parsed.zones === 'object'
            ? parsed
            : { content: [], root: { props: { title: '' } }, zones: {} }
    } catch {
        data = { content: [], root: { props: { title: '' } }, zones: {} }
    }
    const document = new Y.Doc()
    const root = document.getMap('data')
    document.transact(() => {
        for (const [ key, value ] of Object.entries(data)) root.set(key, toYValue(value))
    })
    return Y.encodeStateAsUpdate(document)
}

function puckDataFromState(state) {
    const document = new Y.Doc()
    Y.applyUpdate(document, state)
    return fromYValue(document.getMap('data'))
}

// A room queue serializes explicit saves with debounced saves. Encode inside the
// queue so an older scheduled callback always saves the current live document.
const persistenceQueues = new Map()

function persistDocument(documentName, document, userId) {
    const previous = persistenceQueues.get(documentName) ?? Promise.resolve()
    const operation = previous.catch(() => {
    }).then(async () => {
        // Replacement commits the next generation before disconnecting the old room.
        // Cleanup and queued saves must leave that retired document untouched.
        if (document.mcpFenced) return
        const { entityId, kind, language, generation } = parseRoom(documentName)
        const contentColumn = language === 'en' ? 'contentDraftEN' : 'contentDraftZH'
        const titleColumn = language === 'en' ? 'titleDraftEN' : 'titleDraftZH'
        const data = kind === 'puck' ? fromYValue(document.getMap('data'))
            : yTextToSlateElement(document.get('content', Y.XmlText)).children
        const content = JSON.stringify(data)
        const title = kind === 'puck' ? String(data.root?.props?.title ?? '') : null
        const receipts = pendingEditorReceipts(document)
        const state = Buffer.from(Y.encodeStateAsUpdate(document))
        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            if (userId != null) {
                const user = await client.query('SELECT "roles" FROM "User" WHERE "id" = $1', [ userId ])
                if (!user.rows[0]?.roles?.includes('writer')) throw new Error('Insufficient collaboration permission')
            }
            const entity = await client.query(`SELECT "type", "collaborationGeneration", "${contentColumn}" AS content,
                "${titleColumn}" AS title FROM "ContentEntity" WHERE "id" = $1 FOR UPDATE`, [ entityId ])
            if (entity.rowCount !== 1 || (entity.rows[0].type === 'page') !== (kind === 'puck')) {
                throw new Error('Collaboration document type mismatch')
            }
            // A save waiting on the row lock may have started before replacement committed.
            if (document.mcpFenced) {
                await client.query('ROLLBACK')
                return
            }
            if (Number(entity.rows[0].collaborationGeneration ?? 0) !== generation) throw new Error('Stale collaboration generation')
            await client.query(`INSERT INTO "YjsDocument"
                ("name", "entityId", "language", "state", "createdAt", "updatedAt")
                VALUES ($1, $2, $3::"ContentLanguage", $4, NOW(), NOW())
                ON CONFLICT ("entityId", "language") DO UPDATE SET "name" = EXCLUDED."name", "state" = EXCLUDED."state", "updatedAt" = NOW()`,
                [ documentName, entityId, language, state ])
            if (entity.rows[0].content !== content || (kind === 'puck' && entity.rows[0].title !== title)) {
                await client.query(`UPDATE "ContentEntity" SET "${contentColumn}" = $1,
                    ${kind === 'puck' ? `"${titleColumn}" = $3,` : ''} "updatedAt" = NOW() WHERE "id" = $2`,
                    kind === 'puck' ? [ content, entityId, title ] : [ content, entityId ])
                await client.query('DELETE FROM "Approval" WHERE "entityId" = $1', [ entityId ])
                if (!receipts.length) await client.query(`INSERT INTO "UserAuditLog" ("time", "type", "userId", "values")
                    VALUES (NOW(), 'writerEditEntity', $1, $2)`,
                    [ userId ?? null, [ String(entityId), `collaboration:${language}` ] ])
            }
            for (const receipt of receipts) {
                await client.query(`INSERT INTO "UserAuditLog" ("time", "type", "userId", "values")
                    VALUES (NOW(), 'writerEditEntity', $1, $2)`,
                    [ receipt.userId, [ String(entityId), `mcp:${language}`, receipt.idempotencyKey ] ])
                await client.query(`INSERT INTO "McpOperationReceipt"
                    ("id", "userId", "operation", "idempotencyKey", "requestHash", "result", "createdAt")
                    VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
                    ON CONFLICT ("userId", "operation", "idempotencyKey") DO NOTHING`,
                    [ receipt.id, receipt.userId, receipt.operation, receipt.idempotencyKey,
                        receipt.requestHash, JSON.stringify(receipt.result) ])
            }
            await client.query('COMMIT')
            acknowledgeEditorReceipts(document, receipts)
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    })
    persistenceQueues.set(documentName, operation)
    void operation.finally(() => {
        if (persistenceQueues.get(documentName) === operation) persistenceQueues.delete(documentName)
    }).catch(() => {
    })
    return operation
}

const server = new Server({
    address: '0.0.0.0',
    port,
    debounce: 1000,
    maxDebounce: 5000,
    async beforeHandleMessage({ document, documentName }) {
        const room = parseRoom(documentName)
        const current = await pool.query('SELECT "collaborationGeneration" FROM "ContentEntity" WHERE "id" = $1', [ room.entityId ])
        if (!current.rowCount || Number(current.rows[0].collaborationGeneration) !== room.generation) throw new Error('Stale collaboration generation')
        if (document.mcpReplacing || document.mcpFenced) throw new Error('Document generation is being replaced')
    },
    async onStateless({ connection, documentName, document, payload }) {
        let request
        try {
            request = JSON.parse(payload)
        } catch {
            return
        }
        if (request.type !== 'persist' || typeof request.requestId !== 'string' || request.requestId.length > 100) return
        try {
            if (connection.context?.userId == null) throw new Error('Writer authentication required')
            await persistDocument(documentName, document, connection.context.userId)
            connection.sendStateless(JSON.stringify({ type: 'persisted', requestId: request.requestId }))
        } catch (error) {
            console.error('Collaborative persistence failed:', error)
            connection.sendStateless(JSON.stringify({ type: 'persistence-error', requestId: request.requestId }))
        }
    },
    async onRequest({ request, response, instance }) {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        if (![ '/invalidate', '/mcp/editor' ].includes(path)) return
        if (!process.env.JWT_SECRET || request.method !== 'POST' || request.headers['x-collaboration-secret'] !== process.env.JWT_SECRET) {
            response.writeHead(401)
            response.end()
            throw null
        }
        const chunks = []
        let length = 0
        for await (const chunk of request) {
            length += chunk.length
            if (length > 1_048_576) {
                response.writeHead(413)
                response.end()
                throw null
            }
            chunks.push(chunk)
        }
        let payload = {}
        try {
            payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
        } catch {
            response.writeHead(400)
            response.end()
            throw null
        }
        if (path === '/mcp/editor') {
            const startedAt = Date.now()
            const requestId = typeof request.headers['x-mcp-request-id'] === 'string'
                ? request.headers['x-mcp-request-id'].slice(0, 100) : undefined
            const context = {
                requestId, action: payload.action, entityId: payload.input?.entityId,
                editor: payload.input?.editor, language: payload.input?.language, userId: payload.actor?.userId
            }
            console.info('MCP editor coordinator request received', context)
            try {
                if (![ 'read', 'edit', 'replace' ].includes(payload.action) || !payload.input ||
                    ![ 'plate', 'puck' ].includes(payload.input.editor) ||
                    ![ 'en', 'zh' ].includes(payload.input.language) ||
                    !Number.isSafeInteger(payload.input.entityId) || payload.input.entityId <= 0 ||
                    !Number.isSafeInteger(payload.actor?.userId) || (payload.actor?.source !== 'studio' && !payload.actor?.tokenId) ||
                    (payload.action === 'edit' && (!Array.isArray(payload.input.commands) ||
                        !payload.input.commands.length || payload.input.commands.length > 100 ||
                        typeof payload.input.idempotencyKey !== 'string'))) {
                    response.writeHead(400)
                    response.end()
                    throw null
                }
                const result = await coordinateEditorRequest({
                    pool,
                    instance,
                    persistDocument,
                    actor: payload.actor,
                    input: payload.input,
                    action: payload.action
                })
                response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
                response.end(JSON.stringify(result))
                console.info('MCP editor coordinator request completed', {
                    ...context,
                    durationMs: Date.now() - startedAt,
                    ok: result.ok,
                    errorCode: result.error?.code
                })
            } catch (error) {
                if (error === null) throw null
                console.error('MCP editor coordinator failed:', {
                    ...context,
                    durationMs: Date.now() - startedAt
                }, error)
                response.writeHead(503)
                response.end(JSON.stringify({
                    ok: false,
                    error: {
                        code: 'storage_unavailable',
                        message: 'Collaborative edit could not be confirmed. Retry with the same key.'
                    }
                }))
            }
            throw null
        }
        if (payload.all !== true) {
            response.writeHead(400)
            response.end()
            throw null
        }
        const documents = Array.from(instance.documents.values())
        instance.closeConnections()
        await Promise.all(documents.map(document => instance.unloadDocument(document)))
        response.writeHead(204)
        response.end()
        throw null
    },
    async onAuthenticate({ documentName, token }) {
        if (!/:g\d+$/.test(documentName)) throw new Error('Refresh the collaboration client for generation-aware rooms')
        const room = parseRoom(documentName)
        const { payload } = await jwtVerify(token, secret, {
            issuer: 'helium-next',
            audience: 'helium-collaboration'
        })
        if (payload.room !== documentName || payload.entityId !== room.entityId || payload.language !== room.language) {
            throw new Error('Collaboration token does not match the requested document')
        }
        const current = await pool.query('SELECT "collaborationGeneration" FROM "ContentEntity" WHERE "id" = $1', [ room.entityId ])
        if (!current.rowCount || Number(current.rows[0].collaborationGeneration) !== room.generation) throw new Error('Stale collaboration generation')
        const userId = Number(payload.sub)
        const result = await pool.query('SELECT "roles" FROM "User" WHERE "id" = $1', [ userId ])
        if (!result.rows[0]?.roles?.includes('writer')) throw new Error('Insufficient collaboration permission')
        return { userId }
    },
    extensions: [
        new Database({
            async fetch({ documentName }) {
                const room = parseRoom(documentName)
                const current = await pool.query('SELECT "collaborationGeneration" FROM "ContentEntity" WHERE "id" = $1', [ room.entityId ])
                if (!current.rowCount || Number(current.rows[0].collaborationGeneration) !== room.generation) throw new Error('Stale collaboration generation')
                const stored = await pool.query(
                    'SELECT "state" FROM "YjsDocument" WHERE "name" = $1',
                    [ documentName ]
                )
                if (stored.rows[0]?.state != null) return new Uint8Array(stored.rows[0].state)

                const { entityId, kind, language, generation } = parseRoom(documentName)
                const contentColumn = language === 'en' ? 'contentDraftEN' : 'contentDraftZH'
                const entity = await pool.query(
                    `SELECT "${contentColumn}" AS "content", "type" FROM "ContentEntity" WHERE "id" = $1`,
                    [ entityId ]
                )
                if (entity.rowCount !== 1) throw new Error('Content entity does not exist')
                if (kind === 'puck') {
                    if (entity.rows[0].type !== 'page') throw new Error('Puck collaboration requires a page entity')
                    return initialPuckState(entity.rows[0].content)
                }
                if (entity.rows[0].type === 'page') throw new Error('Plate collaboration requires a rich text entity')
                return slateToDeterministicYjsState(documentName, initialPlateValue(entity.rows[0].content))
            },
            async store({ documentName, document, context }) {
                await persistDocument(documentName, document, context?.userId)

            }
        })
    ]
})

await server.listen()

async function shutdown() {
    await server.destroy()
    await pool.end()
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

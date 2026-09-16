import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { jwtVerify } from 'jose'
import pg from 'pg'
import { slateToDeterministicYjsState } from '@platejs/yjs'
import * as Y from 'yjs'

const { Pool } = pg
const port = Number(process.env.HOCUSPOCUS_PORT ?? 1234)
const secret = new TextEncoder().encode(process.env.JWT_SECRET)
const pool = new Pool({ connectionString: process.env.DATABASE_URI })
const PLATE_ROOM_PATTERN = /^content-entity:(\d+):(en|zh)$/
const PUCK_ROOM_PATTERN = /^puck-page:(\d+):(en|zh)$/
const COMPONENT_COLLECTION = '__puckComponentCollection'
const COMPONENT_ITEMS = 'items'
const COMPONENT_ORDER = 'order'

function parseRoom(documentName) {
    const plateMatch = PLATE_ROOM_PATTERN.exec(documentName)
    if (plateMatch != null) {
        return { entityId: Number(plateMatch[1]), kind: 'plate', language: plateMatch[2] }
    }
    const match = PUCK_ROOM_PATTERN.exec(documentName)
    if (match == null) throw new Error('Invalid collaboration document name')
    return { entityId: Number(match[1]), kind: 'puck', language: match[2] }
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

const server = new Server({
    address: '0.0.0.0',
    port,
    debounce: 1000,
    maxDebounce: 5000,
    async onRequest({ request, response, instance }) {
        if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/invalidate') return
        if (request.method !== 'POST' || request.headers['x-collaboration-secret'] !== process.env.JWT_SECRET) {
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
        const room = parseRoom(documentName)
        const { payload } = await jwtVerify(token, secret, {
            issuer: 'helium-next',
            audience: 'helium-collaboration'
        })
        if (payload.room !== documentName || payload.entityId !== room.entityId || payload.language !== room.language) {
            throw new Error('Collaboration token does not match the requested document')
        }
        const userId = Number(payload.sub)
        const result = await pool.query('SELECT "roles" FROM "User" WHERE "id" = $1', [ userId ])
        if (!result.rows[0]?.roles?.includes('writer')) throw new Error('Insufficient collaboration permission')
        return { userId }
    },
    extensions: [
        new Database({
            async fetch({ documentName }) {
                const stored = await pool.query(
                    'SELECT "state" FROM "YjsDocument" WHERE "name" = $1',
                    [ documentName ]
                )
                if (stored.rows[0]?.state != null) return new Uint8Array(stored.rows[0].state)

                const { entityId, kind, language } = parseRoom(documentName)
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
                return slateToDeterministicYjsState(documentName, initialPlateValue(entity.rows[0].content))
            },
            async store({ documentName, state }) {
                const { entityId, kind, language } = parseRoom(documentName)
                const client = await pool.connect()
                try {
                    await client.query('BEGIN')
                    await client.query(`
                        INSERT INTO "YjsDocument"
                            ("name", "entityId", "language", "state", "createdAt", "updatedAt")
                        VALUES ($1, $2, $3::"ContentLanguage", $4, NOW(), NOW())
                        ON CONFLICT ("name") DO UPDATE
                        SET "state" = EXCLUDED."state", "updatedAt" = NOW()
                    `, [ documentName, entityId, language, Buffer.from(state) ])
                    if (kind === 'puck') {
                        const data = puckDataFromState(state)
                        const contentColumn = language === 'en' ? 'contentDraftEN' : 'contentDraftZH'
                        const titleColumn = language === 'en' ? 'titleDraftEN' : 'titleDraftZH'
                        const title = typeof data.root?.props?.title === 'string' ? data.root.props.title : ''
                        await client.query(`
                            UPDATE "ContentEntity"
                            SET "${contentColumn}" = $1, "${titleColumn}" = $2, "updatedAt" = NOW()
                            WHERE "id" = $3
                        `, [ JSON.stringify(data), title, entityId ])
                    }
                    await client.query('COMMIT')
                } catch (error) {
                    await client.query('ROLLBACK')
                    throw error
                } finally {
                    client.release()
                }
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

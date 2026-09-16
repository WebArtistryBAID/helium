import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { jwtVerify } from 'jose'
import pg from 'pg'
import { slateToDeterministicYjsState } from '@platejs/yjs'

const { Pool } = pg
const port = Number(process.env.HOCUSPOCUS_PORT ?? 1234)
const secret = new TextEncoder().encode(process.env.JWT_SECRET)
const pool = new Pool({ connectionString: process.env.DATABASE_URI })
const ROOM_PATTERN = /^content-entity:(\d+):(en|zh)$/

function parseRoom(documentName) {
    const match = ROOM_PATTERN.exec(documentName)
    if (match == null) throw new Error('Invalid collaboration document name')
    return { entityId: Number(match[1]), language: match[2] }
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

const server = new Server({
    address: '0.0.0.0',
    port,
    debounce: 1000,
    maxDebounce: 5000,
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

                const { entityId, language } = parseRoom(documentName)
                const contentColumn = language === 'en' ? 'contentDraftEN' : 'contentDraftZH'
                const entity = await pool.query(
                    `SELECT "${contentColumn}" AS "content" FROM "ContentEntity" WHERE "id" = $1`,
                    [ entityId ]
                )
                if (entity.rowCount !== 1) throw new Error('Content entity does not exist')
                return slateToDeterministicYjsState(documentName, initialPlateValue(entity.rows[0].content))
            },
            async store({ documentName, state }) {
                const { entityId, language } = parseRoom(documentName)
                await pool.query(`
                    INSERT INTO "YjsDocument"
                        ("name", "entityId", "language", "state", "createdAt", "updatedAt")
                    VALUES ($1, $2, $3::"ContentLanguage", $4, NOW(), NOW())
                    ON CONFLICT ("name") DO UPDATE
                    SET "state" = EXCLUDED."state", "updatedAt" = NOW()
                `, [ documentName, entityId, language, Buffer.from(state) ])
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

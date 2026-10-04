import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as Y from 'yjs'
import { slateNodesToInsertDelta, yTextToSlateElement } from '@slate-yjs/core'
import { stripTypeScriptTypes } from 'node:module'
import { EventEmitter } from 'node:events'

const source = await readFile(new URL('../server/collaboration-server.mjs', import.meta.url), 'utf8')
const functions = source.slice(source.indexOf('const PLATE_ROOM_PATTERN'), source.indexOf('const server = new Server'))
const events = []
const row = { type: 'post', content: 'before', title: '' }
let failCommit = false
let active = 0
let maxActive = 0
const pool = {
    connect: async () => {
        active++
        maxActive = Math.max(maxActive, active)
        return {
            query: async (sql, values) => {
                events.push({ sql, values })
                await Promise.resolve()
                if (sql.startsWith('SELECT "roles"')) return { rows: [ { roles: [ 'writer' ] } ] }
                if (sql.startsWith('SELECT "type"')) return { rowCount: 1, rows: [ { ...row } ] }
                if (sql === 'COMMIT' && failCommit) throw new Error('Commit failed')
                return { rows: [], rowCount: 1 }
            },
            release: () => {
                active--
            }
        }
    }
}
let pendingReceipts = []
const {
    persistDocument,
    toYValue
} = new Function('Y', 'yTextToSlateElement', 'pool', 'pendingEditorReceipts', 'acknowledgeEditorReceipts',
    `${functions}; return { persistDocument, toYValue }`)(Y, yTextToSlateElement, pool, () => pendingReceipts, (_doc, receipts) => {
    pendingReceipts = pendingReceipts.filter(receipt => !receipts.includes(receipt))
})
const doc = new Y.Doc()
const nodes = [ { type: 'p', children: [ { text: 'Saved content', bold: true } ] } ]
doc.get('content', Y.XmlText).applyDelta(slateNodesToInsertDelta(nodes))
await Promise.all([
    persistDocument('content-entity:4:en', doc, 7),
    persistDocument('content-entity:4:en', doc, 7)
])
assert.equal(maxActive, 1)
const update = events.find(({ sql }) => sql.startsWith('UPDATE "ContentEntity"'))
assert.deepEqual(JSON.parse(update.values[0]), nodes)
assert.ok(events.some(({ sql }) => sql.startsWith('INSERT INTO "YjsDocument"')))
assert.ok(events.some(({ sql }) => sql.startsWith('DELETE FROM "Approval"')))
assert.ok(events.some(({ sql }) => sql.startsWith('INSERT INTO "UserAuditLog"')))
console.log('Passed: Plate snapshot, Yjs state, approval clearing, audit, and ordered saves')

row.content = update.values[0]
events.length = 0
await persistDocument('content-entity:4:en', doc, 7)
assert.equal(events.some(({ sql }) => sql.startsWith('DELETE FROM "Approval"')), false)
console.log('Passed: unchanged content retains approvals')

failCommit = true
await assert.rejects(persistDocument('content-entity:4:en', doc, 7), /Commit failed/)
assert.equal(events.at(-1).sql, 'ROLLBACK')
failCommit = false
await persistDocument('content-entity:4:en', doc, 7)
assert.equal(events.at(-1).sql, 'COMMIT')
console.log('Passed: failed commits roll back and later saves recover')

row.type = 'page'
const puck = new Y.Doc()
const data = {
    content: [ { type: 'Text', props: { id: 'a', text: 'Body' } } ],
    root: { props: { title: 'Page title' } },
    zones: {}
}
for (const [ key, value ] of Object.entries(data)) puck.getMap('data').set(key, toYValue(value))
events.length = 0
await persistDocument('puck-page:4:zh', puck, 7)
const pageWrite = events.find(({ sql }) => sql.startsWith('UPDATE "ContentEntity"'))
assert.deepEqual(JSON.parse(pageWrite.values[0]), data)
assert.equal(pageWrite.values[2], 'Page title')
assert.match(pageWrite.sql, /contentDraftZH/)
await assert.rejects(persistDocument('content-entity:4:en', doc, 7), /type mismatch/)
console.log('Passed: Puck title and component serialization, language columns, document kind boundaries')

// Exercise the actual stateless handler, including its ordering relative to commit.
const handlerSource = source.slice(source.indexOf('    async onStateless('), source.indexOf('    async onRequest('))
    .trim().replace('async onStateless(', 'async function handle(').replace(/,$/, '')
const handle = new Function('persistDocument', 'console', `${handlerSource}; return handle`)(persistDocument, {
    error() {
    }
})
const replies = []
const connection = {
    context: { userId: 7 }, sendStateless: payload => {
        assert.equal(events.at(-1).sql, failCommit ? 'ROLLBACK' : 'COMMIT')
        replies.push(JSON.parse(payload))
    }
}
await handle({
    connection, documentName: 'puck-page:4:zh', document: puck,
    payload: JSON.stringify({ type: 'persist', requestId: 'first' })
})
assert.equal(replies.at(-1).type, 'persisted')
failCommit = true
await handle({
    connection, documentName: 'puck-page:4:zh', document: puck,
    payload: JSON.stringify({ type: 'persist', requestId: 'failed' })
})
assert.equal(replies.at(-1).type, 'persistence-error')
failCommit = false
console.log('Passed: server acknowledgement follows commit, with failure replies after rollback')

pendingReceipts = [ {
    id: 'receipt', userId: 7, operation: 'edit_document', idempotencyKey: 'edit',
    requestHash: 'hash', result: { ok: true }
} ]
failCommit = true
await assert.rejects(persistDocument('puck-page:4:zh', puck, 7))
assert.equal(pendingReceipts.length, 1)
failCommit = false
events.length = 0
await persistDocument('puck-page:4:zh', puck, 7)
assert.equal(pendingReceipts.length, 0)
const receiptIndex = events.findIndex(({ sql }) => sql.startsWith('INSERT INTO "McpOperationReceipt"'))
assert.ok(receiptIndex >= 0 && receiptIndex < events.findIndex(({ sql }) => sql === 'COMMIT'))
assert.ok(events.some(({ sql, values }) => sql.startsWith('INSERT INTO "UserAuditLog"') && values[1].includes('edit')))
console.log('Passed: retry receipts commit with content, retain pending state on failure, and attribute MCP audit')

row.collaborationGeneration = 1
await assert.rejects(persistDocument('puck-page:4:zh:g0', puck, 7), /Stale collaboration generation/)
assert.equal(events.at(-1).sql, 'ROLLBACK')
await persistDocument('puck-page:4:zh:g1', puck, 7)
assert.equal(events.at(-1).sql, 'COMMIT')
console.log('Passed: earlier generations fail before persisted snapshots can overwrite replacement')

events.length = 0
const retiredSave = persistDocument('puck-page:4:zh:g0', puck, 7)
puck.mcpFenced = true
await retiredSave
await persistDocument('puck-page:4:zh:g0', puck, 7)
assert.equal(events.length, 0)
assert.equal(active, 0)
puck.mcpFenced = false
await assert.rejects(persistDocument('puck-page:4:zh:g0', puck, 7), /Stale collaboration generation/)
console.log('Passed: fenced room cleanup and queued saves skip storage while other stale writes remain rejected')

const clientSource = (await readFile(new URL('../src/app/lib/collaboration/persist.ts', import.meta.url), 'utf8'))
    .replace(/^import.*$/gm, '').replaceAll('export function', 'function')
const clientIdSource = (await readFile(new URL('../src/app/lib/client-id.ts', import.meta.url), 'utf8'))
    .replaceAll('export function', 'function')
// HTTP browser origins expose getRandomValues while randomUUID may be unavailable.
const httpCrypto = { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) }
const createClientId = new Function('globalThis', `${stripTypeScriptTypes(clientIdSource)}; return createClientId`)({ crypto: httpCrypto })
assert.match(createClientId(), /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
const persist = new Function('createClientId', `${stripTypeScriptTypes(clientSource)}; return persistCollaborationDocument`)(createClientId)

class Provider extends EventEmitter {
    isSynced = true

    sendStateless(payload) {
        this.request = JSON.parse(payload)
    }
}

const provider = new Provider()
let finished = false
const promise = persist(provider).then(() => {
    finished = true
})
provider.emit('stateless', { payload: JSON.stringify({ type: 'persisted', requestId: 'unrelated' }) })
await Promise.resolve()
assert.equal(finished, false)
provider.emit('stateless', { payload: JSON.stringify({ type: 'persisted', requestId: provider.request.requestId }) })
await promise
assert.equal(provider.listenerCount('stateless'), 0)
const failed = persist(provider)
provider.emit('stateless', {
    payload: JSON.stringify({
        type: 'persistence-error',
        requestId: provider.request.requestId
    })
})
await assert.rejects(failed, /could not be saved/)
const disconnected = persist(provider)
provider.emit('disconnect')
await assert.rejects(disconnected, /disconnected/)
console.log('Passed: client awaits matching durable acknowledgement and propagates failures')
doc.destroy()
puck.destroy()

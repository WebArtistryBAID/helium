import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { slateNodesToInsertDelta } from '@slate-yjs/core'
import {
    planEditorCommands,
    revisionOf,
    describeEditorDocument,
    applyPlateDocument,
    readPlateDocument
} from '../server/editor-commands.mjs'
import {
    coordinateEditorRequest,
    pendingEditorReceipts,
    acknowledgeEditorReceipts
} from '../server/mcp-editor-coordinator.mjs'
import { readPuckYjsDocument, initializePuckYjsDocument } from '../src/app/lib/puck/puck-yjs.ts'
import { PUCK_COMPONENT_TYPES } from '../src/app/lib/puck/puck-component-types.ts'
import { readFile } from 'node:fs/promises'

const blocks = [
    { id: 'a', type: 'p', children: [ { text: 'Alpha' } ] },
    { id: 'b', type: 'p', children: [ { text: 'Beta' } ] }
]
const edit = {
    operation: 'set_property',
    targetId: 'a',
    path: [ 'children', '0', 'text' ],
    expected: 'Alpha',
    value: 'Changed'
}
const planned = planEditorCommands(blocks, 'plate', [ edit ])
assert.equal(blocks[0].children[0].text, 'Alpha')
assert.equal(planned[0].children[0].text, 'Changed')
assert.throws(() => planEditorCommands(planned, 'plate', [ edit ]), error => error.code === 'conflict')
assert.throws(() => planEditorCommands(blocks, 'plate', [ edit, { ...edit, targetId: 'missing' } ]))
assert.equal(blocks[0].children[0].text, 'Alpha')
const moved = planEditorCommands(blocks, 'plate', [ {
    operation: 'move', targetId: 'b', expected: blocks[1], parentId: null,
    beforeId: 'a', expectedParentRevision: revisionOf(blocks)
} ])
assert.deepEqual(moved.map(node => node.id), [ 'b', 'a' ])
const inserted = planEditorCommands(blocks, 'plate', [ {
    operation: 'insert', parentId: null, beforeId: 'b',
    expectedParentRevision: revisionOf(blocks), value: { id: 'c', type: 'p', children: [ { text: 'New' } ] }
} ])
assert.deepEqual(inserted.map(node => node.id), [ 'a', 'c', 'b' ])
assert.deepEqual(planEditorCommands(blocks, 'plate', [ {
    operation: 'remove',
    targetId: 'a',
    expected: blocks[0]
} ]), [ blocks[1] ])
assert.throws(() => planEditorCommands(blocks, 'plate', [ {
    ...edit,
    path: [ '__proto__', 'polluted' ],
    expected: null
} ]))
assert.throws(() => planEditorCommands(blocks, 'plate', [ {
    operation: 'replace',
    targetId: 'a',
    expected: blocks[0],
    value: { ...blocks[0], id: 'b' }
} ]))
console.log('Passed: expected values, atomic planning, insertion, removal, move, and unsafe paths')

const document = new Y.Doc()
document.get('content', Y.XmlText).applyDelta(slateNodesToInsertDelta(blocks))
const originalTail = document.get('content', Y.XmlText).toDelta()[1].insert
applyPlateDocument(document, planned)
assert.deepEqual(readPlateDocument(document), planned)
assert.equal(document.get('content', Y.XmlText).toDelta()[1].insert, originalTail)
const middle = { id: 'middle', type: 'p', children: [ { text: 'Untouched' } ] }
const threeBlocks = [ blocks[0], middle, blocks[1] ]
const middleDocument = new Y.Doc()
middleDocument.get('content', Y.XmlText).applyDelta(slateNodesToInsertDelta(threeBlocks))
const middleNode = middleDocument.get('content', Y.XmlText).toDelta()[1].insert
const twoChanges = structuredClone(threeBlocks)
twoChanges[0].children[0].text = 'First changed'
twoChanges[2].children[0].text = 'Last changed'
applyPlateDocument(middleDocument, twoChanges)
assert.equal(middleDocument.get('content', Y.XmlText).toDelta()[1].insert, middleNode)
assert.deepEqual(readPlateDocument(middleDocument), twoChanges)
middleDocument.destroy()
console.log('Passed: Plate preserves unchanged Yjs blocks')

const component = { type: 'ParagraphConfig', props: { id: 'c', text: 'Original' } }
const puck = { content: [ component ], root: { props: { title: '' } }, zones: {} }
const changedPuck = planEditorCommands(puck, 'puck', [ {
    operation: 'set_property',
    targetId: 'c',
    path: [ 'props', 'text' ],
    expected: 'Original',
    value: 'Changed'
} ])
assert.equal(changedPuck.content[0].props.text, 'Changed')
assert.throws(() => planEditorCommands(puck, 'puck', [ {
    operation: 'replace',
    targetId: 'c',
    expected: component,
    value: { ...component, type: 'Unknown' }
} ]))
const config = await readFile(new URL('../src/app/lib/puck/puck-config.tsx', import.meta.url), 'utf8')
const registered = [ ...config.slice(config.indexOf('    components: {'), config.indexOf('    categories: {')).matchAll(/^        (\w+Config),?$/gm) ].map(match => match[1])
assert.deepEqual(PUCK_COMPONENT_TYPES, registered)
assert.equal(describeEditorDocument(puck, 'puck').collections[0].targetIds[0], 'c')
const nestedPuck = {
    ...puck,
    content: [ { type: 'ContainerConfig', props: { id: 'container', children: [ component ] } } ]
}
const nestedEdit = planEditorCommands(nestedPuck, 'puck', [ {
    operation: 'set_property',
    targetId: 'c',
    path: [ 'props', 'text' ],
    expected: 'Original',
    value: 'Nested'
} ])
assert.equal(nestedEdit.content[0].props.children[0].props.text, 'Nested')
assert.ok(describeEditorDocument(nestedPuck, 'puck').collections.some(collection => collection.parentId === '@slot:container:children'))
const rootEdit = planEditorCommands(puck, 'puck', [ {
    operation: 'set_property',
    targetId: '$root',
    path: [ 'props', 'title' ],
    expected: '',
    value: 'Updated title'
} ])
assert.equal(rootEdit.root.props.title, 'Updated title')
console.log('Passed: Puck properties, supported components, and live target discovery')

// The coordinator uses an actual Yjs document with isolated database and connection adapters.
let roles = [ 'writer' ]
let tokenActive = true
let stored = null
let writes = 0
let failPersistence = false
let failDisconnect = false
const live = new Y.Doc()
initializePuckYjsDocument(live, puck)
const pool = {
    query: async (sql, values) => {
        if (sql.includes('FROM "User"')) return { rows: [ { roles } ] }
        if (sql.includes('FROM "PersonalToken"')) return { rowCount: tokenActive ? 1 : 0 }
        if (sql.includes('FROM "ContentEntity"')) return { rowCount: 1, rows: [ { type: 'page' } ] }
        const matches = stored && stored.idempotencyKey === values[2]
        return { rowCount: matches ? 1 : 0, rows: matches ? [ stored ] : [] }
    }
}
const instance = {
    openDirectConnection: async () => ({
        document: live, disconnect: async () => {
            if (failDisconnect) throw new Error('Cleanup unavailable')
        }
    })
}
const persistDocument = async (_name, doc) => {
    writes++
    if (failPersistence) throw new Error('Unavailable')
    const receipts = pendingEditorReceipts(doc)
    if (receipts.length) stored = receipts[0]
    acknowledgeEditorReceipts(doc, receipts)
}
const actor = { userId: 7, tokenId: 'active' }
const input = {
    entityId: 4, language: 'en', editor: 'puck', generation: 0, idempotencyKey: 'edit-1',
    commands: [ {
        operation: 'set_property',
        targetId: 'c',
        path: [ 'props', 'text' ],
        expected: 'Original',
        value: 'Changed'
    } ]
}
const call = (action, value = input) => coordinateEditorRequest({
    pool,
    instance,
    persistDocument,
    actor,
    input: value,
    action
})
assert.equal((await call('read')).data.document.content[0].props.text, 'Original')
const results = await Promise.all([ call('edit'), call('edit') ])
assert.equal(results[0].ok, true)
assert.equal(results[1].replayed, true)
assert.equal(writes, 1)
assert.equal(readPuckYjsDocument(live).content[0].props.text, 'Changed')
assert.equal((await call('edit', { ...input, commands: [] })).error.code, 'idempotency_key_reused')
assert.equal((await call('edit', { ...input, idempotencyKey: 'stale', generation: 1 })).error.code, 'stale_generation')
assert.equal((await call('edit', { ...input, idempotencyKey: 'conflict' })).error.code, 'conflict')
roles = []
assert.equal((await call('read')).error.code, 'forbidden')
roles = [ 'writer' ]
tokenActive = false
assert.equal((await call('read')).error.code, 'unauthorized')
tokenActive = true
stored = null
failPersistence = true
const retry = {
    ...input,
    idempotencyKey: 'recover',
    commands: [ { ...input.commands[0], expected: 'Changed', value: 'Recovered' } ]
}
await assert.rejects(call('edit', retry), /Unavailable/)
assert.equal(readPuckYjsDocument(live).content[0].props.text, 'Recovered')
failPersistence = false
assert.equal((await call('edit', retry)).replayed, true)
assert.equal(stored.idempotencyKey, 'recover')
console.log('Passed: coordinator permissions, concurrent retries, conflicts, generation, and recovery after persistence failure')
failDisconnect = true
const cleanupInput = {
    ...input, idempotencyKey: 'cleanup', commands: [ {
        ...input.commands[0], expected: 'Recovered', value: 'Committed despite cleanup failure'
    } ]
}
assert.equal((await call('edit', cleanupInput)).ok, true)
assert.equal(stored.idempotencyKey, 'cleanup')
assert.equal((await call('edit', cleanupInput)).replayed, true)
failPersistence = true
await assert.rejects(call('edit', {
    ...cleanupInput, idempotencyKey: 'uncommitted', commands: [ {
        ...input.commands[0], expected: 'Committed despite cleanup failure', value: 'Pending'
    } ]
}), /Cleanup unavailable/)
failPersistence = false
failDisconnect = false
console.log('Passed: committed edits report success after cleanup failure; uncommitted edits still fail')

document.destroy()
live.destroy()

// Replacement commits a new generation and snapshot together before closing earlier writers.
const replacementDoc = new Y.Doc()
initializePuckYjsDocument(replacementDoc, puck)
let generation = 0
let replacementReceipt = null
let replacementState = null
let commitReplacement = false
const replacementEvents = []
const replacementPool = {
    query: async (sql, values) => {
        if (sql.includes('FROM "User"')) return { rows: [ { roles: [ 'writer' ] } ] }
        if (sql.includes('FROM "PersonalToken"')) return { rowCount: 1 }
        if (sql.includes('FROM "ContentEntity"')) return {
            rowCount: 1,
            rows: [ { type: 'page', collaborationGeneration: generation } ]
        }
        return {
            rowCount: replacementReceipt && replacementReceipt.idempotencyKey === values[2] ? 1 : 0,
            rows: replacementReceipt ? [ replacementReceipt ] : []
        }
    },
    connect: async () => ({
        query: async (sql, values) => {
            replacementEvents.push(sql)
            if (sql.startsWith('SELECT "collaborationGeneration"')) return { rows: [ { collaborationGeneration: generation } ] }
            if (sql.includes('nextval')) return { rows: [ { generation: 1 } ] }
            if (sql.startsWith('INSERT INTO "YjsDocument"')) replacementState = values[3]
            if (sql.startsWith('INSERT INTO "McpOperationReceipt"')) replacementReceipt = {
                requestHash: values[4],
                result: JSON.parse(values[5]),
                idempotencyKey: values[3]
            }
            if (sql === 'COMMIT') {
                generation = 1
                commitReplacement = true
            }
            return { rows: [] }
        }, release() {
        }
    })
}
let closed = false
const replacementInstance = {
    openDirectConnection: async () => ({
        document: replacementDoc, disconnect: async () => {
        }
    }),
    closeConnections: () => {
        assert.equal(commitReplacement, true)
        closed = true
    }
}
const replacementInput = {
    entityId: 4, language: 'en', editor: 'puck', generation: 0,
    expectedRevision: revisionOf(puck), idempotencyKey: 'replace', document: changedPuck
}
const replace = value => coordinateEditorRequest({
    pool: replacementPool, instance: replacementInstance,
    persistDocument: async () => {
    }, actor, input: value, action: 'replace'
})
assert.equal((await replace({ ...replacementInput, expectedRevision: 'stale' })).error.code, 'conflict')
const replaced = await replace(replacementInput)
assert.equal(replaced.ok, true)
assert.equal(replaced.data.generation, 1)
assert.equal(closed, true)
assert.equal(replacementDoc.mcpFenced, true)
assert.equal((await replace(replacementInput)).replayed, true)
const reloaded = new Y.Doc()
Y.applyUpdate(reloaded, replacementState)
assert.deepEqual(readPuckYjsDocument(reloaded), changedPuck)
assert.ok(replacementEvents.some(sql => sql.includes('FOR UPDATE')))
assert.ok(replacementEvents.indexOf('COMMIT') > replacementEvents.findIndex(sql => sql.startsWith('INSERT INTO "McpOperationReceipt"')))
console.log('Passed: replacement revision, exclusive row lease, durable generation, writer fencing, and replay')
replacementDoc.destroy()
reloaded.destroy()

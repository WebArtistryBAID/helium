const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createJiti } = require('jiti')

const root = path.resolve(__dirname, '..')
const jiti = createJiti(__filename, { alias: { '@': path.join(root, 'src') } })
const { entityRevision } = jiti('../src/app/lib/mcp/entity-revision.ts')

function harness() {
    const state = {
        entity: {
            id: 10, type: 'page', slug: 'about', updatedAt: new Date('2026-10-01T00:00:00Z'),
            lastPublishedAt: new Date('2026-09-01T00:00:00Z'),
            titleDraftEN: 'New title', titleDraftZH: '新标题',
            contentDraftEN: '{}', contentDraftZH: '{}'
        },
        writes: 0, receipt: null
    }
    const tx = {
        $queryRaw: async () => [],
        mcpOperationReceipt: {
            findUnique: async () => state.receipt,
            create: async ({ data }) => {
                state.receipt = data
            }
        },
        contentEntity: {
            findUnique: async () => state.entity,
            update: async ({ data }) => {
                state.writes++
                return state.entity = { ...state.entity, ...data }
            }
        },
        approvalConfig: { findUnique: async () => ({ minEditor: 1, minAdmin: 1 }) },
        approval: { groupBy: async () => [] },
        userAuditLog: { create: async () => ({}) }
    }
    const mocks = {
        'server-only': {},
        '@/generated/prisma/client': {
            EntityType: { page: 'page' }, Role: { admin: 'admin', editor: 'editor' },
            UserAuditLogType: { adminPublishEntity: 'adminPublishEntity' }
        },
        '@/app/lib/prisma': { prisma: { $transaction: async run => run(tx) } },
        '@/app/lib/services/actor': { requireActorUser: async () => ({ id: 1, name: 'Editor' }) },
        '@/app/lib/mcp/entity-revision': { entityRevision },
        '@/app/lib/mcp/contracts': { entityMutationSchema: { parse: input => input } },
        '@/app/lib/plate/plate-types': { hasPlateSuggestions: () => false },
        '@/app/studio/editor/entity-types': {
            AlignEntityResponse: {
                success: 'success', insufficientApprovals: 'insufficientApprovals'
            }
        },
        '@/app/lib/data-types': { getContentEntityURI: () => '/article' },
        '@/app/lib/metadata/website-metadata-types': { WEBSITE_METADATA_SLUG: '__website-metadata' },
        '@/app/lib/feishu/feishu-approval': {
            sendPublicationNotification: async () => {
            }
        }
    }
    const filename = path.join(root, 'src/app/lib/services/publication.ts')
    const compiled = jiti.transform({ source: fs.readFileSync(filename, 'utf8'), filename, ts: true })
    const exports = {}
    vm.runInNewContext(compiled, {
        exports, Date, console, process: { env: { HOST: 'https://school.example' } },
        require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name)
    }, { filename })
    return { state, publish: exports.publishDraft }
}

test('successful publication saves the current time, and an idempotent retry preserves it', async () => {
    const { state, publish } = harness()
    const input = { expectedRevision: entityRevision(state.entity), idempotencyKey: 'publication-check' }
    const before = Date.now()
    assert.equal((await publish({ source: 'studio' }, 10, input, true)).status, 'success')
    const timestamp = state.entity.lastPublishedAt.getTime()
    assert.ok(timestamp >= before && timestamp <= Date.now())
    assert.equal(state.entity.titlePublishedEN, 'New title')
    assert.equal(state.entity.titlePublishedZH, '新标题')
    assert.equal((await publish({ source: 'studio' }, 10, input, true)).replayed, true)
    assert.equal(state.entity.lastPublishedAt.getTime(), timestamp)
    assert.equal(state.writes, 1)
})

test('failed approval and revision checks preserve the publication date', async () => {
    const { state, publish } = harness()
    const timestamp = state.entity.lastPublishedAt.getTime()
    assert.equal((await publish({ source: 'studio' }, 10)).status, 'insufficientApprovals')
    assert.equal((await publish({ source: 'studio' }, 10, {
        expectedRevision: 'stale', idempotencyKey: 'conflict-check'
    }, true)).status, 'conflict')
    assert.equal(state.writes, 0)
    assert.equal(state.entity.lastPublishedAt.getTime(), timestamp)
})

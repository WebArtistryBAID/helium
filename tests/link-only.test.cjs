const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function loadActions() {
    const queries = []
    const rows = [
        { id: 1, slug: 'visible', linkOnly: false, type: 'post' },
        { id: 2, slug: 'hidden', linkOnly: true, type: 'post' }
    ]
    const matches = where => rows.filter(row =>
        (where.linkOnly === undefined || row.linkOnly === where.linkOnly) &&
        (where.id === undefined || typeof where.id === 'object' ?
            !where.id || where.id.in.includes(row.id) : row.id === where.id) &&
        (where.slug === undefined || row.slug === where.slug))
    const prisma = {
        contentEntity: {
            async findMany({ where }) { queries.push(where); return matches(where) },
            async count({ where }) { queries.push(where); return matches(where).length },
            async findFirst({ where }) { queries.push(where); return matches(where)[0] ?? null },
            async findUnique({ where }) { return matches(where)[0] ?? null }
        },
        async $queryRaw(strings) {
            const sql = strings.join('?')
            queries.push(sql)
            assert.match(sql, /ce\."linkOnly" = false/)
            return [{ id: 1, type: 'post', editor_count: 0, admin_count: 0, total: 1 }]
        }
    }
    const exports = {}
    vm.runInNewContext(ts.transpileModule(readFileSync('src/app/studio/editor/entity-actions.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText, {
        exports,
        require(name) {
            if (name.endsWith('/prisma')) return { prisma }
            if (name.endsWith('/client')) return { EntityType: { post: 'post' }, Role: { editor: 'editor', admin: 'admin' } }
            if (name.endsWith('/login-actions')) return { requireUser: async () => ({ roles: ['editor'] }) }
            if (name.endsWith('/approval-actions')) return { getThresholds: async () => ({ editor: 1 }) }
            return {}
        }
    })
    return { actions: exports, queries }
}

for (const [name, args] of [
    ['getRecentEntities', ['post']],
    ['getMyPendingApprovals', []],
    ['getAllPublishedCourses', []],
    ['getPublishedProjectsByCategory', [0, 'category']],
    ['getPublishedProjectsByCategoriesForInit', []],
    ['getAllPublishedContentEntities', []],
    ['getPublishedContentEntities', [0, 'post']],
    ['getPublishedContentEntities', [0, 'post', 'hidden']],
    ['getContentEntities', [0, 'post']],
    ['getContentEntities', [0, 'post', 'hidden']]
]) {
    test(`${name} (${args.join(', ')}) filters listings and counts`, async () => {
        const { actions, queries } = loadActions()
        await actions[name](...args)
        assert.ok(queries.length)
        for (const query of queries) {
            if (typeof query === 'object') assert.equal(query.linkOnly, false)
        }
    })
}

test('hidden entities remain available through direct public and editor lookups', async () => {
    const { actions } = loadActions()
    assert.equal((await actions.getContentEntityBySlug('hidden')).id, 2)
    assert.equal((await actions.getContentEntity(2)).id, 2)
    assert.equal(await actions.getPublishedContentEntity(2), null)
})

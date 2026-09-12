const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')
const ts = require('typescript')

async function load(relativePath, mocks, globals = {}) {
    const source = await fs.readFile(path.join(__dirname, '..', relativePath), 'utf8')
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
    } }).outputText, {
        exports, require: name => name in mocks ? mocks[name] : require(name),
        AbortController, AbortSignal, URL, setTimeout, clearTimeout, process,
        console: { log() {}, error() {} }, ...globals
    })
    return exports
}
const statuses = Object.fromEntries(['download', 'imageClassification', 'sanitization', 'translation', 'savingImages', 'creatingPost'].map(value => [value, value]))
const statusModule = { WeChatWorkerStatus: statuses }
const user = { id: 1, roles: ['writer'] }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

async function registryFixture() {
    const jobs = new Map()
    const registry = await load('src/app/lib/wechat-tasks.ts', {
        '@/generated/prisma/client': { Role: { admin: 'admin' } },
        '@/app/studio/editor/entity-types': statusModule,
        '@/app/lib/wechat-worker': { synchronizeWeChatArticle: async task => {
            const pending = deferred()
            const job = { task, pending, cleaned: false }
            jobs.set(task.id, job)
            task.cleanup = async () => { job.cleaned = true }
            task.controller.signal.addEventListener('abort', () => pending.reject(task.controller.signal.reason), { once: true })
            await pending.promise
        } }
    })
    return { registry, jobs }
}

test('simultaneous tasks have independent progress, persistent errors and removal after completion/cancellation', async () => {
    const { registry, jobs } = await registryFixture()
    const first = registry.startWeChatTask('https://mp.weixin.qq.com/s/first', null, user)
    const second = registry.startWeChatTask('https://mp.weixin.qq.com/s/second', null, user)
    jobs.get(first).task.startedAt = 10
    jobs.get(second).task.startedAt = 20
    jobs.get(first).task.title = '中文文章标题'
    jobs.get(first).task.status = 'translation'
    let listed = registry.listWeChatTasks(user)
    assert.equal(listed.length, 2)
    assert.equal(listed[0].id, second)
    assert.equal(listed[1].title, '中文文章标题')
    assert.equal(listed[0].status, 'download')
    await assert.rejects(registry.cancelWeChatTask(first, { id: 2, roles: ['writer'] }), /Unauthorized/)
    jobs.get(second).pending.reject(new Error('Feishu failed'))
    await jobs.get(second).task.done
    assert.equal(registry.listWeChatTasks(user)[0].status, 'error')
    assert.equal(registry.listWeChatTasks(user).length, 2)
    await registry.cancelWeChatTask(second, user)
    assert.equal(jobs.get(second).cleaned, true)
    jobs.get(first).pending.resolve()
    await jobs.get(first).task.done
    assert.equal(registry.listWeChatTasks(user).length, 0)
    const third = registry.startWeChatTask('https://mp.weixin.qq.com/s/third', null, user)
    await registry.cancelWeChatTask(third, { id: 3, roles: ['admin', 'writer'] })
    assert.equal(jobs.get(third).task.controller.signal.aborted, true)
    assert.equal(jobs.get(third).cleaned, true)
    assert.equal(registry.listWeChatTasks(user).length, 0)
    assert.throws(() => registry.startWeChatTask('https://example.com', null, user))
})

test('cleanup failures retain tasks and can be retried', async () => {
    const { registry, jobs } = await registryFixture()
    const id = registry.startWeChatTask('https://mp.weixin.qq.com/s/a', null, user)
    const job = jobs.get(id)
    let attempts = 0
    job.task.cleanup = async () => { if (++attempts === 1) throw new Error('busy file') }
    await assert.rejects(registry.cancelWeChatTask(id, user), /busy file/)
    assert.equal(registry.listWeChatTasks(user)[0].status, 'error')
    await registry.cancelWeChatTask(id, user)
    assert.equal(registry.listWeChatTasks(user).length, 0)
})

async function workerFixture(options = {}) {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'helium-sync-check-'))
    const upload = path.join(base, 'uploads')
    const rows = { images: [], posts: [], logs: [] }
    let sequence = 0, calls = 0
    const aiStarted = deferred()
    const downloadStarted = deferred()
    const clone = () => structuredClone(rows)
    const prisma = {
        image: {
            findUnique: async ({ where }) => rows.images.find(row => row.sha1 === where.sha1) ?? null,
            create: async ({ data }) => { const row = { ...data, id: ++sequence }; rows.images.push(row); return row },
            deleteMany: async ({ where }) => { rows.images = rows.images.filter(row => !where.id.in.includes(row.id)) }
        },
        contentEntity: {
            findUnique: async ({ where }) => rows.posts.find(row => row.slug === where.slug) ?? null,
            create: async ({ data }) => {
                if (options.failSave) throw new Error('save failed')
                const row = { ...data, id: ++sequence }; rows.posts.push(row); return row
            },
            deleteMany: async ({ where }) => { rows.posts = rows.posts.filter(row => row.id !== where.id) }
        },
        userAuditLog: { create: async ({ data }) => { rows.logs.push(data) } },
        $transaction: async fn => {
            const before = clone()
            try { return await fn(prisma) } catch (error) { Object.assign(rows, before); throw error }
        }
    }
    let queue = Promise.resolve()
    const locks = { withWeChatSaveLock: async fn => {
        const previous = queue
        let release
        queue = new Promise(resolve => { release = resolve })
        await previous
        try { return await fn() } finally { release() }
    } }
    const worker = await load('src/app/lib/wechat-worker.ts', {
        'node:os': { tmpdir: () => base },
        'node:child_process': { spawn: (_command, _args, { cwd, shell }) => {
            assert.equal(shell, false)
            downloadStarted.resolve()
            const child = new EventEmitter()
            let killed = false
            child.kill = () => {
                if (!killed) { killed = true; setImmediate(() => child.emit('close', 1)) }
                return true
            }
            setImmediate(async () => {
                if (options.holdDownload) return
                const folder = path.join(cwd, 'downloaded')
                await fs.mkdir(folder)
                await fs.writeFile(path.join(folder, 'article.md'), '# 中文文章标题\n正文\n![](photo.jpg)')
                await fs.writeFile(path.join(folder, 'photo.jpg'), 'image')
                child.emit('close', 0)
            })
            return child
        } },
        sharp: () => { const image = { webp: () => image, resize: () => image, toBuffer: async () => Buffer.from('webp'), metadata: async () => ({ width: 100, height: 100 }) }; return image },
        'pkg-up': { pkgUp: async () => path.join(base, 'package.json') },
        '@/generated/prisma/client': { EntityType: { post: 'post' }, UserAuditLogType: { uploadImage: 'uploadImage', writerCreateEntity: 'writerCreateEntity' } },
        '@/app/lib/prisma': { prisma },
        '@/app/lib/wechat-tasks': locks,
        '@/app/studio/editor/entity-types': statusModule,
        '@/app/lib/wechat-prompts': { SANITIZE_LITERAL: 'sanitize', TRANSLATE_LITERAL: 'translate', NOTIFICATION_LITERAL: '', ENGLISH_TRANSLATION_LITERAL: '' },
        '@/app/lib/feishu-aily': { callFeishuAily: async (prompt, signal) => {
            calls++
            aiStarted.resolve()
            if (options.holdAI || (options.holdFirstAI && calls === 1)) await new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => reject(signal.reason), { once: true })
                signal.throwIfAborted()
            })
            return prompt.startsWith('sanitize') ? JSON.stringify({ title: '中文文章标题', content: '![](photo.jpg)', date: '2026-09-12' })
                : JSON.stringify({ title: 'English Article', content: '![](photo.jpg)' })
        } }
    }, { process: { ...process, env: { ...process.env, UPLOAD_PATH: upload } }, fetch: async () => ({ ok: true, text: async () => 'keep' }) })
    const task = id => ({ id, userId: 1, controller: new AbortController(), status: 'download' })
    return { base, upload, rows, worker, task, aiStarted, downloadStarted, dispose: () => fs.rm(base, { recursive: true, force: true }) }
}

test('successful imports clean temporary downloads, reuse shared images and avoid duplicate slugs', async () => {
    const f = await workerFixture()
    try {
        const first = f.task('first'), second = f.task('second')
        await f.worker.synchronizeWeChatArticle(first, 'https://mp.weixin.qq.com/s/a', null, user)
        await f.worker.synchronizeWeChatArticle(second, 'https://mp.weixin.qq.com/s/b', null, user)
        assert.equal(f.rows.posts.length, 2)
        assert.notEqual(f.rows.posts[0].slug, f.rows.posts[1].slug)
        assert.equal(f.rows.images.length, 1)
        assert.equal((await fs.readdir(f.base)).includes('article-build-first'), false)
        assert.equal((await fs.readdir(f.upload)).length, 2)
        assert.match(f.rows.posts[0].contentDraftZH, /\[IMAGE: \d+\]/)
    } finally { await f.dispose() }
})

test('cancel during Feishu work aborts the request and removes downloaded files', async () => {
    const f = await workerFixture({ holdAI: true })
    try {
        const task = f.task('cancelled')
        const result = f.worker.synchronizeWeChatArticle(task, 'https://mp.weixin.qq.com/s/a', null, user)
        await f.aiStarted.promise
        task.controller.abort(new Error('cancelled'))
        await assert.rejects(result, /cancelled/)
        assert.equal(f.rows.posts.length, 0)
        assert.equal(f.rows.images.length, 0)
        assert.deepEqual(await fs.readdir(f.base), [])
    } finally { await f.dispose() }
})

test('a failed database save rolls back imported media and removes copied files', async () => {
    const f = await workerFixture({ failSave: true })
    try {
        await assert.rejects(f.worker.synchronizeWeChatArticle(f.task('failed'), 'https://mp.weixin.qq.com/s/a', null, user), /save failed/)
        assert.equal(f.rows.posts.length, 0)
        assert.equal(f.rows.images.length, 0)
        assert.equal(f.rows.logs.length, 0)
        assert.deepEqual(await fs.readdir(f.upload), [])
        assert.deepEqual(await fs.readdir(f.base), ['uploads'])
    } finally { await f.dispose() }
})


test('one import can complete while another awaits AI, and cancellation preserves shared media', async () => {
    const f = await workerFixture({ holdFirstAI: true })
    try {
        const first = f.task('waiting'), second = f.task('completed')
        const pending = f.worker.synchronizeWeChatArticle(first, 'https://mp.weixin.qq.com/s/a', null, user)
        await f.aiStarted.promise
        await f.worker.synchronizeWeChatArticle(second, 'https://mp.weixin.qq.com/s/b', null, user)
        assert.equal(f.rows.posts.length, 1)
        first.controller.abort(new Error('cancelled'))
        await assert.rejects(pending, /cancelled/)
        assert.equal(f.rows.posts.length, 1)
        assert.equal(f.rows.images.length, 1)
        assert.equal((await fs.readdir(f.upload)).length, 2)
    } finally { await f.dispose() }
})

test('cancelling the downloader waits for exit and deletes its directory', async () => {
    const f = await workerFixture({ holdDownload: true })
    try {
        const task = f.task('downloading')
        const pending = f.worker.synchronizeWeChatArticle(task, 'https://mp.weixin.qq.com/s/a', null, user)
        await f.downloadStarted.promise
        task.controller.abort(new Error('cancelled'))
        await assert.rejects(pending, /cancelled/)
        assert.deepEqual(await fs.readdir(f.base), [])
    } finally { await f.dispose() }
})

test('Feishu cancellation reaches token requests and polling waits', async () => {
    const entered = deferred()
    const controller = new AbortController()
    const env = { FEISHU_AI_CLIENT_ID: 'id', FEISHU_AI_CLIENT_SECRET: 'secret', FEISHU_AILY_AGENT_ID: 'agent' }
    const requests = []
    const api = await load('src/app/lib/feishu-aily.ts', {}, {
        process: { env }, fetch: async (url, init) => {
            requests.push({ url, init })
            if (url.includes('/chats')) entered.resolve()
            return { ok: true, json: async () => url.includes('/auth/') ? { code: 0, tenant_access_token: 'token' } : { code: 0, data: { agent_chat_id: 'chat' } } }
        }
    })
    const pending = api.callFeishuAily('content', controller.signal)
    await entered.promise
    controller.abort(new Error('cancelled'))
    await assert.rejects(pending, /cancelled/)
    assert.equal(requests.length, 2)
    for (const request of requests) assert.equal(request.init.signal, controller.signal)
})

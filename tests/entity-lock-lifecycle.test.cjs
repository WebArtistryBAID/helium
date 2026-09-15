const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function editorSession(sharedLock = { token: 'editor-token' }) {
    const listeners = new Map()
    const timers = new Map()
    const cleanups = []
    let lost = 0
    let releases = 0
    let nextTimer = 0
    const events = {
        addEventListener(name, fn) { listeners.set(name, fn) },
        removeEventListener(name) { listeners.delete(name) }
    }
    const actions = {
        async renewLock({ token }) { return sharedLock.token === token },
        async releaseLock({ token }) {
            releases++
            if (sharedLock.token === token) sharedLock.token = null
        }
    }
    const module = { exports: {} }
    vm.runInNewContext(ts.transpileModule(
        readFileSync('src/app/lib/lock/useEntityLock.ts', 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS } }
    ).outputText, {
        exports: module.exports,
        require(name) {
            if (name === 'react') return {
                useRef: value => ({ current: value }),
                useEffect: fn => cleanups.push(fn())
            }
            if (name.endsWith('/lock-actions')) return actions
            throw new Error(`Unexpected dependency: ${name}`)
        },
        window: events,
        document: events,
        navigator: { sendBeacon() { void actions.releaseLock({ token: 'editor-token' }) } },
        setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id },
        clearTimeout(id) { timers.delete(id) }
    })
    const mount = (hasChanges = false) => module.exports.useEntityLock({
        entityType: 'news', entityId: 1, token: 'editor-token', hasChanges,
        onLockLost() { lost++ }
    })
    return {
        mount,
        fire(name, event = {}) { listeners.get(name)?.(event) },
        unmount() { cleanups.splice(0).forEach(fn => fn()) },
        runReleaseTimers() {
            for (const [id, timer] of timers) {
                if (timer.delay === 1000) { timers.delete(id); timer.fn() }
            }
        },
        get lost() { return lost },
        get releases() { return releases }
    }
}

const settle = () => new Promise(resolve => setImmediate(resolve))

test('refresh preserves the lock even when the old page hides after the new heartbeat', async () => {
    const lock = { token: 'editor-token' }
    const oldPage = editorSession(lock)
    oldPage.mount()
    await settle()
    const refreshedPage = editorSession(lock)
    refreshedPage.mount()
    await settle()
    oldPage.fire('pagehide', { persisted: false })
    refreshedPage.fire('focus')
    await settle()
    assert.equal(lock.token, 'editor-token')
    assert.equal(refreshedPage.lost, 0)
    assert.equal(oldPage.releases, 0)
})

test('a genuine takeover still reports lock loss', async () => {
    const lock = { token: 'editor-token' }
    const page = editorSession(lock)
    page.mount()
    await settle()
    lock.token = 'replacement-token'
    page.fire('focus')
    await settle()
    assert.equal(page.lost, 1)
})

test('navigation releases the lock and immediate remount cancels release', async () => {
    const page = editorSession()
    page.mount()
    await settle()
    page.unmount()
    page.mount()
    page.runReleaseTimers()
    await settle()
    assert.equal(page.releases, 0)
    page.unmount()
    page.runReleaseTimers()
    await settle()
    assert.equal(page.releases, 1)
})

test('unsaved changes continue to request confirmation before leaving', () => {
    const page = editorSession()
    page.mount(true)
    let prevented = false
    page.fire('beforeunload', { preventDefault() { prevented = true } })
    assert.equal(prevented, true)
})

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import * as React from 'react'
import { Window } from 'happy-dom'
import * as Y from 'yjs'
import { initializePuckYjsDocument, readPuckYjsDocument, updatePuckYjsDocument } from '../src/app/lib/puck/puck-yjs.ts'

const window = new Window()
globalThis.window = window
globalThis.document = window.document
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = await import('react-dom/client')
const { act } = React
const frames = new Map()
let nextFrame = 0
window.requestAnimationFrame = callback => {
    frames.set(++nextFrame, callback)
    return nextFrame
}
window.cancelAnimationFrame = id => frames.delete(id)

const providers = []

class Provider {
    constructor(options) {
        this.options = options
        this.awareness = { clientID: 1, getStates: () => new Map() }
        providers.push(this)
    }

    setAwarenessField() {
    }

    destroy() {
        this.destroyed = true
    }

    sync(data) {
        if (data) initializePuckYjsDocument(this.options.document, data)
        this.isSynced = true
        this.options.onSynced({ state: true })
    }
}

class IndexeddbPersistence {
    destroy() {
        return Promise.resolve()
    }
}

let room = 'puck-page:9:en:g1'
const persistedProviders = []
const source = await readFile(new URL('../src/app/lib/puck/PuckCollaboration.tsx', import.meta.url), 'utf8')
const hookSource = source.slice(source.indexOf('export function usePuckCollaboration('), source.indexOf('export function PuckCollaborationBridge('))
const bindings = {
    ...Object.fromEntries([ 'useCallback', 'useEffect', 'useLayoutEffect', 'useMemo', 'useRef', 'useState' ].map(name => [ name, React[name] ])),
    Y,
    HocuspocusProvider: Provider,
    IndexeddbPersistence,
    useCollaborationRoom: () => room,
    persistCollaborationDocument: async provider => {
        persistedProviders.push(provider)
    },
    initializePuckYjsDocument,
    readPuckYjsDocument,
    updatePuckYjsDocument,
    synchronizePuck: (getPuck, data) => getPuck().dispatch({ type: 'setData', data }),
    cursorColor: () => 'red',
    createClientId: () => 'signal',
    process: { env: { NEXT_PUBLIC_HOCUSPOCUS_URL: 'ws://isolated.invalid' } },
    window,
    document: window.document
}
const usePuckCollaboration = new Function(...Object.keys(bindings),
    `${stripTypeScriptTypes(hookSource.replace('export function', 'function'))}; return usePuckCollaboration`
)(...Object.values(bindings))

const english = {
    root: { props: { title: 'About Us' } },
    content: [ { type: 'ParagraphConfig', props: { id: 'paragraph', text: 'English content' } } ]
}
const chinese = {
    root: { props: { title: '关于我们' } },
    content: [
        { type: 'ParagraphConfig', props: { id: 'paragraph', text: '立德树人根本任务' } },
        {
            type: 'GridConfig', props: {
                id: 'grid', children: [
                    { type: 'ImageConfig', props: { id: 'image', image: '1430' } }
                ]
            }
        }
    ]
}
const remoteEvents = []
let current

function Harness({ language, data, revision = '0' }) {
    current = usePuckCollaboration({
        enabled: true, entityId: 9, language, initialData: data, documentKey: revision,
        userId: '7', userName: 'Writer',
        onRemoteData: React.useCallback(data => remoteEvents.push({ language, data }), [ language ])
    })
    return null
}

const container = window.document.createElement('div')
window.document.body.append(container)
const root = createRoot(container)
const render = async (language, data, revision) => {
    await act(async () => root.render(React.createElement(Harness, { language, data, revision })))
    return current
}
const register = (collaboration, data) => {
    const api = {
        appState: { data }, dispatch: action => {
            api.appState.data = action.data
        }
    }
    collaboration.registerPuck(() => api)
    return api
}
const sync = async (provider, data) => act(async () => provider.sync(data))

const firstEnglish = await render('en', english)
const englishApi = register(firstEnglish, english)
const firstEnglishProvider = providers.at(-1)
await sync(firstEnglishProvider, english)
const englishFrame = frames.values().next().value
room = 'puck-page:9:zh:g1'
const firstChinese = await render('zh', chinese)
register(firstChinese, chinese)
const firstChineseProvider = providers.at(-1)
await sync(firstChineseProvider, chinese)

// An image resolver from the retired English Puck instance finishes after the switch.
firstEnglish.updateFromPuck({ ...english, root: { props: { title: 'Late English resolution' } } })
assert.deepEqual(readPuckYjsDocument(firstChineseProvider.options.document), chinese)
assert.equal(firstEnglish.isActive(), false)
assert.equal(firstChinese.isActive(), true)
console.log('Passed: delayed English updates preserve Chinese text and image grids')

const eventCount = remoteEvents.length
await act(async () => {
    englishFrame?.()
    firstEnglishProvider.options.onSynced({ state: true })
    firstEnglishProvider.options.onStatus({ status: 'disconnected' })
    firstEnglishProvider.options.onDisconnect()
})
assert.equal(remoteEvents.length, eventCount)
assert.equal(current.status, 'connected')
assert.deepEqual(englishApi.appState.data, english)
console.log('Passed: retired provider callbacks leave the active editor and connection status intact')

room = null
const pendingEnglish = await render('en', english)
register(pendingEnglish, english)
pendingEnglish.updateFromPuck(english)
assert.deepEqual(readPuckYjsDocument(firstChineseProvider.options.document), chinese)
room = 'puck-page:9:en:g1'
const secondEnglish = await render('en', english)
register(secondEnglish, english)
const secondEnglishProvider = providers.at(-1)
secondEnglish.updateFromPuck(english)
assert.equal(secondEnglishProvider.options.document.getMap('data').size, 0)
await sync(secondEnglishProvider)
assert.deepEqual(readPuckYjsDocument(secondEnglishProvider.options.document), english)
firstChinese.updateFromPuck(chinese)
firstEnglish.updateFromPuck(chinese)
pendingEnglish.updateFromPuck(chinese)
assert.deepEqual(readPuckYjsDocument(secondEnglishProvider.options.document), english)
console.log('Passed: rapid return to English rejects earlier sessions and waits for initial sync')

room = 'puck-page:9:zh:g1'
const emptyChinese = await render('zh', chinese)
register(emptyChinese, chinese)
const emptyChineseProvider = providers.at(-1)
await sync(emptyChineseProvider)
assert.deepEqual(readPuckYjsDocument(emptyChineseProvider.options.document), chinese)
console.log('Passed: an empty Chinese room initializes from the Chinese snapshot')

// The same language can be remounted after restoring a document or changing generation.
const revisedChinese = await render('zh', chinese, '1')
register(revisedChinese, chinese)
const revisedProvider = providers.at(-1)
await sync(revisedProvider, chinese)
emptyChinese.updateFromPuck(english)
emptyChinese.registerPuck(null)
assert.deepEqual(readPuckYjsDocument(revisedProvider.options.document), chinese)
await assert.rejects(emptyChinese.persist(), /Collaboration/)
await revisedChinese.persist()
assert.equal(persistedProviders.at(-1), revisedProvider)
room = 'puck-page:9:zh:g2'
const nextGeneration = await render('zh', chinese, '1')
register(nextGeneration, chinese)
const generationProvider = providers.at(-1)
await sync(generationProvider, chinese)
revisedChinese.updateFromPuck(english)
assert.deepEqual(readPuckYjsDocument(generationProvider.options.document), chinese)
console.log('Passed: restored documents, room generations, registration cleanup, and save callbacks remain isolated')

const editedChinese = structuredClone(chinese)
editedChinese.content[0].props.text = '立德树人根本任务，继续编辑。'
nextGeneration.updateFromPuck(editedChinese)
assert.deepEqual(readPuckYjsDocument(generationProvider.options.document), editedChinese)
assert.deepEqual(readPuckYjsDocument(secondEnglishProvider.options.document), english)
console.log('Passed: current edits still update their own language document')

await act(async () => root.unmount())
nextGeneration.updateFromPuck(english)
assert.deepEqual(readPuckYjsDocument(generationProvider.options.document), editedChinese)
assert.equal(frames.size, 0)
for (const provider of providers) provider.options.document.destroy()
await window.happyDOM.close()

'use client'

import { HocuspocusProvider } from '@hocuspocus/provider'
import type { ComponentData, Data, PuckAction } from '@puckeditor/core'
import { useGetPuck } from '@puckeditor/core'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import {
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from 'react'
import { createPortal } from 'react-dom'
import { initializePuckYjsDocument, readPuckYjsDocument, updatePuckYjsDocument } from './puck-yjs'

export type PuckCollaborator = {
    clientId: number
    color: string
    name: string
    userId: string
}

type RemoteCursor = PuckCollaborator & {
    anchorId: string | null
    x: number
    y: number
}

type SharedCursorPosition = Pick<RemoteCursor, 'anchorId' | 'x' | 'y'>
type PuckItemSelector = { index: number, zone: string }

type PuckApiLike = {
    appState: {
        data: Data
        ui: { itemSelector: PuckItemSelector | null }
    }
    dispatch: (action: PuckAction) => void
    getSelectorForId: (id: string) => PuckItemSelector | undefined
    selectedItem: ComponentData | null
}

type GetPuck = () => PuckApiLike
type ConnectionStatus = 'connected' | 'joining' | 'offline'

const ROOT_ZONE = 'root:default-zone'

function cursorColor(userId: string): string {
    const hash = Array.from(userId).reduce(
        (value, character) => Math.imul(value ^ character.charCodeAt(0), 16_777_619) >>> 0,
        2_166_136_261
    )
    return `hsl(${hash % 360} 72% 45%)`
}

function componentId(component: ComponentData): string {
    return String(component.props.id)
}

function isComponentArray(value: unknown): value is ComponentData[] {
    return Array.isArray(value) && value.every(item => item != null && typeof item === 'object' &&
        'type' in item && typeof item.type === 'string' && 'props' in item && item.props != null &&
        typeof item.props === 'object' && 'id' in item.props && typeof item.props.id === 'string')
}

function collectZones(data: Data): Map<string, ComponentData[]> {
    const zones = new Map<string, ComponentData[]>([[ ROOT_ZONE, data.content ?? [] ]])
    if (data.zones != null) {
        for (const [ zone, content ] of Object.entries(data.zones)) zones.set(zone, content)
    }

    const visit = (components: ComponentData[]) => {
        for (const component of components) {
            for (const [ prop, value ] of Object.entries(component.props)) {
                if (!isComponentArray(value)) continue
                const zone = `${componentId(component)}:${prop}`
                zones.set(zone, value)
                visit(value)
            }
        }
    }
    visit(data.content ?? [])
    for (const content of Object.values(data.zones ?? {})) visit(content)
    return zones
}

function collectComponents(zones: Map<string, ComponentData[]>): Map<string, ComponentData> {
    const components = new Map<string, ComponentData>()
    for (const content of zones.values()) {
        for (const component of content) components.set(componentId(component), component)
    }
    return components
}

function equalJson(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right)
}

function componentWithCurrentSlots(current: ComponentData | undefined, target: ComponentData): ComponentData {
    if (current == null) return target
    const props = { ...target.props }
    for (const [ key, value ] of Object.entries(target.props)) {
        if (isComponentArray(value) && isComponentArray(current.props[key])) props[key] = current.props[key]
    }
    return { ...target, props }
}

function synchronizePuck(getPuck: GetPuck, target: Data) {
    let api = getPuck()
    const selectedComponentId = api.selectedItem == null ? null : componentId(api.selectedItem)
    if (!equalJson(api.appState.data.root, target.root)) {
        api.dispatch({ type: 'replaceRoot', root: target.root, recordHistory: false })
    }

    const targetZones = collectZones(target)
    const targetComponents = collectComponents(targetZones)
    const currentZones = collectZones(api.appState.data)
    const currentComponents = collectComponents(currentZones)

    for (const id of currentComponents.keys()) {
        if (targetComponents.has(id)) continue
        api = getPuck()
        const selector = api.getSelectorForId(id)
        if (selector?.zone != null) {
            api.dispatch({ type: 'remove', index: selector.index, zone: selector.zone, recordHistory: false })
        }
    }

    const orderedZones = Array.from(targetZones.entries()).sort(([ left ], [ right ]) => {
        if (left === ROOT_ZONE) return -1
        if (right === ROOT_ZONE) return 1
        return left.localeCompare(right)
    })
    for (const [ zone, components ] of orderedZones) {
        for (let index = 0; index < components.length; index++) {
            const component = components[index]
            const id = componentId(component)
            api = getPuck()
            let selector = api.getSelectorForId(id)
            if (selector == null) {
                api.dispatch({
                    type: 'insert',
                    componentType: component.type,
                    destinationIndex: index,
                    destinationZone: zone,
                    id,
                    recordHistory: false
                })
                api = getPuck()
                selector = api.getSelectorForId(id)
            } else if (selector.zone != null && (selector.zone !== zone || selector.index !== index)) {
                api.dispatch({
                    type: 'move',
                    sourceIndex: selector.index,
                    sourceZone: selector.zone,
                    destinationIndex: index,
                    destinationZone: zone,
                    recordHistory: false
                })
                api = getPuck()
                selector = api.getSelectorForId(id)
            }

            const current = collectComponents(collectZones(api.appState.data)).get(id)
            const replacement = componentWithCurrentSlots(current, component)
            if (selector?.zone != null && !equalJson(current, replacement)) {
                api.dispatch({
                    type: 'replace',
                    data: replacement,
                    destinationIndex: selector.index,
                    destinationZone: selector.zone,
                    recordHistory: false
                })
            }
        }
    }

    if (selectedComponentId != null) {
        api = getPuck()
        const itemSelector = api.getSelectorForId(selectedComponentId)
        if (itemSelector != null && !equalJson(api.appState.ui.itemSelector, itemSelector)) {
            api.dispatch({ type: 'setUi', ui: { itemSelector } })
        }
    }
}

export function usePuckCollaboration({
                                         enabled,
                                         entityId,
                                         initialData,
                                         language,
                                         userId,
                                         userName,
                                         onCommentsChanged,
                                         onRemoteData
                                     }: {
    enabled: boolean
    entityId: number
    initialData: Data
    language: 'en' | 'zh'
    userId: string
    userName: string
    onCommentsChanged?: () => void | Promise<void>
    onRemoteData: (data: Data) => void
}) {
    const [ status, setStatus ] = useState<ConnectionStatus>(enabled ? 'joining' : 'offline')
    const [ collaborators, setCollaborators ] = useState<PuckCollaborator[]>([])
    const [ remoteCursors, setRemoteCursors ] = useState<RemoteCursor[]>([])
    const getPuckRef = useRef<GetPuck | null>(null)
    const docRef = useRef<Y.Doc | null>(null)
    const providerRef = useRef<HocuspocusProvider | null>(null)
    const localOrigin = useRef({ source: 'puck' })
    const commentOrigin = useRef({ source: 'puck-comments' })
    const applyingRemote = useRef(false)
    const initialDataRef = useRef(initialData)
    const onCommentsChangedRef = useRef(onCommentsChanged)
    const onRemoteDataRef = useRef(onRemoteData)
    onCommentsChangedRef.current = onCommentsChanged
    onRemoteDataRef.current = onRemoteData

    const publishAwareness = useCallback(() => {
        const awareness = providerRef.current?.awareness
        if (awareness == null) return
        const users: PuckCollaborator[] = []
        const cursors: RemoteCursor[] = []
        for (const [ clientId, state ] of awareness.getStates()) {
            const user = state.user as Partial<PuckCollaborator> | undefined
            if (typeof user?.name !== 'string' || typeof user.userId !== 'string' || typeof user.color !== 'string') continue
            const collaborator = { clientId, color: user.color, name: user.name, userId: user.userId }
            users.push(collaborator)
            const cursor = state.cursor as { anchorId?: unknown, x?: unknown, y?: unknown } | null | undefined
            if (clientId !== awareness.clientID && typeof cursor?.x === 'number' && typeof cursor.y === 'number' &&
                (cursor.anchorId == null || typeof cursor.anchorId === 'string')) {
                cursors.push({ ...collaborator, anchorId: cursor.anchorId ?? null, x: cursor.x, y: cursor.y })
            }
        }
        setCollaborators(users.sort((left, right) => left.clientId - right.clientId))
        setRemoteCursors(cursors)
    }, [])

    const applyRemoteDocument = useCallback(() => {
        const document = docRef.current
        const getPuck = getPuckRef.current
        if (document == null || getPuck == null || document.getMap('data').size === 0) return
        const data = readPuckYjsDocument(document)
        applyingRemote.current = true
        try {
            synchronizePuck(getPuck, data)
            onRemoteDataRef.current(data)
        } finally {
            applyingRemote.current = false
        }
    }, [])

    useEffect(() => {
        if (!enabled) return
        const url = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL
        if (url == null || url.length === 0) return

        const room = `puck-page:${entityId}:${language}`
        const document = new Y.Doc()
        const indexeddb = new IndexeddbPersistence(`helium:${room}`, document)
        docRef.current = document
        setStatus('joining')

        let remoteFrame = 0
        const commentSignals = document.getMap('commentSignals')
        const refreshComments = (_event: Y.YMapEvent<unknown>, transaction: Y.Transaction) => {
            if (transaction.origin === commentOrigin.current) return
            void onCommentsChangedRef.current?.()
        }
        commentSignals.observe(refreshComments)
        const scheduleRemote = (transaction: Y.Transaction) => {
            if (transaction.origin === localOrigin.current || transaction.origin === commentOrigin.current) return
            window.cancelAnimationFrame(remoteFrame)
            remoteFrame = window.requestAnimationFrame(applyRemoteDocument)
        }
        document.on('afterTransaction', scheduleRemote)

        const provider = new HocuspocusProvider({
            name: room,
            url,
            document,
            token: async () => {
                const query = new URLSearchParams({ entityId: String(entityId), kind: 'puck', language })
                const response = await fetch(`/api/collaboration/token?${query}`)
                if (!response.ok) throw new Error('Unable to authorize Puck collaboration')
                const result = await response.json() as { token?: string }
                if (result.token == null) throw new Error('Puck collaboration token is missing')
                return result.token
            },
            onStatus: ({ status: nextStatus }) => setStatus(nextStatus === 'connected' ? 'joining' : 'offline'),
            onSynced: () => {
                if (document.getMap('data').size === 0) initializePuckYjsDocument(document, initialDataRef.current)
                setStatus('connected')
                applyRemoteDocument()
            },
            onDisconnect: () => setStatus('offline'),
            onAwarenessChange: publishAwareness
        })
        providerRef.current = provider
        provider.setAwarenessField('user', {
            color: cursorColor(userId),
            name: userName,
            userId
        })
        publishAwareness()

        const handleOffline = () => setStatus('offline')
        const handleOnline = () => setStatus('joining')
        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)
        return () => {
            window.cancelAnimationFrame(remoteFrame)
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
            commentSignals.unobserve(refreshComments)
            document.off('afterTransaction', scheduleRemote)
            provider.destroy()
            void indexeddb.destroy()
            providerRef.current = null
            docRef.current = null
            getPuckRef.current = null
            setCollaborators([])
            setRemoteCursors([])
        }
    }, [ applyRemoteDocument, enabled, entityId, language, publishAwareness, userId, userName ])

    const registerPuck = useCallback((getPuck: GetPuck | null) => {
        getPuckRef.current = getPuck
        if (getPuck != null) applyRemoteDocument()
    }, [ applyRemoteDocument ])

    const updateFromPuck = useCallback((data: Data) => {
        if (applyingRemote.current) return
        const document = docRef.current
        if (document != null) updatePuckYjsDocument(document, data, localOrigin.current)
    }, [])

    const updateCursor = useCallback((position: SharedCursorPosition) => {
        providerRef.current?.setAwarenessField('cursor', position)
    }, [])
    const signalCommentsChanged = useCallback(() => {
        const document = docRef.current
        if (document == null) return
        document.transact(() => {
            document.getMap('commentSignals').set('revision', `${userId}:${crypto.randomUUID()}`)
        }, commentOrigin.current)
    }, [ userId ])
    const clearCursor = useCallback(() => providerRef.current?.setAwarenessField('cursor', null), [])
    useEffect(() => {
        if (!enabled) return
        const clearWhenHidden = () => {
            if (document.visibilityState === 'hidden') clearCursor()
        }
        window.addEventListener('blur', clearCursor)
        window.addEventListener('pagehide', clearCursor)
        document.addEventListener('visibilitychange', clearWhenHidden)
        return () => {
            window.removeEventListener('blur', clearCursor)
            window.removeEventListener('pagehide', clearCursor)
            document.removeEventListener('visibilitychange', clearWhenHidden)
        }
    }, [ clearCursor, enabled ])

    return {
        clearCursor,
        collaborators,
        registerPuck,
        remoteCursors,
        signalCommentsChanged,
        status,
        updateCursor,
        updateFromPuck
    }
}

export function PuckCollaborationBridge({ register }: { register: (getPuck: GetPuck | null) => void }) {
    const getPuck = useGetPuck() as unknown as GetPuck
    useEffect(() => {
        register(getPuck)
        return () => register(null)
    }, [ getPuck, register ])
    return null
}

function CollaboratorAvatar({ collaborator }: { collaborator: PuckCollaborator }) {
    const avatar = useRef<HTMLSpanElement>(null)
    const [ open, setOpen ] = useState(false)
    const [ position, setPosition ] = useState({ left: 0, top: 0 })

    useLayoutEffect(() => {
        if (!open) return
        const updatePosition = () => {
            const rect = avatar.current?.getBoundingClientRect()
            if (rect != null) setPosition({ left: rect.left, top: rect.bottom + 8 })
        }
        updatePosition()
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [ open ])

    return <span className="relative flex h-8 items-center" onMouseEnter={() => setOpen(true)}
                 onMouseLeave={() => setOpen(false)}>
        <span ref={avatar} tabIndex={0} aria-label={collaborator.name}
              onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-white"
              style={{ backgroundColor: collaborator.color }}>
            {Array.from(collaborator.name)[0]}
        </span>
        {open && createPortal(<span role="tooltip"
                                    className="fixed z-[9999] whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                                    style={{ left: position.left, top: position.top }}>
            {collaborator.name}
        </span>, document.body)}
    </span>
}

export function PuckCollaboratorsPortal({ collaborators }: { collaborators: PuckCollaborator[] }) {
    const [ target, setTarget ] = useState<Element | null>(null)
    useLayoutEffect(() => {
        setTarget(document.querySelector('.page-editor [class*="_PuckHeader-toggle_"]'))
    }, [])
    useLayoutEffect(() => {
        if (!(target instanceof HTMLElement) || collaborators.length === 0) return
        const previous = {
            alignItems: target.style.alignItems,
            alignSelf: target.style.alignSelf,
            paddingTop: target.style.paddingTop
        }
        target.style.alignItems = 'center'
        target.style.alignSelf = 'center'
        target.style.paddingTop = '0px'
        return () => {
            target.style.alignItems = previous.alignItems
            target.style.alignSelf = previous.alignSelf
            target.style.paddingTop = previous.paddingTop
        }
    }, [ collaborators.length, target ])
    if (target == null || collaborators.length === 0) return null

    return createPortal(<div className="ml-2 flex h-8 self-center items-center -space-x-2 pl-1"
                             aria-label="当前协作用户">
        {collaborators.map(collaborator => <CollaboratorAvatar key={collaborator.clientId}
                                                               collaborator={collaborator}/>)}
    </div>, target)
}

export function PuckCollaborativePreview({ children, cursors, onCursorLeave, onCursorMove }: {
    children?: ReactNode
    cursors: RemoteCursor[]
    onCursorLeave: () => void
    onCursorMove: (position: SharedCursorPosition) => void
}) {
    const container = useRef<HTMLDivElement>(null)
    const frame = useRef(0)
    const [ positions, setPositions ] = useState<Array<RemoteCursor & { left: number, top: number }>>([])

    const updatePositions = useCallback(() => {
        const containerElement = container.current
        if (containerElement == null) return
        const containerRect = containerElement.getBoundingClientRect()
        const containerScaleX = containerElement.clientWidth > 0 ? containerRect.width / containerElement.clientWidth : 1
        const containerScaleY = containerElement.clientHeight > 0 ? containerRect.height / containerElement.clientHeight : 1
        const iframe = containerElement.querySelector('iframe')
        const iframeDocument = iframe?.contentDocument
        const iframeRect = iframe?.getBoundingClientRect()
        const scaleX = iframe != null && iframeRect != null && iframe.clientWidth > 0
            ? iframeRect.width / iframe.clientWidth
            : 1
        const scaleY = iframe != null && iframeRect != null && iframe.clientHeight > 0
            ? iframeRect.height / iframe.clientHeight
            : 1

        setPositions(cursors.flatMap(cursor => {
            const selector = cursor.anchorId == null
                ? '[data-puck-entry]'
                : `[data-puck-component="${CSS.escape(cursor.anchorId)}"]`
            const anchor = (iframeDocument?.querySelector(selector) ?? containerElement.querySelector(selector)) as
                HTMLElement | null
            if (anchor == null) return []
            const rect = anchor.getBoundingClientRect()
            const clientLeft = iframeRect == null
                ? rect.left + rect.width * cursor.x
                : iframeRect.left + (rect.left + rect.width * cursor.x) * scaleX
            const clientTop = iframeRect == null
                ? rect.top + rect.height * cursor.y
                : iframeRect.top + (rect.top + rect.height * cursor.y) * scaleY
            const visibleRect = iframeRect ?? containerRect
            if (clientLeft < visibleRect.left || clientLeft > visibleRect.right ||
                clientTop < visibleRect.top || clientTop > visibleRect.bottom) return []
            return [ {
                ...cursor,
                left: (clientLeft - containerRect.left) / containerScaleX,
                top: (clientTop - containerRect.top) / containerScaleY
            } ]
        }))
    }, [ cursors ])

    useLayoutEffect(() => {
        const containerElement = container.current
        if (containerElement == null) return
        const iframe = containerElement.querySelector('iframe')
        const iframeWindow = iframe?.contentWindow
        updatePositions()
        window.addEventListener('resize', updatePositions)
        window.addEventListener('scroll', updatePositions, true)
        iframeWindow?.addEventListener('resize', updatePositions)
        iframeWindow?.addEventListener('scroll', updatePositions, true)
        const observer = new ResizeObserver(updatePositions)
        observer.observe(containerElement)
        if (iframe != null) observer.observe(iframe)
        return () => {
            window.removeEventListener('resize', updatePositions)
            window.removeEventListener('scroll', updatePositions, true)
            iframeWindow?.removeEventListener('resize', updatePositions)
            iframeWindow?.removeEventListener('scroll', updatePositions, true)
            observer.disconnect()
        }
    }, [ updatePositions ])

    const move = (event: ReactPointerEvent<HTMLDivElement>) => {
        const nativeEvent = event.nativeEvent as PointerEvent & { originalTarget?: EventTarget | null }
        const originalTarget = nativeEvent.originalTarget
        const target = originalTarget != null && typeof originalTarget === 'object' && 'closest' in originalTarget
            ? originalTarget as Element
            : event.target as Element
        const ownerDocument = target.ownerDocument
        const anchor = (target.closest('[data-puck-component]') ?? ownerDocument.querySelector('[data-puck-entry]')) as
            HTMLElement | null
        if (anchor == null) return
        const rect = anchor.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (nativeEvent.clientX - rect.left) / Math.max(rect.width, 1)))
        const y = Math.max(0, Math.min(1, (nativeEvent.clientY - rect.top) / Math.max(rect.height, 1)))
        const anchorId = anchor.getAttribute('data-puck-component')
        window.cancelAnimationFrame(frame.current)
        frame.current = window.requestAnimationFrame(() => onCursorMove({ anchorId, x, y }))
    }
    useEffect(() => () => window.cancelAnimationFrame(frame.current), [])

    return <div ref={container} className="relative h-full" onPointerMove={move} onPointerLeave={onCursorLeave}>
        {children}
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden="true">
            {positions.map(cursor => <div key={cursor.clientId} className="absolute"
                                                 style={{ left: cursor.left, top: cursor.top }}>
                <svg width="18" height="24" viewBox="0 0 18 24" className="drop-shadow-sm"
                     style={{ color: cursor.color }}>
                    <path d="M2 1.5v17l4.5-4 3.2 7 3-1.4-3.2-6.8H16L2 1.5Z" fill="currentColor"
                          stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                <span className="absolute bottom-full left-3 mb-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: cursor.color }}>{cursor.name}</span>
            </div>)}
        </div>
    </div>
}

export function collaborationStatusLabel(status: ConnectionStatus): string {
    if (status === 'connected') return '实时协作已连接'
    if (status === 'joining') return '正在连接实时协作'
    return '实时协作已离线，修改保存在本机'
}

export async function replacePuckCollaborationDocument({ data, entityId, language }: {
    data: Data
    entityId: number
    language: 'en' | 'zh'
}) {
    const url = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL
    if (url == null || url.length === 0) throw new Error('Puck collaboration URL is missing')
    const document = new Y.Doc()
    const room = `puck-page:${entityId}:${language}`
    let resolveSynced: () => void = () => undefined
    let rejectSynced: (error: Error) => void = () => undefined
    let resolvePersisted: () => void = () => undefined
    const synced = new Promise<void>((resolve, reject) => {
        resolveSynced = resolve
        rejectSynced = reject
    })
    const persisted = new Promise<void>(resolve => {
        resolvePersisted = resolve
    })
    const provider = new HocuspocusProvider({
        name: room,
        url,
        document,
        token: async () => {
            const query = new URLSearchParams({ entityId: String(entityId), kind: 'puck', language })
            const response = await fetch(`/api/collaboration/token?${query}`)
            if (!response.ok) throw new Error('Unable to authorize Puck collaboration')
            const result = await response.json() as { token?: string }
            if (result.token == null) throw new Error('Puck collaboration token is missing')
            return result.token
        },
        onSynced: () => resolveSynced(),
        onAuthenticationFailed: () => rejectSynced(new Error('Puck collaboration authorization failed')),
        onUnsyncedChanges: ({ number }) => {
            if (number === 0) resolvePersisted()
        }
    })
    try {
        await synced
        updatePuckYjsDocument(document, data, 'puck-replace-document')
        if (!provider.hasUnsyncedChanges) resolvePersisted()
        await Promise.race([
            persisted,
            new Promise<never>((_, reject) => window.setTimeout(
                () => reject(new Error('Timed out while saving collaborative Puck content')),
                10_000
            ))
        ])
    } finally {
        provider.destroy()
        document.destroy()
    }
}

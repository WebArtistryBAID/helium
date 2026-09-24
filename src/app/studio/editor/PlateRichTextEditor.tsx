'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plate, PlateContent, type PlateEditor, usePlateEditor } from 'platejs/react'
import { KEYS, RangeApi, TextApi, type TRange } from 'platejs'
import { MarkdownPlugin } from '@platejs/markdown'
import { getCommentKey, getDraftCommentKey } from '@platejs/comment'
import { CommentPlugin } from '@platejs/comment/react'
import { TextAlignPlugin } from '@platejs/basic-styles/react'
import { SuggestionPlugin } from '@platejs/suggestion/react'
import { acceptSuggestion, rejectSuggestion } from '@platejs/suggestion'
import { YjsPlugin } from '@platejs/yjs/react'
import { CursorEditor, relativeRangeToSlateRange, type CursorState } from '@slate-yjs/core'
import { toggleBulletedList, toggleNumberedList } from '@platejs/list-classic'
import { upsertLink } from '@platejs/link'
import type { Image } from '@/generated/prisma/browser'
import { Button, Dropdown, DropdownItem, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from 'flowbite-react'
import {
    HiBars3,
    HiBars3BottomLeft,
    HiBars3BottomRight,
    HiBars3CenterLeft,
    HiBold,
    HiChatBubbleLeftRight,
    HiH1,
    HiH2,
    HiH3,
    HiItalic,
    HiLightBulb,
    HiLink,
    HiListBullet,
    HiNumberedList,
    HiPencilSquare,
    HiPhoto,
    HiStrikethrough,
    HiUnderline
} from 'react-icons/hi2'
import { HELIUM_PLATE_EDITOR_PLUGINS } from '@/app/lib/plate/plate-editor-config'
import {
    EMPTY_PLATE_VALUE,
    extractContentImageIds,
    type HeliumPlateValue,
    isPlateValue,
    serializePlateValue
} from '@/app/lib/plate/plate-types'
import { PlateCommentProvider, PlateMediaProvider, PlateSuggestionProvider } from '@/app/lib/plate/plate-elements'
import MediaPicker from '@/app/studio/media/MediaPicker'
import PlateCommentsPanel from '@/app/studio/editor/PlateCommentsPanel'
import PlateSuggestionsPanel from '@/app/studio/editor/PlateSuggestionsPanel'
import type { PuckCommentThread } from '@/app/lib/puck/puck-comment-types'
import { collectPlateSuggestions, rejectAllPlateSuggestions } from '@/app/lib/plate/plate-suggestions'

type CollaborationConfig = {
    entityId: number
    language: 'en' | 'zh'
}

export type PlateCollaborator = {
    clientId: number
    color: string
    name: string
    userId: string
}

type CursorData = {
    color: string
    name: string
    userId: string
}

type RemoteCursorPosition = CursorData & {
    caret: { height: number, left: number, top: number } | null
    clientId: number
    selections: { height: number, left: number, top: number, width: number }[]
}

type AwarenessLike = {
    getStates: () => Map<number, Record<string, unknown>>
    on: (event: 'change', listener: () => void) => void
    off: (event: 'change', listener: () => void) => void
}

type CollaborationStatus = 'connected' | 'joining' | 'offline'

type YjsProviderState = {
    isConnected: boolean
    isSynced: boolean
    type: string
}

function cursorColor(userId: string): string {
    const hash = Array.from(userId).reduce(
        (value, character) => Math.imul(value ^ character.charCodeAt(0), 16_777_619) >>> 0,
        2_166_136_261
    )
    return `hsl(${hash % 360} 72% 45%)`
}

function RemoteCursorOverlay({ editor, container, revision }: {
    editor: PlateEditor
    container: React.RefObject<HTMLDivElement | null>
    revision: number
}) {
    const [ positions, setPositions ] = useState<RemoteCursorPosition[]>([])
    const collaborativeEditor = editor as PlateEditor & CursorEditor<CursorData>

    const updatePositions = useCallback(() => {
        const containerElement = container.current
        if (containerElement == null || !CursorEditor.isCursorEditor(collaborativeEditor)) {
            setPositions([])
            return
        }
        const containerRect = containerElement.getBoundingClientRect()
        const next = Object.entries(CursorEditor.cursorStates(collaborativeEditor)).flatMap(([ id, state ]) => {
            const cursorState = state as CursorState<CursorData>
            if (cursorState.relativeSelection == null || cursorState.data == null) return []
            const range = relativeRangeToSlateRange(
                collaborativeEditor.sharedRoot,
                collaborativeEditor,
                cursorState.relativeSelection
            )
            if (range == null) return []
            const domRange = editor.api.toDOMRange(range as TRange)
            if (domRange == null) return []
            const rectangles = Array.from(domRange.getClientRects())
                .filter(rectangle => rectangle.width > 0 || rectangle.height > 0)
            const finalRectangle = rectangles.at(-1) ?? domRange.getBoundingClientRect()
            return [ {
                clientId: Number(id),
                ...cursorState.data,
                caret: finalRectangle.height > 0 ? {
                    height: finalRectangle.height,
                    left: finalRectangle.right - containerRect.left,
                    top: finalRectangle.top - containerRect.top
                } : null,
                selections: rectangles.map(rectangle => ({
                    height: rectangle.height,
                    left: rectangle.left - containerRect.left,
                    top: rectangle.top - containerRect.top,
                    width: rectangle.width
                }))
            } ]
        })
        setPositions(next)
    }, [ collaborativeEditor, container, editor ])

    useEffect(() => {
        if (!CursorEditor.isCursorEditor(collaborativeEditor)) return
        CursorEditor.on(collaborativeEditor, 'change', updatePositions)
        window.addEventListener('resize', updatePositions)
        container.current?.addEventListener('scroll', updatePositions, true)
        return () => {
            CursorEditor.off(collaborativeEditor, 'change', updatePositions)
            window.removeEventListener('resize', updatePositions)
            container.current?.removeEventListener('scroll', updatePositions, true)
        }
    }, [ collaborativeEditor, container, updatePositions ])

    useLayoutEffect(() => updatePositions(), [ revision, updatePositions ])

    return <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
        {positions.map(position => <div key={position.clientId}>
            {position.selections.map((selection, index) => <span key={index} className="absolute rounded-sm"
                                                                 style={{
                                                                     backgroundColor: position.color,
                                                                     height: selection.height,
                                                                     left: selection.left,
                                                                     opacity: 0.2,
                                                                     top: selection.top,
                                                                     width: selection.width
                                                                 }}/>)}
            {position.caret != null && <>
                <span className="absolute w-0.5" style={{
                    backgroundColor: position.color,
                    height: position.caret.height,
                    left: position.caret.left,
                    top: position.caret.top
                }}/>
                <span
                    className="absolute max-w-40 -translate-y-full truncate rounded-lg px-2 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: position.color, left: position.caret.left, top: position.caret.top }}>
                    {position.name}
                </span>
            </>}
        </div>)}
    </div>
}

function convertLegacyImagePlaceholders(value: HeliumPlateValue): HeliumPlateValue {
    return value.map(node => {
        const text = node.children.length === 1 && 'text' in node.children[0] ? node.children[0].text : null
        const match = typeof text === 'string' ? text.match(/^\s*\[IMAGE:\s*(\d+)\s*]\s*$/) : null
        if (match) {
            return {
                type: KEYS.img,
                imageId: Number(match[1]),
                url: '',
                children: [ { text: '' } ]
            }
        }
        return node
    }) as HeliumPlateValue
}

function getInitialValue(content: string, editor: PlateEditor): {
    converted: boolean
    value: HeliumPlateValue
} {
    try {
        const parsed: unknown = JSON.parse(content)
        if (isPlateValue(parsed)) return { converted: false, value: parsed }
    } catch {
        // Existing content is converted from Markdown below.
    }

    if (content.trim().length === 0) {
        return { converted: true, value: structuredClone(EMPTY_PLATE_VALUE) }
    }
    return {
        converted: true,
        value: convertLegacyImagePlaceholders(
            editor.getApi(MarkdownPlugin).markdown.deserialize(content) as HeliumPlateValue
        )
    }
}

function QuotationMarksIcon() {
    return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path
            d="M5.4 6.5A3.4 3.4 0 0 0 2 9.9v1.7A3.4 3.4 0 0 0 5.4 15H7l-1.7 3.4h3.1l2.2-4.5V9.9a3.4 3.4 0 0 0-3.4-3.4H5.4Zm10.4 0a3.4 3.4 0 0 0-3.4 3.4v1.7a3.4 3.4 0 0 0 3.4 3.4h1.6l-1.7 3.4h3.1l2.2-4.5V9.9a3.4 3.4 0 0 0-3.4-3.4h-1.8Z"/>
    </svg>
}

function CenterAlignmentIcon() {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
        <path d="M4 6.75h16M7 12h10M4 17.25h16"/>
    </svg>
}

function ToolbarButton({ children, highlighted = false, label, onClick }: {
    children: React.ReactNode
    highlighted?: boolean
    label: string
    onClick: () => void
}) {
    return <Button pill size="xs" color={highlighted ? 'blue' : 'alternative'} type="button"
                   aria-label={label} title={label}
                   onMouseDown={event => event.preventDefault()} onClick={onClick}>
        {children}
    </Button>
}

export default function PlateRichTextEditor({
                                                content,
                                                collaboration,
                                                commentThreads = [],
                                                canComment = false,
                                                canDeleteComments = false,
                                                currentUserId = '',
                                                currentUserName = '',
                                                currentEntityMediaIds = [],
                                                documentKey,
                                                images,
                                                onCreateComment,
                                                onDeleteComment,
                                                onChange,
                                                onCollaboratorsChange,
                                                onReplyComment,
                                                onSetCommentResolved,
                                                readOnly = false,
                                                uploadPrefix
                                            }: {
    content: string
    collaboration?: CollaborationConfig
    commentThreads?: PuckCommentThread[]
    canComment?: boolean
    canDeleteComments?: boolean
    currentUserId?: string
    currentUserName?: string
    currentEntityMediaIds?: number[]
    documentKey: string
    images: Map<number, Image>
    onCreateComment?: (quotedText: string, body: string) => Promise<PuckCommentThread>
    onDeleteComment?: (threadId: string) => Promise<void>
    onChange?: (content: string) => void
    onCollaboratorsChange?: (users: PlateCollaborator[]) => void
    onReplyComment?: (threadId: string, body: string) => Promise<void>
    onSetCommentResolved?: (threadId: string, resolved: boolean) => Promise<void>
    readOnly?: boolean
    uploadPrefix: string
}) {
    const [ showLinkForm, setShowLinkForm ] = useState(false)
    const [ showMediaLibrary, setShowMediaLibrary ] = useState(false)
    const [ showComments, setShowComments ] = useState(false)
    const [ showSuggestions, setShowSuggestions ] = useState(false)
    const [ activeThreadId, setActiveThreadId ] = useState<string | null>(null)
    const [ activeSuggestionId, setActiveSuggestionId ] = useState<string | null>(null)
    const [ isSuggesting, setIsSuggesting ] = useState(false)
    const [ suggestionRevision, setSuggestionRevision ] = useState(0)
    const [ pendingRange, setPendingRange ] = useState<TRange | null>(null)
    const [ pendingQuote, setPendingQuote ] = useState<string | null>(null)
    const [ linkUrl, setLinkUrl ] = useState('')
    const [ collaborationStatus, setCollaborationStatus ] = useState<CollaborationStatus>('joining')
    const editorContainerRef = useRef<HTMLDivElement>(null)
    const collaborationUrl = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL
    const collaborationEntityId = collaboration?.entityId
    const collaborationLanguage = collaboration?.language
    const collaborationRoom = collaborationEntityId == null || collaborationLanguage == null
        ? null
        : `content-entity:${collaborationEntityId}:${collaborationLanguage}`
    const collaborationEnabled = !readOnly && collaborationRoom != null && Boolean(collaborationUrl)
    const plugins = useMemo(() => {
        if (!collaborationEnabled || collaborationEntityId == null || collaborationLanguage == null ||
            collaborationRoom == null || collaborationUrl == null) {
            return HELIUM_PLATE_EDITOR_PLUGINS
        }
        return [
            ...HELIUM_PLATE_EDITOR_PLUGINS,
            YjsPlugin.configure({
                options: {
                    providers: [
                        {
                            type: 'indexeddb',
                            options: { docName: `helium:${collaborationRoom}` }
                        },
                        {
                            type: 'hocuspocus',
                            options: {
                                name: collaborationRoom,
                                url: collaborationUrl,
                                token: async () => {
                                    const query = new URLSearchParams({
                                        entityId: String(collaborationEntityId),
                                        language: collaborationLanguage
                                    })
                                    const response = await fetch(`/api/collaboration/token?${query}`)
                                    if (!response.ok) throw new Error('Unable to authorize collaboration')
                                    const result = await response.json() as { token?: string }
                                    if (result.token == null) throw new Error('Collaboration token is missing')
                                    return result.token
                                }
                            }
                        }
                    ],
                    cursors: {
                        data: {
                            name: currentUserName,
                            color: cursorColor(currentUserId),
                            userId: currentUserId
                        }
                    },
                    onConnect: ({ type }) => {
                        if (type === 'hocuspocus') setCollaborationStatus('joining')
                    },
                    onDisconnect: ({ type }) => {
                        if (type === 'hocuspocus') setCollaborationStatus('offline')
                    },
                    onSyncChange: ({ isSynced, type }) => {
                        if (type === 'hocuspocus') setCollaborationStatus(isSynced ? 'connected' : 'offline')
                    },
                    onError: ({ error, type }) => {
                        if (type === 'hocuspocus') setCollaborationStatus('offline')
                        console.error('Plate collaboration failed:', error)
                    }
                }
            })
        ]
    }, [ collaborationEnabled, collaborationEntityId, collaborationLanguage, collaborationRoom, collaborationUrl,
        currentUserId, currentUserName ])
    const editor = usePlateEditor({
        id: documentKey,
        plugins,
        skipInitialization: collaborationEnabled,
        value: editor => {
            const value = getInitialValue(content, editor).value
            return readOnly ? rejectAllPlateSuggestions(value) : value
        }
    }, [ documentKey, plugins, readOnly ? content : null ])
    const initial = useMemo(() => getInitialValue(content, editor), [ content, editor ])
    const collaborationInitialValue = useMemo(() => getInitialValue(content, editor).value, [ editor ])
    const unresolvedCommentIds = useMemo(() => new Set(commentThreads
        .filter(thread => thread.resolvedAt == null)
        .map(thread => thread.id)), [ commentThreads ])
    const suggestions = useMemo(() => collectPlateSuggestions(editor), [ editor, suggestionRevision ])
    const suggestionIds = useMemo(() => new Set(suggestions.map(suggestion => suggestion.suggestionId)), [ suggestions ])

    useEffect(() => {
        if (!readOnly && initial.converted && onChange) {
            onChange(serializePlateValue(editor.children as HeliumPlateValue))
        }
    }, [ editor, initial.converted, onChange, readOnly ])

    useEffect(() => {
        if (!collaborationEnabled || collaborationRoom == null) return
        setCollaborationStatus('joining')
        let awareness: AwarenessLike | undefined
        let disposed = false
        let ready = false
        let cleaned = false
        const publishCollaborators = () => {
            if (awareness == null) return
            const users = Array.from(awareness.getStates(), ([ clientId, state ]) => {
                const data = state.data as { color?: unknown, name?: unknown, userId?: unknown } | undefined
                return typeof data?.name === 'string' && data.name.length > 0 && typeof data.userId === 'string' &&
                typeof data.color === 'string'
                    ? { clientId, color: data.color, name: data.name, userId: data.userId }
                    : null
            }).filter((user): user is PlateCollaborator => user != null)
            onCollaboratorsChange?.(users)
        }
        const cleanUp = () => {
            if (cleaned) return
            cleaned = true
            awareness?.off('change', publishCollaborators)
            onCollaboratorsChange?.([])
            editor.getApi(YjsPlugin).yjs.destroy()
        }
        const initializationTimer = window.setTimeout(() => {
            void editor.getApi(YjsPlugin).yjs.init({
                id: collaborationRoom,
                value: collaborationInitialValue
            }).then(() => {
                ready = true
                if (disposed) {
                    cleanUp()
                    return
                }
                awareness = editor.getOption(YjsPlugin, 'awareness') as AwarenessLike | undefined
                awareness?.on('change', publishCollaborators)
                publishCollaborators()
                const providers = editor.getOption(YjsPlugin, '_providers') as YjsProviderState[]
                const remoteProvider = providers.find(provider => provider.type === 'hocuspocus')
                setCollaborationStatus(remoteProvider?.isConnected && remoteProvider.isSynced
                    ? 'connected'
                    : 'offline')
            }).catch(error => {
                if (disposed) return
                console.error('Unable to initialize Plate collaboration:', error)
            })
        }, 0)
        return () => {
            disposed = true
            window.clearTimeout(initializationTimer)
            if (ready) cleanUp()
        }
    }, [ collaborationEnabled, collaborationInitialValue, collaborationRoom, editor, onCollaboratorsChange ])

    useEffect(() => {
        if (!collaborationEnabled) return
        const handleOffline = () => setCollaborationStatus('offline')
        const handleOnline = () => setCollaborationStatus('joining')
        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)
        if (!window.navigator.onLine) handleOffline()
        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [ collaborationEnabled ])

    useEffect(() => {
        editor.setOption(SuggestionPlugin, 'currentUserId', currentUserId)
        editor.setOption(SuggestionPlugin, 'isSuggesting', isSuggesting)
    }, [ currentUserId, editor, isSuggesting ])

    const toggleMark = (key: string) => {
        editor.tf.toggleMark(key)
        editor.tf.focus()
    }
    const toggleBlock = (key: string) => {
        editor.tf.toggleBlock(key)
        editor.tf.focus()
    }
    const setTextAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
        editor.getTransforms(TextAlignPlugin).textAlign.setNodes(alignment)
        editor.tf.focus()
    }
    const useSelectionForComment = (selection: TRange) => {
        const range = structuredClone(selection) as TRange
        setPendingRange(range)
        setPendingQuote(editor.api.string(range))
        setActiveThreadId(null)
    }
    const toggleComments = () => {
        if (showComments) {
            setShowComments(false)
            setActiveThreadId(null)
            setPendingRange(null)
            setPendingQuote(null)
            clearCommentSelection()
            return
        }
        setShowSuggestions(false)
        setActiveSuggestionId(null)
        setActiveThreadId(null)
        if (editor.selection && RangeApi.isExpanded(editor.selection)) {
            useSelectionForComment(editor.selection)
        } else {
            setPendingRange(null)
            setPendingQuote(null)
        }
        setShowComments(true)
    }
    const clearCommentSelection = () => {
        editor.tf.deselect()
        editor.tf.deselectDOM()
    }
    const setEditingMode = (suggesting: boolean) => {
        setIsSuggesting(suggesting)
        editor.setOption(SuggestionPlugin, 'isSuggesting', suggesting)
        editor.tf.focus()
    }
    const toggleSuggestions = () => {
        setShowSuggestions(value => !value)
        setShowComments(false)
        setActiveThreadId(null)
    }

    return <>
        <MediaPicker open={showMediaLibrary} onClose={() => setShowMediaLibrary(false)} allowUnpick={false}
                     currentEntityMediaIds={showMediaLibrary
                         ? Array.from(new Set([
                             ...currentEntityMediaIds,
                             ...extractContentImageIds(serializePlateValue(editor.children as HeliumPlateValue))
                         ]))
                         : undefined}
                     onPick={image => {
                         if (image == null) return
                         editor.tf.insertNodes({
                             type: KEYS.img,
                             imageId: image.id,
                             url: `${uploadPrefix}/${image.sha1}.webp`,
                             children: [ { text: '' } ]
                         })
                         setShowMediaLibrary(false)
                         editor.tf.focus()
                     }}/>
        <Modal show={showLinkForm} size="md" popup onClose={() => setShowLinkForm(false)}>
            <ModalHeader>添加链接</ModalHeader>
            <ModalBody className="pt-4">
                <TextInput value={linkUrl} placeholder="https://dreta.dev"
                           onChange={event => setLinkUrl(event.currentTarget.value)}/>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={linkUrl.trim().length === 0} onClick={() => {
                    upsertLink(editor, { url: linkUrl.trim() })
                    setLinkUrl('')
                    setShowLinkForm(false)
                    editor.tf.focus()
                }}>确认</Button>
            </ModalFooter>
        </Modal>

        <PlateMediaProvider images={images} uploadPrefix={uploadPrefix}>
            <PlateCommentProvider activeId={activeThreadId} unresolvedIds={unresolvedCommentIds}
                                  onActivate={threadId => {
                                      if (!unresolvedCommentIds.has(threadId)) return
                                      setActiveThreadId(threadId)
                                      setPendingRange(null)
                                      setPendingQuote(null)
                                      setShowComments(true)
                                  }}>
                <div className={(showComments || showSuggestions) && !readOnly
                    ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]'
                    : ''}>
                    <PlateSuggestionProvider activeId={activeSuggestionId} suggestionIds={suggestionIds}
                                             onActivate={suggestionId => {
                                                 if (!suggestionIds.has(suggestionId)) return
                        setActiveSuggestionId(suggestionId)
                        setShowSuggestions(true)
                        setShowComments(false)
                        setActiveThreadId(null)
                    }}>
                        <Plate editor={editor} readOnly={readOnly}
                               onSelectionChange={({ selection }) => {
                                   if (showComments && selection && RangeApi.isExpanded(selection)) {
                                       useSelectionForComment(selection)
                                   }
                               }}
                               onValueChange={({ value }) => {
                                   setSuggestionRevision(revision => revision + 1)
                                   onChange?.(serializePlateValue(value as HeliumPlateValue))
                               }}>
                            <div ref={editorContainerRef}
                                 className={readOnly ? '' : 'relative flex h-[50rem] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white'}>
                                {!readOnly && <div className="flex shrink-0 flex-wrap gap-2 p-3" role="toolbar"
                                                   aria-label="正文格式工具栏">
                                    <ToolbarButton label="正文" onClick={() => toggleBlock(KEYS.p)}>
                                        <HiBars3CenterLeft className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="一级标题" onClick={() => toggleBlock(KEYS.h1)}>
                                        <HiH1 className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="二级标题" onClick={() => toggleBlock(KEYS.h2)}>
                                        <HiH2 className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="三级标题" onClick={() => toggleBlock(KEYS.h3)}>
                                        <HiH3 className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="左对齐" onClick={() => setTextAlignment('left')}>
                                        <HiBars3BottomLeft className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="居中对齐" onClick={() => setTextAlignment('center')}>
                                        <CenterAlignmentIcon/>
                                    </ToolbarButton>
                                    <ToolbarButton label="右对齐" onClick={() => setTextAlignment('right')}>
                                        <HiBars3BottomRight className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="两端对齐" onClick={() => setTextAlignment('justify')}>
                                        <HiBars3 className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="粗体" onClick={() => toggleMark(KEYS.bold)}>
                                        <HiBold className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="斜体" onClick={() => toggleMark(KEYS.italic)}>
                                        <HiItalic className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="下划线" onClick={() => toggleMark(KEYS.underline)}>
                                        <HiUnderline className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="删除线" onClick={() => toggleMark(KEYS.strikethrough)}>
                                        <HiStrikethrough className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="引用" onClick={() => toggleBlock(KEYS.blockquote)}>
                                        <QuotationMarksIcon/>
                                    </ToolbarButton>
                                    <ToolbarButton label="项目符号列表" onClick={() => {
                                        toggleBulletedList(editor)
                                        editor.tf.focus()
                                    }}><HiListBullet className="h-4 w-4" aria-hidden="true"/></ToolbarButton>
                                    <ToolbarButton label="编号列表" onClick={() => {
                                        toggleNumberedList(editor)
                                        editor.tf.focus()
                                    }}><HiNumberedList className="h-4 w-4" aria-hidden="true"/></ToolbarButton>
                                    <ToolbarButton label="添加链接" onClick={() => setShowLinkForm(true)}>
                                        <HiLink className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton label="插入图片" onClick={() => setShowMediaLibrary(true)}>
                                        <HiPhoto className="h-4 w-4" aria-hidden="true"/>
                                    </ToolbarButton>
                                    <ToolbarButton highlighted={suggestions.length > 0}
                                                   label={`建议, ${suggestions.length} 条待处理`}
                                                   onClick={toggleSuggestions}>
                        <span className="flex items-center gap-1">
                            <HiLightBulb className="size-4" aria-hidden="true"/>
                            {suggestions.length > 0 && <span aria-hidden="true">{suggestions.length}</span>}
                        </span>
                                    </ToolbarButton>
                                    {canComment && <ToolbarButton
                                        highlighted={unresolvedCommentIds.size > 0}
                                        label={unresolvedCommentIds.size > 0
                                            ? `评论, ${unresolvedCommentIds.size} 条未解决`
                                            : '评论, 没有未解决评论'}
                                        onClick={toggleComments}>
                        <span className="flex items-center gap-1">
                            <HiChatBubbleLeftRight className="h-4 w-4" aria-hidden="true"/>
                            {unresolvedCommentIds.size > 0 &&
                                <span aria-hidden="true">{unresolvedCommentIds.size}</span>}
                        </span>
                                    </ToolbarButton>}
                                    <Dropdown pill size="xs" color="alternative" dismissOnClick className="rounded-3xl"
                                              theme={{
                                                  content: 'p-0 focus:outline-none',
                                                  floating: { base: 'overflow-hidden rounded-3xl' }
                                              }}
                                              label={<span className="inline-flex items-center gap-1 text-sm">
                        {isSuggesting
                            ? <HiLightBulb className="size-4" aria-hidden="true"/>
                            : <HiPencilSquare className="size-4" aria-hidden="true"/>}
                                                  {isSuggesting ? '建议模式' : '编辑模式'}
                    </span>}>
                                        <DropdownItem className="rounded-3xl" icon={HiPencilSquare}
                                                      onClick={() => setEditingMode(false)}>
                            <span className="text-left"><span className="block font-bold">编辑模式</span>
                                <span className="block text-xs text-gray-500">直接编辑正文</span></span>
                                        </DropdownItem>
                                        <DropdownItem className="rounded-3xl" icon={HiLightBulb}
                                                      onClick={() => setEditingMode(true)}>
                            <span className="text-left"><span className="block font-bold">建议模式</span>
                                <span className="block text-xs text-gray-500">更改将记录为建议</span></span>
                                        </DropdownItem>
                                    </Dropdown>
                                </div>}
                                <PlateContent
                                    readOnly={readOnly}
                                    aria-label={readOnly ? '正文预览' : '富文本正文编辑器'}
                                    placeholder={readOnly ? undefined : '输入正文...'}
                                    style={readOnly ? undefined : { boxShadow: 'none', outline: 'none' }}
                                    className={readOnly
                                        ? 'flex min-h-0 flex-wrap content-start px-0 py-0 outline-none'
                                        : 'flex min-h-0 flex-1 flex-wrap content-start overflow-y-auto px-5 py-4 text-gray-900 outline-none focus-visible:outline-none'}
                                />
                                {collaborationEnabled && <RemoteCursorOverlay editor={editor}
                                                                              container={editorContainerRef}
                                                                              revision={suggestionRevision}/>}
                                {collaborationEnabled && collaborationStatus !== 'connected' &&
                                    <div
                                        className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl backdrop-blur-lg bg-gray-100/50 px-6 text-center text-gray-700"
                                        role="status" aria-live="polite">
                                        {collaborationStatus === 'joining'
                                            ? '正在加入内容编辑器'
                                            : '无法连接到服务器'}
                                    </div>}
                            </div>
                        </Plate>
                    </PlateSuggestionProvider>
                    {showComments && !readOnly && onCreateComment && onReplyComment && onSetCommentResolved &&
                        <PlateCommentsPanel
                            activeThreadId={activeThreadId}
                            canComment={canComment}
                            canDelete={canDeleteComments && onDeleteComment != null}
                            pendingQuote={pendingQuote}
                            threads={commentThreads}
                            onClose={() => {
                                setShowComments(false)
                                setActiveThreadId(null)
                                setPendingRange(null)
                                setPendingQuote(null)
                                clearCommentSelection()
                            }}
                            onCreate={async body => {
                                if (!pendingRange || !pendingQuote) return
                                const draftKey = getDraftCommentKey()
                                editor.getTransforms(CommentPlugin).comment.setDraft({ at: pendingRange })
                                let thread: PuckCommentThread
                                try {
                                    thread = await onCreateComment(pendingQuote, body)
                                } catch (error) {
                                    editor.tf.unsetNodes([ 'comment', draftKey ], {
                                        at: [],
                                        match: node => TextApi.isText(node) && node[draftKey] === true
                                    })
                                    throw error
                                }
                                try {
                                    editor.tf.withoutNormalizing(() => {
                                        editor.tf.setNodes({ [getCommentKey(thread.id)]: true }, {
                                            at: [],
                                            match: node => TextApi.isText(node) && node[draftKey] === true
                                        })
                                        editor.tf.unsetNodes(draftKey, {
                                            at: [],
                                            match: node => TextApi.isText(node) && node[draftKey] === true
                                        })
                                    })
                                    setActiveThreadId(thread.id)
                                    setPendingRange(null)
                                    setPendingQuote(null)
                                    clearCommentSelection()
                                } catch (error) {
                                    console.error('Failed to attach saved comment thread to Plate text:', error)
                                    editor.tf.unsetNodes([ 'comment', draftKey ], {
                                        at: [],
                                        match: node => TextApi.isText(node) && node[draftKey] === true
                                    })
                                    setActiveThreadId(thread.id)
                                    setPendingRange(null)
                                    setPendingQuote(null)
                                    clearCommentSelection()
                                }
                            }}
                            onDelete={async threadId => {
                                if (onDeleteComment == null) return
                                await onDeleteComment(threadId)
                                editor.getTransforms(CommentPlugin).comment.unsetMark({ id: threadId })
                                if (activeThreadId === threadId) setActiveThreadId(null)
                            }}
                            onReply={onReplyComment}
                            onSetResolved={async (threadId, resolved) => {
                                await onSetCommentResolved(threadId, resolved)
                                if (resolved) {
                                    if (activeThreadId === threadId) setActiveThreadId(null)
                                    clearCommentSelection()
                                }
                            }}
                        />}
                    {showSuggestions && !readOnly && <PlateSuggestionsPanel
                        activeId={activeSuggestionId}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        suggestions={suggestions}
                        onClose={() => {
                            setShowSuggestions(false)
                            setActiveSuggestionId(null)
                        }}
                        onAccept={suggestion => {
                            acceptSuggestion(editor, suggestion)
                            setActiveSuggestionId(null)
                            setSuggestionRevision(revision => revision + 1)
                        }}
                        onReject={suggestion => {
                            rejectSuggestion(editor, suggestion)
                            setActiveSuggestionId(null)
                            setSuggestionRevision(revision => revision + 1)
                        }}/>
                    }
                </div>
            </PlateCommentProvider>
        </PlateMediaProvider>
    </>
}

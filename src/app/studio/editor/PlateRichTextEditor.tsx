'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plate, PlateContent, type PlateEditor, usePlateEditor } from 'platejs/react'
import { KEYS, RangeApi, TextApi, type TRange } from 'platejs'
import { MarkdownPlugin } from '@platejs/markdown'
import { getCommentKey, getDraftCommentKey } from '@platejs/comment'
import { CommentPlugin } from '@platejs/comment/react'
import { TextAlignPlugin } from '@platejs/basic-styles/react'
import { SuggestionPlugin } from '@platejs/suggestion/react'
import { acceptSuggestion, rejectSuggestion } from '@platejs/suggestion'
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
                                                commentThreads = [],
                                                canComment = false,
                                                canDeleteComments = false,
                                                currentUserId = '',
                                                currentUserName = '',
                                                documentKey,
                                                images,
                                                onCreateComment,
                                                onDeleteComment,
                                                onChange,
                                                onReplyComment,
                                                onSetCommentResolved,
                                                readOnly = false,
                                                uploadPrefix
                                            }: {
    content: string
    commentThreads?: PuckCommentThread[]
    canComment?: boolean
    canDeleteComments?: boolean
    currentUserId?: string
    currentUserName?: string
    documentKey: string
    images: Map<number, Image>
    onCreateComment?: (quotedText: string, body: string) => Promise<PuckCommentThread>
    onDeleteComment?: (threadId: string) => Promise<void>
    onChange?: (content: string) => void
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
    const editor = usePlateEditor({
        id: documentKey,
        plugins: HELIUM_PLATE_EDITOR_PLUGINS,
        value: editor => {
            const value = getInitialValue(content, editor).value
            return readOnly ? rejectAllPlateSuggestions(value) : value
        }
    }, [ documentKey, readOnly ? content : null ])
    const initial = useMemo(() => getInitialValue(content, editor), [ content, editor ])
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
            <ModalBody>
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
                            <div
                                className={readOnly ? '' : 'flex h-[50rem] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white'}>
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

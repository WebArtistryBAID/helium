'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Alert, Badge, Button, Textarea } from 'flowbite-react'
import { ActionBar, usePuck } from '@puckeditor/core'
import { HiArrowLeft, HiChatBubbleLeftRight, HiCheck, HiChevronDown, HiChevronUp } from 'react-icons/hi2'
import type { PuckCommentThread } from '@/app/lib/puck/puck-comment-types'

const COMMENT_HIGHLIGHT_SELECTOR = '[data-puck-comment-highlight]'

export function PuckCommentHighlights({ componentIds }: { componentIds: string[] }) {
    useEffect(() => {
        const editor = document.querySelector('.page-editor')
        if (editor == null) return

        const highlightedIds = new Set(componentIds)
        const frameObservers = new Map<HTMLIFrameElement, MutationObserver>()
        const updateHighlights = (root: ParentNode) => {
            root.querySelectorAll<HTMLElement>('[data-puck-component]').forEach(component => {
                const highlighted = highlightedIds.has(component.dataset.puckComponent ?? '')
                const currentHighlight = component.querySelector<HTMLElement>(`:scope > ${COMMENT_HIGHLIGHT_SELECTOR}`)

                if (highlighted && currentHighlight == null) {
                    const highlight = component.ownerDocument.createElement('div')
                    highlight.dataset.puckCommentHighlight = ''
                    highlight.className = 'pointer-events-none absolute inset-0 z-[1] bg-yellow-200/20'
                    component.appendChild(highlight)
                } else if (!highlighted) {
                    currentHighlight?.remove()
                }
            })
        }

        const observeFrame = (frame: HTMLIFrameElement) => {
            const frameDocument = frame.contentDocument
            if (frameDocument?.body == null || frameObservers.has(frame)) return

            updateHighlights(frameDocument)
            const observer = new MutationObserver(() => updateHighlights(frameDocument))
            observer.observe(frameDocument.body, { childList: true, subtree: true })
            frameObservers.set(frame, observer)
        }

        const updateEditor = () => {
            updateHighlights(editor)
            editor.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => {
                observeFrame(frame)
                frame.addEventListener('load', () => observeFrame(frame), { once: true })
            })
        }

        updateEditor()
        const observer = new MutationObserver(updateEditor)
        observer.observe(editor, { childList: true, subtree: true })

        return () => {
            observer.disconnect()
            frameObservers.forEach(frameObserver => frameObserver.disconnect())
            editor.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => {
                frame.contentDocument?.querySelectorAll<HTMLElement>(COMMENT_HIGHLIGHT_SELECTOR)
                    .forEach(highlight => highlight.remove())
            })
            editor.querySelectorAll<HTMLElement>(COMMENT_HIGHLIGHT_SELECTOR)
                .forEach(highlight => highlight.remove())
        }
    }, [ componentIds ])

    return null
}

function displayTime(value: Date | string): string {
    return new Date(value).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function ThreadCard({ thread, canComment, canDelete, onDelete, onReply, onSetResolved }: {
    thread: PuckCommentThread
    canComment: boolean
    canDelete: boolean
    onDelete: (threadId: string) => Promise<void>
    onReply: (threadId: string, body: string) => Promise<void>
    onSetResolved: (threadId: string, resolved: boolean) => Promise<void>
}) {
    const [ collapsed, setCollapsed ] = useState(false)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ reply, setReply ] = useState('')
    const [ loading, setLoading ] = useState(false)
    const [ error, setError ] = useState<string | null>(null)
    const resolved = thread.resolvedAt != null

    return <>
        <div className="flex items-center gap-2">
            <Badge color={resolved ? 'gray' : 'blue'}>
                {resolved ? '已解决' : '讨论中'}
            </Badge>
            <span className="ml-auto text-xs text-gray-500">{thread.comments.length} 条</span>
            <Button pill size="xs" color="alternative"
                    aria-label={collapsed ? '展开讨论' : '收起讨论'}
                    onClick={() => setCollapsed(value => !value)}>
                {collapsed
                    ? <HiChevronDown className="size-4" aria-hidden="true"/>
                    : <HiChevronUp className="size-4" aria-hidden="true"/>}
            </Button>
        </div>

        {!collapsed && <div className="space-y-4">
            <div className="space-y-3">
                {thread.comments.map(comment => <div key={comment.id} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline gap-2">
                        <p className="text-sm font-bold text-gray-900">{comment.author.name}</p>
                        <p className="text-xs text-gray-500">{displayTime(comment.createdAt)}</p>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                        {comment.deletedAt == null ? comment.body : '此评论已删除'}
                    </p>
                </div>)}
            </div>

            {error != null && <Alert color="failure" className="rounded-3xl shadow-none">{error}</Alert>}

            {!resolved && canComment && <div className="space-y-2">
                <Textarea
                    rows={2}
                    value={reply}
                    disabled={loading}
                    placeholder="回复评论"
                    className="rounded-3xl shadow-none"
                    onChange={event => setReply(event.currentTarget.value)}
                />
                <div className="flex justify-end gap-2">
                    <Button
                        pill
                        size="xs"
                        color="alternative"
                        disabled={loading}
                        onClick={async () => {
                            setLoading(true)
                            setError(null)
                            try {
                                await onSetResolved(thread.id, true)
                            } catch {
                                setError('无法更新讨论状态，请重试。')
                            } finally {
                                setLoading(false)
                            }
                        }}
                    >
                        <HiCheck className="mr-1 size-4" aria-hidden="true"/>
                        已解决
                    </Button>
                    <Button
                        pill
                        size="xs"
                        color="blue"
                        disabled={loading || reply.trim().length === 0}
                        onClick={async () => {
                            setLoading(true)
                            setError(null)
                            try {
                                await onReply(thread.id, reply)
                                setReply('')
                            } catch {
                                setError('无法发送回复，请重试。')
                            } finally {
                                setLoading(false)
                            }
                        }}
                    >回复</Button>
                </div>
            </div>}

            {resolved && canComment && <div className="flex justify-end">
                <Button
                    pill
                    size="xs"
                    color="alternative"
                    disabled={loading}
                    onClick={async () => {
                        setLoading(true)
                        setError(null)
                        try {
                            await onSetResolved(thread.id, false)
                        } catch {
                            setError('无法更新讨论状态，请重试。')
                        } finally {
                            setLoading(false)
                        }
                    }}
                >重新打开</Button>
            </div>}
            {canDelete && <div className="flex justify-end">
                <Button pill size="xs" color="red" disabled={loading}
                        aria-label={deleteConfirm ? '确认删除评论讨论' : '删除评论讨论'}
                        onClick={async () => {
                            if (!deleteConfirm) {
                                setDeleteConfirm(true)
                                return
                            }
                            setLoading(true)
                            setError(null)
                            try {
                                await onDelete(thread.id)
                            } catch {
                                setError('无法删除评论讨论，请重试。')
                                setDeleteConfirm(false)
                                setLoading(false)
                            }
                        }}>
                    {deleteConfirm ? '确认删除?' : '删除讨论'}
                </Button>
            </div>}
        </div>}
    </>
}

export function PuckCommentActionBar({ children, label, parentAction, activeComponentId, threadCounts, onOpen }: {
    children: ReactNode
    label?: string
    parentAction: ReactNode
    activeComponentId: string | null
    threadCounts: Record<string, number>
    onOpen: (componentId: string) => void
}) {
    const { selectedItem, dispatch } = usePuck()
    const componentId = selectedItem?.props.id

    return <ActionBar>
        <ActionBar.Group>
            {parentAction}
            {label != null && <ActionBar.Label label={label}/>}
        </ActionBar.Group>
        <ActionBar.Group>
            {typeof componentId === 'string' && <Button
                pill
                size="xs"
                color={activeComponentId === componentId ? 'blue' : 'alternative'}
                onClick={() => {
                    dispatch({ type: 'setUi', ui: { rightSideBarVisible: true } })
                    onOpen(componentId)
                }}
            >
                <span className="inline-flex items-center gap-1">
                    <HiChatBubbleLeftRight className="size-4" aria-hidden="true"/>
                    <span>评论 {threadCounts[componentId] && <>({threadCounts[componentId]})</>}</span>
                </span>
            </Button>}
            {children}
        </ActionBar.Group>
    </ActionBar>
}

export default function PuckComments({
                                         children,
                                         activeComponentId,
                                         canComment,
                                         canDelete,
                                         threads,
                                         onClose,
                                         onCreate,
                                         onDelete,
                                         onReply,
                                         onSetResolved
                                     }: {
    children: ReactNode
    activeComponentId: string | null
    canComment: boolean
    canDelete: boolean
    threads: PuckCommentThread[]
    onClose: () => void
    onCreate: (componentId: string, body: string) => Promise<void>
    onDelete: (threadId: string) => Promise<void>
    onReply: (threadId: string, body: string) => Promise<void>
    onSetResolved: (threadId: string, resolved: boolean) => Promise<void>
}) {
    const [ body, setBody ] = useState('')
    const [ loading, setLoading ] = useState(false)
    const [ error, setError ] = useState<string | null>(null)
    const { selectedItem } = usePuck()
    const selectedComponentId = selectedItem?.props.id
    const unresolvedThreadCount = threads.filter(thread => thread.resolvedAt == null).length

    if (activeComponentId == null || selectedComponentId !== activeComponentId) return children

    return <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
            <Button pill size="xs" color="alternative" onClick={onClose} aria-label="返回组件设置" className="p-1 rounded-full flex justify-center items-center h-8 w-8">
                <HiArrowLeft aria-hidden className="w-8" />
            </Button>
            <Badge color={unresolvedThreadCount === 0 ? 'success' : 'failure'}
                   className="ml-auto flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold">
                {unresolvedThreadCount}
            </Badge>
        </div>

        {canComment && <>
            <Textarea
                rows={3}
                value={body}
                disabled={loading}
                placeholder="添加评论"
                className="rounded-3xl shadow-none"
                onChange={event => setBody(event.currentTarget.value)}
            />
            {error != null && <Alert color="failure" className="rounded-3xl shadow-none">{error}</Alert>}
            <div className="flex justify-end">
                <Button
                    pill
                    size="xs"
                    color="blue"
                    disabled={loading || body.trim().length === 0}
                    onClick={async () => {
                        setLoading(true)
                        setError(null)
                        try {
                            await onCreate(activeComponentId, body)
                            setBody('')
                        } catch {
                            setError('无法添加评论，请重试。')
                        } finally {
                            setLoading(false)
                        }
                    }}
                >发布</Button>
            </div>
        </>}

        {threads.map(thread => <ThreadCard
            key={thread.id}
            thread={thread}
            canComment={canComment}
            canDelete={canDelete}
            onDelete={onDelete}
            onReply={onReply}
            onSetResolved={onSetResolved}
        />)}
    </div>
}

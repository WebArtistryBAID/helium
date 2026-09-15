'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Textarea } from 'flowbite-react'
import { HiCheck, HiChevronDown, HiChevronUp, HiXMark } from 'react-icons/hi2'
import type { PuckCommentThread } from '@/app/lib/puck/puck-comment-types'

function displayTime(value: Date | string): string {
    return new Date(value).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function PlateThread({ activeThreadId, canComment, canDelete, onDelete, onReply, onSetResolved, thread }: {
    activeThreadId: string | null
    canComment: boolean
    canDelete: boolean
    onDelete: (threadId: string) => Promise<void>
    onReply: (threadId: string, body: string) => Promise<void>
    onSetResolved: (threadId: string, resolved: boolean) => Promise<void>
    thread: PuckCommentThread
}) {
    const [ collapsed, setCollapsed ] = useState(false)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ reply, setReply ] = useState('')
    const [ loading, setLoading ] = useState(false)
    const [ error, setError ] = useState<string | null>(null)
    const resolved = thread.resolvedAt != null

    useEffect(() => {
        if (activeThreadId != null) setCollapsed(thread.id !== activeThreadId)
    }, [ activeThreadId, thread.id ])

    return <div className="space-y-4 px-1">
        <div className="flex items-center gap-2">
            <Badge color={resolved ? 'gray' : 'blue'}>{resolved ? '已解决' : '讨论中'}</Badge>
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
            {thread.quotedText && <blockquote className="border-l-2 border-gray-300 pl-3 text-xs text-gray-500">
                {thread.quotedText}
            </blockquote>}
            <div className="space-y-3">
                {thread.comments.map(comment => <div key={comment.id}>
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-gray-900">{comment.author.name}</span>
                        <span className="text-xs text-gray-500">{displayTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                        {comment.deletedAt == null ? comment.body : '此评论已删除'}
                    </p>
                </div>)}
            </div>
            {error && <Alert color="failure" className="rounded-3xl shadow-none">{error}</Alert>}
            {!resolved && canComment && <div className="space-y-2">
                <Textarea rows={2} value={reply} disabled={loading} placeholder="回复评论"
                          className="rounded-3xl shadow-none"
                          onChange={event => setReply(event.currentTarget.value)}/>
                <div className="flex justify-end gap-2">
                    <Button pill size="xs" color="alternative" disabled={loading} onClick={async () => {
                        setLoading(true)
                        setError(null)
                        try {
                            await onSetResolved(thread.id, true)
                        } catch {
                            setError('无法更新讨论状态，请重试。')
                        } finally {
                            setLoading(false)
                        }
                    }}><HiCheck className="mr-1 size-4" aria-hidden="true"/>已解决</Button>
                    <Button pill size="xs" color="blue" disabled={loading || reply.trim().length === 0}
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
                            }}>回复</Button>
                </div>
            </div>}
            {resolved && canComment && <div className="flex justify-end">
                <Button pill size="xs" color="alternative" disabled={loading} onClick={async () => {
                    setLoading(true)
                    setError(null)
                    try {
                        await onSetResolved(thread.id, false)
                    } catch {
                        setError('无法更新讨论状态，请重试。')
                    } finally {
                        setLoading(false)
                    }
                }}>重新打开</Button>
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
    </div>
}

export default function PlateCommentsPanel({
                                               activeThreadId,
                                               canComment,
                                               canDelete,
                                               onClose,
                                               onCreate,
                                               onDelete,
                                               onReply,
                                               onSetResolved,
                                               pendingQuote,
                                               threads
                                           }: {
    activeThreadId: string | null
    canComment: boolean
    canDelete: boolean
    onClose: () => void
    onCreate: (body: string) => Promise<void>
    onDelete: (threadId: string) => Promise<void>
    onReply: (threadId: string, body: string) => Promise<void>
    onSetResolved: (threadId: string, resolved: boolean) => Promise<void>
    pendingQuote: string | null
    threads: PuckCommentThread[]
}) {
    const [ body, setBody ] = useState('')
    const [ loading, setLoading ] = useState(false)
    const [ error, setError ] = useState<string | null>(null)
    const unresolvedCount = threads.filter(thread => thread.resolvedAt == null).length
    const sortedThreads = useMemo(() => [ ...threads ].sort((first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()), [ threads ])

    return <aside className="max-h-[60rem] space-y-4 overflow-y-auto rounded-3xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">评论</h3>
            <Badge color={unresolvedCount === 0 ? 'success' : 'failure'}>{unresolvedCount}</Badge>
            <Button pill size="xs" color="alternative" className="ml-auto" aria-label="关闭评论"
                    onClick={onClose}><HiXMark className="size-4" aria-hidden="true"/></Button>
        </div>

        {!pendingQuote && canComment &&
            <p className="text-sm text-gray-500">选择正文后即可添加评论。</p>}

        {pendingQuote && canComment && <div className="space-y-3">
            <blockquote className="border-l-2 border-gray-300 pl-3 text-xs text-gray-500">{pendingQuote}</blockquote>
            <Textarea rows={3} value={body} disabled={loading} placeholder="添加评论"
                      className="rounded-3xl shadow-none" onChange={event => setBody(event.currentTarget.value)}/>
            {error && <Alert color="failure" className="rounded-3xl shadow-none">{error}</Alert>}
            <div className="flex justify-end">
                <Button pill size="xs" color="blue" disabled={loading || body.trim().length === 0}
                        onClick={async () => {
                            setLoading(true)
                            setError(null)
                            try {
                                await onCreate(body)
                                setBody('')
                            } catch {
                                setError('无法添加评论，请重试。')
                            } finally {
                                setLoading(false)
                            }
                        }}>发布</Button>
            </div>
        </div>}

        {sortedThreads.map(thread => <PlateThread key={thread.id} thread={thread}
                                                  activeThreadId={activeThreadId}
                                                  canComment={canComment}
                                                  canDelete={canDelete}
                                                  onDelete={onDelete}
                                                  onReply={onReply} onSetResolved={onSetResolved}/>)}
    </aside>
}

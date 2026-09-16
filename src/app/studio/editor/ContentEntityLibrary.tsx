'use client'

import { Paginated, SimplifiedContentEntity } from '@/app/lib/data-types'
import { useEffect, useRef, useState } from 'react'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import {
    createContentEntity,
    getContentEntities
} from '@/app/studio/editor/entity-actions'
import {
    Alert,
    Button,
    Card,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Pagination,
    Progress,
    Textarea,
    TextInput
} from 'flowbite-react'
import If from '@/app/lib/If'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WeChatTask } from '@/app/studio/editor/entity-types'
import {
    createPostsFromWeChat,
    deleteWeChatTask,
    getWeChatTasks,
    retryFailedWeChatTask
} from '@/app/studio/editor/wechat-actions'
import { EntityType, Role, User } from '@/generated/prisma/browser'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'

export default function ContentEntityLibrary({ init, title, user, type }: {
    init: Paginated<SimplifiedContentEntity>,
    title: string,
    user: User,
    type: EntityType
}) {
    const [ page, setPage ] = useState<Paginated<SimplifiedContentEntity>>(init)
    const [ currentPage, setCurrentPage ] = useState(0)
    const [ showCreate, setShowCreate ] = useState(false)
    const [ postTitleEN, setPostTitleEN ] = useState('')
    const [ postTitleZH, setPostTitleZH ] = useState('')
    const [ search, setSearch ] = useState('')
    const [ debouncedSearch, setDebouncedSearch ] = useState('')
    const [ showWeChatLink, setShowWeChatLink ] = useState(false)
    const [ wechatLink, setWeChatLink ] = useState('')
    const [ wechatTasks, setWeChatTasks ] = useState<WeChatTask[]>([])
    const [ showWeChatTasks, setShowWeChatTasks ] = useState(false)
    const [ wechatError, setWeChatError ] = useState('')
    const [ startingWeChat, setStartingWeChat ] = useState(false)
    const [ openingWeChat, setOpeningWeChat ] = useState(false)
    const [ deletingWeChat, setDeletingWeChat ] = useState<string[]>([])
    const previousTaskIds = useRef<string[]>([])
    const [ loading, setLoading ] = useState(false)
    const [ uploadServePath, setUploadServePath ] = useState<string>('')
    const {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    const router = useRouter()
    const canWrite = user.roles.includes(Role.writer)

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(t)
    }, [ search ])

    useEffect(() => {
        (async () => {
            setUploadServePath(await getUploadServePath())
            const res = await getContentEntities(currentPage, type, debouncedSearch || undefined)
            setPage(res)
        })()
    }, [ canWrite, currentPage, debouncedSearch, handlePermissionError, type ])

    useEffect(() => {
        if (!canWrite || type !== EntityType.post) return
        let stopped = false
        let timer: ReturnType<typeof setTimeout>
        const poll = async () => {
            try {
                const tasks = await getWeChatTasks()
                if (stopped) return
                setWeChatTasks(tasks)
                const ids = tasks.map(task => task.id)
                const removed = previousTaskIds.current.some(id => !ids.includes(id))
                previousTaskIds.current = ids
                if (removed) {
                    const result = await getContentEntities(currentPage, type, debouncedSearch || undefined)
                    if (!stopped) setPage(result)
                }
            } catch (error) {
                if (!stopped && !handlePermissionError(error)) setWeChatError('读取同步任务失败，请重试。')
            } finally {
                if (!stopped) timer = setTimeout(poll, 1500)
            }
        }
        void poll()
        return () => { stopped = true; clearTimeout(timer) }
    }, [canWrite, type, currentPage, debouncedSearch, handlePermissionError])

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>

        <Modal show={showCreate} size="md" popup onClose={() => setShowCreate(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">创建{title}</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="title-zh">标题 (中文)</Label>
                        </div>
                        <TextInput id="title-zh" value={postTitleZH} placeholder="世界因我更美好"
                                   onChange={e => setPostTitleZH(e.currentTarget.value)}
                                   required/>
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="title-en">标题 (英文)</Label>
                        </div>
                        <TextInput id="title-en" value={postTitleEN} placeholder="Better Me, Better World"
                                   onChange={e => setPostTitleEN(e.currentTarget.value)}
                                   required/>
                    </div>
                    <p className="text-sm">英文标题请使用正确大小写，如 Old Meets New: BAID Beijing Cultural
                        Exploration</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button disabled={loading} pill color="blue" onClick={async () => {
                    if (!canWrite) {
                        showPermissionDenied()
                        return
                    }
                    if (!postTitleEN || !postTitleZH) return
                    setLoading(true)
                    try {
                        const post = await createContentEntity(type, postTitleEN, postTitleZH)
                        setShowCreate(false)
                        router.push(type === EntityType.page ? `/studio/pages/${post.id}/editor` : `/studio/editor/${post.id}`)
                    } catch (error) {
                        if (!handlePermissionError(error)) {
                            console.error('Failed to create content entity:', error)
                        }
                    } finally {
                        setLoading(false)
                    }
                }}>创建</Button>
                <Button disabled={loading} pill color="alternative" onClick={() => setShowCreate(false)}>
                    取消
                </Button>
            </ModalFooter>
        </Modal>

        <Modal show={showWeChatLink} size="md" popup onClose={() => setShowWeChatLink(false)}
               theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-3xl bg-white shadow-none' } }}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">创建同步任务</h3>
                    {wechatError && <Alert color="failure">{wechatError}</Alert>}
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="wechat-link">链接</Label>
                        </div>
                        <Textarea id="wechat-link" value={wechatLink}
                                  placeholder="https://mp.weixin.qq.com/..., https://mp.weixin.qq.com/..."
                                  rows={5}
                                  onChange={e => setWeChatLink(e.currentTarget.value)}
                                  required/>
                    </div>
                    <p className="text-sm">同步需要 5 到 10
                        分钟。同步完成后，请检查排版、中文内容及自动翻译。图片会自动放入媒体库。</p>
                    <p className="text-sm">同步多篇文章时，请使用英文逗号 (,) 分隔每条链接。</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button disabled={startingWeChat} pill color="blue" onClick={async () => {
                    if (!canWrite) { showPermissionDenied(); return }
                    setStartingWeChat(true)
                    setWeChatError('')
                    try {
                        const ids = await createPostsFromWeChat(wechatLink, null)
                        previousTaskIds.current = [ ...previousTaskIds.current, ...ids ]
                        setWeChatLink('')
                        setShowWeChatLink(false)
                        setShowWeChatTasks(true)
                        setWeChatTasks(await getWeChatTasks())
                    } catch (error) {
                        if (!handlePermissionError(error)) setWeChatError(error instanceof Error ? error.message : '创建同步任务失败')
                    } finally { setStartingWeChat(false) }
                }}>{startingWeChat ? '正在创建任务' : '开始同步任务'}</Button>
                <Button disabled={startingWeChat} pill color="alternative" onClick={() => {
                    setShowWeChatLink(false)
                    if (wechatTasks.length) setShowWeChatTasks(true)
                }}>取消</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showWeChatTasks} size="2xl" popup onClose={() => setShowWeChatTasks(false)}
               theme={{ content: { inner: 'relative flex max-h-[80dvh] flex-col overflow-hidden rounded-3xl bg-white shadow-none' } }}>
            <ModalHeader className="shrink-0"/>
            <ModalBody className="min-h-0 overflow-y-auto">
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">微信公众号同步任务</h3>
                    <Button pill color="blue" onClick={() => {
                        setWeChatError('')
                        setShowWeChatTasks(false)
                        setShowWeChatLink(true)
                    }}>创建同步任务</Button>
                    {wechatError && <Alert color="failure">{wechatError}</Alert>}
                    {wechatTasks.length === 0 && <Alert color="info">当前没有同步任务。</Alert>}
                    {wechatTasks.map(task => {
                        const progress = {
                            download: { value: 10, text: '正在下载文章' },
                            imageClassification: { value: 25, text: '正在分类图片' },
                            sanitization: { value: 40, text: '正在清理内容' },
                            translation: { value: 65, text: '正在翻译内容' },
                            savingImages: { value: 85, text: '正在保存图片' },
                            creatingPost: { value: 95, text: '正在创建文章' },
                            cancelling: { value: 100, text: '正在取消并清理' },
                            error: { value: 100, text: '错误' }
                        }[task.status]
                        return <Card key={task.id} theme={{ root: {
                            base: 'flex rounded-3xl border-0 bg-gray-50 shadow-none',
                            children: 'flex h-full flex-col justify-center gap-3 p-5'
                        } }}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <h3 className="break-words font-semibold text-gray-900">{task.title || `无标题`}</h3>
                                    <p className="text-sm text-gray-500">{new Date(task.startedAt).toLocaleString('zh-CN')}</p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    {task.status === 'error' && <Button pill size="sm" color="alternative"
                                                                        disabled={!task.canCancel || deletingWeChat.includes(task.id)}
                                                                        onClick={async () => {
                                                                            setDeletingWeChat(ids => [ ...ids, task.id ])
                                                                            setWeChatError('')
                                                                            try {
                                                                                await retryFailedWeChatTask(task.id)
                                                                                setWeChatTasks(await getWeChatTasks())
                                                                            } catch (error) {
                                                                                if (!handlePermissionError(error)) setWeChatError('重试任务失败，请稍后再试。')
                                                                            } finally {
                                                                                setDeletingWeChat(ids => ids.filter(id => id !== task.id))
                                                                            }
                                                                        }}>重试</Button>}
                                <Button pill size="sm" color={task.status === 'error' ? 'red' : 'alternative'}
                                        disabled={!task.canCancel || task.status === 'cancelling' || deletingWeChat.includes(task.id)}
                                        onClick={async () => {
                                            setDeletingWeChat(ids => [...ids, task.id])
                                            setWeChatError('')
                                            try {
                                                await deleteWeChatTask(task.id)
                                                setWeChatTasks(await getWeChatTasks())
                                            } catch (error) {
                                                if (!handlePermissionError(error)) setWeChatError('删除任务失败，请重试。')
                                            } finally { setDeletingWeChat(ids => ids.filter(id => id !== task.id)) }
                                        }}>{task.status === 'error' ? '删除任务' : '取消任务'}</Button>
                            </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1"><Progress progress={progress.value} color={task.status === 'error' ? 'red' : 'blue'} aria-label={`${task.title || task.id}: ${progress.text}`}/></div>
                                <span role="status" className="text-sm text-gray-600">{progress.text}</span>
                            </div>
                            {task.error && <Alert color="failure">{task.error}</Alert>}
                        </Card>
                    })}
                </div>
            </ModalBody>
        </Modal>

        <div className="p-8">
            <div className="flex gap-3 mb-1">
                <If condition={canWrite && type === EntityType.post}>
                    <Button pill color="blue" disabled={openingWeChat} onClick={async () => {
                        setOpeningWeChat(true)
                        setWeChatError('')
                        try {
                            const tasks = await getWeChatTasks()
                            setWeChatTasks(tasks)
                            if (tasks.length) setShowWeChatTasks(true)
                            else setShowWeChatLink(true)
                        } catch (error) {
                            if (!handlePermissionError(error)) {
                                setWeChatError('读取同步任务失败，请重试。')
                                setShowWeChatTasks(true)
                            }
                        } finally { setOpeningWeChat(false) }
                    }}>同步微信公众号文章</Button>
                </If>
                <If condition={canWrite}>
                    <Button pill color="blue" className="mb-3"
                            onClick={() => setShowCreate(true)}>
                        <If condition={type === EntityType.post}>手动</If>创建
                    </Button>
                </If>
            </div>
            <div className="mb-5">
                <TextInput
                    className="max-w-sm"
                    placeholder="搜索标题、作者及全文..."
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value)
                        setCurrentPage(0)
                    }}
                />
            </div>
            <If condition={page.pages > 0}>
                <div className="grid grid-cols-3 2xl:grid-cols-4 gap-4 mb-3">
                    {page.items.filter(post => post.slug !== 'temporary-slug').map(post => <Link
                        href={post.type === EntityType.page ? `/studio/pages/${post.id}/editor` : `/studio/editor/${post.id}`}
                        className="block rounded-3xl bg-gray-50 hover:bg-gray-100 hover:shadow-lg transition-all duration-100"
                        key={post.id}>
                        <If condition={post.coverImageDraft != null}>
                            <img src={`${uploadServePath}/${post.coverImageDraft?.sha1}_thumb.webp`}
                                 alt={post.coverImageDraft?.altText ?? ''}
                                 className="object-cover w-full rounded-3xl h-48"/>
                        </If>
                        <If condition={post.coverImageDraft == null}>
                            <div className="w-full h-32 rounded-3xl from-blue-300 to-blue-500 bg-gradient-to-tr"/>
                        </If>

                        <div className="p-8">
                            <p className="text-xl font-bold mb-1">{post.titleDraftZH}</p>
                            <p className="text-sm secondary">更新于 {post.updatedAt.toLocaleString()}</p>
                        </div>
                    </Link>)}
                </div>
                <Pagination currentPage={currentPage + 1} onPageChange={p => setCurrentPage(p - 1)}
                            totalPages={page.pages}/>
            </If>
        </div>
    </>
}

'use client'

import If from '@/app/lib/If'
import {
    Badge,
    Button,
    Datepicker,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    TabItem,
    Tabs,
    TabsRef,
    TextInput
} from 'flowbite-react'
import {
    HiArrowLeft,
    HiCalendarDays,
    HiCheckCircle,
    HiClock,
    HiLanguage,
    HiLink,
    HiNewspaper,
    HiPencil,
    HiPhoto,
    HiTag,
    HiUser
} from 'react-icons/hi2'
import { HiCloudUpload, HiSearch } from 'react-icons/hi'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SimpleMarkdownEditor from '@/app/studio/editor/SimpleMarkdownEditor'
import Markdown from 'react-markdown'
import ApprovalProcess from '@/app/lib/approval/ApprovalProcess'
import { useEntityLock } from '@/app/lib/lock/useEntityLock'
import { useImagePlaceholders } from '@/app/studio/media/useImagePlaceholders'
import MediaPicker from '@/app/studio/media/MediaPicker'
import LockBrokenPrompt from '@/app/lib/lock/LockBrokenPrompt'
import { useSavableEntity } from '@/app/lib/save/useSavableEntity'
import { useSaveShortcut } from '@/app/lib/save/useSaveShortcuts'
import { HydratedContentEntity } from '@/app/lib/data-types'
import {
    alignContentEntity,
    deleteContentEntity,
    getContentEntity,
    unpublishContentEntity,
    updateContentEntity
} from '@/app/studio/editor/entity-actions'
import { Role, User } from '@/generated/prisma/browser'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'

export default function ContentEntityEditor({ init, user, lockToken, uploadPrefix }: {
    init: HydratedContentEntity,
    user: User,
    lockToken: string,
    uploadPrefix: string
}) {
    const [ loadingAdditional, setLoadingAdditional ] = useState(false)
    const [ showLockBroken, setShowLockBroken ] = useState(false)
    const [ showMediaLibrary, setShowMediaLibrary ] = useState(false)
    const [ showTitleForm, setShowTitleForm ] = useState(false)
    const [ showShortContentForm, setShowShortContentForm ] = useState(false)
    const [ showSlugForm, setShowSlugForm ] = useState(false)
    const [ showDateForm, setShowDateForm ] = useState(false)
    const [ showCategoryForm, setShowCategoryForm ] = useState(false)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ unpublishConfirm, setUnpublishConfirm ] = useState(false)
    const [ markdownContent, setMarkdownContent ] = useState(init.contentDraftZH)
    const [ inEnglish, setInEnglish ] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [ _, setActiveTab ] = useState(0)
    const tabsRef = useRef<TabsRef>(null)
    const router = useRouter()
    const canWrite = user.roles.includes(Role.writer)
    const canModerate = user.roles.includes(Role.editor)
    const {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    const { previewContent } = useImagePlaceholders({
        markdown: markdownContent,
        uploadPrefix
    })

    useEffect(() => {
        if (location.hash === '#approval') {
            setActiveTab(2)
        } else if (location.hash === '#preview') {
            setActiveTab(1)
        }
    }, [])

    // = Switch language
    function switchLanguage() {
        if (inEnglish) {
            setMarkdownContent(post.contentDraftZH)
            setInEnglish(false)
        } else {
            setMarkdownContent(post.contentDraftEN)
            setInEnglish(true)
        }
    }

    // = Save
    const {
        draft: post,
        setDraft: setPost,
        hasChanges,
        loading,
        save,
        refresh
    } = useSavableEntity({
        initial: init,
        saveFn: async draft => await updateContentEntity({
            id: draft.id,
            titleDraftEN: draft.titleDraftEN,
            titleDraftZH: draft.titleDraftZH,
            categoryEN: draft.categoryEN,
            categoryZH: draft.categoryZH,
            slug: draft.slug,
            contentDraftEN: draft.contentDraftEN,
            contentDraftZH: draft.contentDraftZH,
            shortContentDraftEN: draft.shortContentDraftEN,
            shortContentDraftZH: draft.shortContentDraftZH,
            coverImageDraftId: draft.coverImageDraft?.id,
            createdAt: draft.createdAt
        }),
        refreshFn: async () => (await getContentEntity(init.id))!,
        compareKeys: [
            'titleDraftEN',
            'titleDraftZH',
            'categoryEN',
            'categoryZH',
            'slug',
            'coverImageDraft.id',
            'contentDraftEN',
            'contentDraftZH',
            'shortContentDraftEN',
            'shortContentDraftZH',
            'createdAt'
        ]
    })

    async function guardedSave() {
        if (!canWrite) {
            showPermissionDenied()
            return
        }
        try {
            await save()
        } catch (error) {
            if (!handlePermissionError(error)) {
                console.error('Failed to save content entity:', error)
            }
        }
    }

    useSaveShortcut(true, guardedSave)

    // = Locking
    useEntityLock({
        entityType: init.type,
        entityId: post.id,
        token: lockToken,
        hasChanges,
        onLockLost: () => setShowLockBroken(true)
    })

    const isPublished = post.contentPublishedEN === post.contentDraftEN &&
        post.contentPublishedZH === post.contentDraftZH
    const isDraft = post.contentPublishedEN == null && post.contentPublishedZH == null
    const statusLabel = isPublished ? '已发布' : isDraft ? '草稿' : '有更新未发布'
    const displayedShortContent = inEnglish ? post.shortContentDraftEN : post.shortContentDraftZH
    const editButtonClass = 'shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600'

    return <>
        <Modal show={showTitleForm} size="md" popup onClose={() => setShowTitleForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改标题</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="title-zh">标题 (中文)</Label>
                        </div>
                        <TextInput id="title-zh" value={post.titleDraftZH} placeholder="世界因我更美好"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           titleDraftZH: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="title-en">标题 (英文)</Label>
                        </div>
                        <TextInput id="title-en" value={post.titleDraftEN} placeholder="Better Me, Better World"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           titleDraftEN: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <p className="text-sm">英文标题请使用正确大小写，如 Old Meets New: BAID Beijing Cultural
                        Exploration</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={() => setShowTitleForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showShortContentForm} size="md" popup onClose={() => setShowShortContentForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改短内容</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="sc-zh">短内容 (中文)</Label>
                        </div>
                        <TextInput id="sc-zh" value={post.shortContentDraftZH ?? ''}
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           shortContentDraftZH: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="sc-en">短内容 (英文)</Label>
                        </div>
                        <TextInput id="sc-en" value={post.shortContentDraftEN ?? ''}
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           shortContentDraftEN: value
                                       }))
                                   }}
                                   required/>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading}
                        onClick={() => setShowShortContentForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showCategoryForm} size="md" popup onClose={() => setShowCategoryForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改类别</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="category-zh">类别 (中文)</Label>
                        </div>
                        <TextInput id="category-zh" value={post.categoryZH ?? ''} placeholder="世界因我更美好"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           categoryZH: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="category-en">类别 (英文)</Label>
                        </div>
                        <TextInput id="category-en" value={post.categoryEN ?? ''} placeholder="Better Me, Better World"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           categoryEN: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <p className="text-sm">英文类别请使用正确大小写，如 AP Courses</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={() => setShowCategoryForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showSlugForm} size="md" popup onClose={() => setShowSlugForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改链接位置</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="slug">链接位置</Label>
                        </div>
                        <TextInput id="slug" value={post.slug} placeholder="better-me-better-world"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           slug: value
                                       }))
                                   }}
                                   required/>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={() => setShowSlugForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showDateForm} size="md" popup onClose={() => setShowDateForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改显示日期</h3>
                    <div>
                        <Datepicker inline weekStart={1}
                                    value={typeof post.createdAt === 'string' ? new Date(post.createdAt) : post.createdAt}
                                    lang="zh-CN"
                                    onChange={d => {
                                        const date = d ?? new Date()
                                        setPost(prev => ({
                                            ...prev,
                                            createdAt: date
                                        }))
                                    }}/>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={() => setShowDateForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        <LockBrokenPrompt show={showLockBroken} returnUri="/studio"/>
        <MediaPicker open={showMediaLibrary} onClose={() => setShowMediaLibrary(false)} allowUnpick={false}
                     onPick={image => {
                         if (!canWrite) {
                             showPermissionDenied()
                             return
                         }
                         setPost(prev => ({
                             ...prev,
                             coverImageDraft: image!,
                             coverImageDraftId: image!.id
                         }))
            setShowMediaLibrary(false)
        }}/>

        <div className="mx-auto max-w-[1600px] pb-12">
            <header className="mb-6 border-b border-gray-200 pb-6">
                <button type="button" onClick={() => router.back()}
                        className="mb-5 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900">
                    <HiArrowLeft className="h-4 w-4"/>
                    返回内容列表
                </button>
                <div className="flex items-end justify-between gap-8">
                    <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-sm font-medium text-blue-600">内容编辑</p>
                            <Badge color={isPublished ? 'success' : isDraft ? 'gray' : 'warning'}>
                                {statusLabel}
                            </Badge>
                        </div>
                        <h1 className="truncate text-3xl font-bold tracking-tight text-gray-900">
                            {inEnglish ? post.titleDraftEN : post.titleDraftZH}
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">
                            {hasChanges ? '有尚未保存的更改' : `上次更新于 ${post.updatedAt.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <Button pill color="alternative" onClick={switchLanguage}>
                            <HiLanguage className="mr-2 h-4 w-4"/>
                            {inEnglish ? 'English · 切换到中文' : '中文 · Switch to English'}
                        </Button>
                        <If condition={canWrite}>
                            <Button pill color="blue"
                                    disabled={loading}
                                    onClick={guardedSave}>
                                <HiCheckCircle className="mr-2 h-4 w-4"/>
                                {loading ? '正在保存...' : '保存更改'}
                            </Button>
                        </If>
                    </div>
                </div>
            </header>

            <Tabs aria-label="文章编辑器选项卡" variant="default" ref={tabsRef}
                  onActiveTabChange={(tab) => setActiveTab(tab)}>
                <TabItem active title="内容" icon={HiNewspaper}>
                    <div className="mt-5 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                        <section className="min-w-0 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex items-center justify-between px-1">
                                <div>
                                    <h2 className="font-semibold text-gray-900">正文</h2>
                                    <p className="text-sm text-gray-500">
                                        正在编辑{inEnglish ? '英文' : '中文'}版本
                                    </p>
                                </div>
                                <span
                                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
                                    {inEnglish ? 'EN' : '中文'}
                                </span>
                            </div>
                            <SimpleMarkdownEditor
                                className="rounded-xl shadow-none"
                                value={markdownContent}
                                readOnly={!canWrite}
                                onChange={(content: string) => {
                                    if (!canWrite) {
                                        showPermissionDenied()
                                        return
                                    }
                                    setMarkdownContent(content)
                                    if (inEnglish) {
                                        setPost(prev => ({ ...prev, contentDraftEN: content }))
                                    } else {
                                        setPost(prev => ({ ...prev, contentDraftZH: content }))
                                    }
                                }}/>
                        </section>

                        <aside className="space-y-4">
                            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            标题
                                        </p>
                                        <h2 className="text-lg font-bold leading-snug text-gray-900">
                                            {inEnglish ? post.titleDraftEN : post.titleDraftZH}
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {inEnglish ? post.titleDraftZH : post.titleDraftEN}
                                        </p>
                                    </div>
                                    <If condition={canWrite}>
                                        <button type="button" className={editButtonClass} aria-label="编辑标题"
                                                onClick={() => setShowTitleForm(true)}>
                                            <HiPencil className="h-4 w-4"/>
                                        </button>
                                    </If>
                                </div>

                                <div className="space-y-4 border-t border-gray-100 pt-4">
                                    <div className="flex gap-3">
                                        <HiLink className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"/>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-gray-500">链接位置</p>
                                            <p className="truncate text-sm text-gray-900">{post.slug}</p>
                                        </div>
                                        <If condition={canWrite}>
                                            <button type="button" className={editButtonClass} aria-label="编辑链接位置"
                                                    onClick={() => setShowSlugForm(true)}>
                                                <HiPencil className="h-4 w-4"/>
                                            </button>
                                        </If>
                                    </div>
                                    <div className="flex gap-3">
                                        <HiTag className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"/>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-gray-500">类别</p>
                                            <p className="text-sm text-gray-900">
                                                {inEnglish ? post.categoryEN : post.categoryZH || '尚未设置'}
                                            </p>
                                        </div>
                                        <If condition={canWrite}>
                                            <button type="button" className={editButtonClass} aria-label="编辑类别"
                                                    onClick={() => setShowCategoryForm(true)}>
                                                <HiPencil className="h-4 w-4"/>
                                            </button>
                                        </If>
                                    </div>
                                    <div className="flex gap-3">
                                        <HiNewspaper className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"/>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-gray-500">短内容</p>
                                            <p className="line-clamp-3 text-sm leading-5 text-gray-900">
                                                {displayedShortContent || '尚未设置'}
                                            </p>
                                        </div>
                                        <If condition={canWrite}>
                                            <button type="button" className={editButtonClass} aria-label="编辑短内容"
                                                    onClick={() => setShowShortContentForm(true)}>
                                                <HiPencil className="h-4 w-4"/>
                                            </button>
                                        </If>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <h2 className="mb-4 font-semibold text-gray-900">发布信息</h2>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <HiCheckCircle className="mt-0.5 h-5 w-5 text-gray-400"/>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500">状态</p>
                                            <p className="text-sm text-gray-900">{statusLabel}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <HiCalendarDays className="mt-0.5 h-5 w-5 text-gray-400"/>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-gray-500">显示日期</p>
                                            <p className="text-sm text-gray-900">
                                                {(typeof post.createdAt === 'string' ?
                                                    new Date(post.createdAt) : post.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <If condition={canWrite}>
                                            <button type="button" className={editButtonClass} aria-label="编辑显示日期"
                                                    onClick={() => setShowDateForm(true)}>
                                                <HiPencil className="h-4 w-4"/>
                                            </button>
                                        </If>
                                    </div>
                                    <div className="flex gap-3">
                                        <HiClock className="mt-0.5 h-5 w-5 text-gray-400"/>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500">最新更改</p>
                                            <p className="text-sm text-gray-900">{post.updatedAt.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <HiUser className="mt-0.5 h-5 w-5 text-gray-400"/>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500">创建用户</p>
                                            <p className="text-sm text-gray-900">{post.creator.name}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between p-5 pb-3">
                                    <div>
                                        <h2 className="font-semibold text-gray-900">封面图片</h2>
                                        <p className="text-xs text-gray-500">用于列表及文章顶部展示</p>
                                    </div>
                                    <HiPhoto className="h-5 w-5 text-gray-400"/>
                                </div>
                                <If condition={canWrite}>
                                    <button type="button"
                                            aria-label={post.coverImageDraft != null ? '更换封面图片' : '选择封面图片'}
                                            onClick={() => setShowMediaLibrary(true)}
                                            className="block w-full text-left">
                                        <If condition={post.coverImageDraft != null}>
                                            <img
                                                className="h-40 w-full object-cover transition-opacity hover:opacity-90"
                                                alt={post.coverImageDraft?.altText ?? ''}
                                                src={`${uploadPrefix}/${post.coverImageDraft?.sha1}_thumb.webp`}/>
                                        </If>
                                        <If condition={post.coverImageDraft == null}>
                                            <div
                                                className="m-5 mt-1 flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600">
                                                选择封面图片
                                            </div>
                                        </If>
                                    </button>
                                </If>
                                <If condition={!canWrite}>
                                    <div className="block w-full text-left">
                                        <If condition={post.coverImageDraft != null}>
                                            <img className="h-40 w-full object-cover"
                                                 alt={post.coverImageDraft?.altText ?? ''}
                                                 src={`${uploadPrefix}/${post.coverImageDraft?.sha1}_thumb.webp`}/>
                                        </If>
                                        <If condition={post.coverImageDraft == null}>
                                            <div
                                                className="m-5 mt-1 flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
                                                尚未设置封面图片
                                            </div>
                                        </If>
                                    </div>
                                </If>
                            </section>

                            <If condition={canModerate}>
                                <section className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-500">
                                        内容管理
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <If condition={post.contentPublishedEN != null || post.contentPublishedZH != null}>
                                            <Button disabled={loadingAdditional}
                                                    size="xs" color="red" outline onClick={async () => {
                                                if (!canModerate) {
                                                    showPermissionDenied()
                                                    return
                                                }
                                                if (!unpublishConfirm) {
                                                    setUnpublishConfirm(true)
                                                    return
                                                }
                                                setLoadingAdditional(true)
                                                try {
                                                    await unpublishContentEntity(post.id)
                                                    await refresh()
                                                    router.refresh()
                                                } catch (error) {
                                                    if (!handlePermissionError(error)) {
                                                        console.error('Failed to unpublish content entity:', error)
                                                    }
                                                } finally {
                                                    setLoadingAdditional(false)
                                                }
                                            }}>
                                                {unpublishConfirm ? '确认撤回?' : '撤回发布'}
                                            </Button>
                                        </If>
                                        <Button disabled={loadingAdditional}
                                                size="xs" color="red" outline onClick={async () => {
                                            if (!canModerate) {
                                                showPermissionDenied()
                                                return
                                            }
                                            if (!deleteConfirm) {
                                                setDeleteConfirm(true)
                                                return
                                            }
                                            setLoadingAdditional(true)
                                            try {
                                                await deleteContentEntity(post.id)
                                                router.push('/studio')
                                            } catch (error) {
                                                if (!handlePermissionError(error)) {
                                                    console.error('Failed to delete content entity:', error)
                                                }
                                            } finally {
                                                setLoadingAdditional(false)
                                            }
                                        }}>{deleteConfirm ? '确认删除?' : '删除内容'}</Button>
                                    </div>
                                </section>
                            </If>
                        </aside>
                    </div>
                </TabItem>
                <TabItem title="预览" icon={HiSearch}>
                    <div className="mx-auto mt-5 max-w-5xl">
                        <div
                            className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3">
                            <div>
                                <p className="font-medium text-gray-900">内容预览</p>
                                <p className="text-sm text-gray-500">预览仅用于检查内容，发布效果可能略有不同。</p>
                            </div>
                            <Button pill size="sm" color="alternative" onClick={switchLanguage}>
                                <HiLanguage className="mr-2 h-4 w-4"/>
                                {inEnglish ? '查看中文' : 'View in English'}
                            </Button>
                        </div>
                        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                            <If condition={post.coverImageDraft != null}>
                                <img className="h-80 w-full object-cover" alt={post.coverImageDraft?.altText ?? ''}
                                     src={`${uploadPrefix}/${post.coverImageDraft?.sha1}.webp`}/>
                            </If>
                            <article className="p-10">
                                <h1>{inEnglish ? post.titleDraftEN : post.titleDraftZH}</h1>
                                <Markdown>{previewContent}</Markdown>
                            </article>
                        </div>
                    </div>
                </TabItem>
                <TabItem title="审核与发布" icon={HiCloudUpload}>
                    <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <ApprovalProcess entityType={init.type} entityId={post.id} entity={post} doAlign={async () => {
                            await alignContentEntity(post.id)
                            await refresh()
                        }}/>
                    </div>
                </TabItem>
            </Tabs>
        </div>
    </>
}

'use client'

import If from '@/app/lib/If'
import {
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
import { HiNewspaper, HiPencil } from 'react-icons/hi2'
import { HiCloudUpload, HiSearch } from 'react-icons/hi'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ApprovalProcess from '@/app/lib/approval/ApprovalProcess'
import { useEntityLock } from '@/app/lib/lock/useEntityLock'
import MediaPicker from '@/app/studio/media/MediaPicker'
import LockBrokenPrompt from '@/app/lib/lock/LockBrokenPrompt'
import { useSavableEntity } from '@/app/lib/save/useSavableEntity'
import { useSaveShortcut } from '@/app/lib/save/useSaveShortcuts'
import { HydratedContentEntity } from '@/app/lib/data-types'
import { alignContentEntity,
    deleteContentEntity,
    getContentEntity,
    unpublishContentEntity,
    updateContentEntity
} from '@/app/studio/editor/entity-actions'
import { Role, User } from '@/generated/prisma/browser'
import { requestContentReview } from '@/app/lib/approval/approval-actions'
import { Data, Puck } from '@measured/puck'
import { Render } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import '@measured/puck/puck.css'
import '@/app/studio/pages/[id]/editor/editor-theme.css'

type PuckDraftData = Data

function createEmptyPuckData(): PuckDraftData {
    return {
        content: [],
        root: { props: {} },
        zones: {}
    }
}

function parsePuckData(raw: string): PuckDraftData {
    try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
            return parsed as PuckDraftData
        }
    } catch {
    }

    return createEmptyPuckData()
}

function formatDateLabel(value: Date | string) {
    const date = typeof value === 'string' ? new Date(value) : value
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

function formatDateTimeLabel(value: Date | string) {
    const date = typeof value === 'string' ? new Date(value) : value
    return date.toLocaleString('zh-CN')
}

function SidebarEditButton({ label, onClick }: {
    label: string
    onClick: () => void
}) {
    return <button
        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm transition-colors hover:bg-blue-600"
        aria-label={label}
        onClick={onClick}
        type="button"
    >
        <HiPencil className="text-sm"/>
    </button>
}

function SidebarBlock({ label, children, action }: {
    label: string
    children: React.ReactNode
    action?: React.ReactNode
}) {
    return <section className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-sm font-bold secondary">{label}</p>
            {action}
        </div>
        <div className="space-y-1">
            {children}
        </div>
    </section>
}

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
    const [ requestConfirm, setRequestConfirm ] = useState(false)
    const [ showInfoSidebar, setShowInfoSidebar ] = useState(true)
    const [ inEnglish, setInEnglish ] = useState(false)
    const tabsRef = useRef<TabsRef>(null)
    const router = useRouter()

    useEffect(() => {
        function syncTabWithHash() {
            if (location.hash === '#approval') {
                tabsRef.current?.setActiveTab(2)
                return
            }
            if (location.hash === '#preview') {
                tabsRef.current?.setActiveTab(1)
                return
            }
            tabsRef.current?.setActiveTab(0)
        }

        syncTabWithHash()
        window.addEventListener('hashchange', syncTabWithHash)
        return () => {
            window.removeEventListener('hashchange', syncTabWithHash)
        }
    }, [])

    function updateTabHash(tab: number) {
        const url = new URL(window.location.href)
        url.hash = tab === 1 ? 'preview' : tab === 2 ? 'approval' : ''
        window.history.replaceState(null, '', url.toString())
    }

    function activateTab(tab: number) {
        tabsRef.current?.setActiveTab(tab)
        updateTabHash(tab)
    }

    // = Switch language
    function switchLanguage() {
        setInEnglish(prev => !prev)
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
            contentDraftEN: typeof draft.contentDraftEN === 'string' ? draft.contentDraftEN : JSON.stringify(draft.contentDraftEN),
            contentDraftZH: typeof draft.contentDraftZH === 'string' ? draft.contentDraftZH : JSON.stringify(draft.contentDraftZH),
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
    useSaveShortcut(true, save)

    const contentDraftENRef = useRef(post.contentDraftEN)
    const contentDraftZHRef = useRef(post.contentDraftZH)
    const [ contentDraftENData, setContentDraftENData ] = useState<PuckDraftData>(() => parsePuckData(init.contentDraftEN))
    const [ contentDraftZHData, setContentDraftZHData ] = useState<PuckDraftData>(() => parsePuckData(init.contentDraftZH))

    useEffect(() => {
        if (post.contentDraftEN === contentDraftENRef.current) return
        contentDraftENRef.current = post.contentDraftEN
        setContentDraftENData(parsePuckData(post.contentDraftEN))
    }, [ post.contentDraftEN ])

    useEffect(() => {
        if (post.contentDraftZH === contentDraftZHRef.current) return
        contentDraftZHRef.current = post.contentDraftZH
        setContentDraftZHData(parsePuckData(post.contentDraftZH))
    }, [ post.contentDraftZH ])

    // = Locking
    useEntityLock({
        entityType: init.type,
        entityId: post.id,
        userId: user.id,
        initialToken: lockToken,
        hasChanges,
        onLockLost: () => setShowLockBroken(true)
    })

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

        <LockBrokenPrompt show={showLockBroken} returnUri="/studio"/>
        <MediaPicker open={showMediaLibrary} onClose={() => setShowMediaLibrary(false)} allowUnpick={false}
                     onPick={image => {
                         setPost(prev => ({
                             ...prev,
                             coverImageDraft: image!,
                             coverImageDraftId: image!.id
                         }))
            setShowMediaLibrary(false)
        }}/>

        <Tabs aria-label="文章编辑器选项卡" variant="default" ref={tabsRef}
              onActiveTabChange={tab => updateTabHash(tab)}>
            <TabItem active title="内容" icon={HiNewspaper}>
                <div className="flex min-h-screen w-full items-start gap-6 px-6 py-6 xl:gap-8">
                    <div className="flex-1 min-w-0">
                        <Puck
                            key={inEnglish ? 'en' : 'zh'}
                            config={PUCK_CONFIG}
                            data={inEnglish ? contentDraftENData : contentDraftZHData}
                            onChange={data => {
                                const nextContent = JSON.stringify(data)
                                if (inEnglish) {
                                    contentDraftENRef.current = nextContent
                                    setContentDraftENData(data as PuckDraftData)
                                    setPost(prev => ({ ...prev, contentDraftEN: nextContent }))
                                } else {
                                    contentDraftZHRef.current = nextContent
                                    setContentDraftZHData(data as PuckDraftData)
                                    setPost(prev => ({ ...prev, contentDraftZH: nextContent }))
                                }
                            }}
                            overrides={{
                                headerActions: () => <div className="puck-editor-actions flex min-w-max items-center justify-end gap-2 whitespace-nowrap">
                                    <Button
                                        pill
                                        color="alternative"
                                        className="shrink-0 whitespace-nowrap"
                                        onClick={() => setShowInfoSidebar(prev => !prev)}
                                    >
                                        {showInfoSidebar ? '隐藏信息栏' : '显示信息栏'}
                                    </Button>
                                    <Button
                                        pill
                                        color="alternative"
                                        className="shrink-0 whitespace-nowrap"
                                        onClick={switchLanguage}
                                    >
                                        切换到{inEnglish ? '中文' : '英文'}
                                    </Button>
                                    <Button
                                        pill
                                        color="alternative"
                                        className="shrink-0 whitespace-nowrap"
                                        onClick={() => activateTab(2)}
                                    >
                                        审核与发布
                                    </Button>
                                    <Button
                                        pill
                                        className="shrink-0 whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
                                        disabled={loading}
                                        onClick={save}
                                    >
                                        保存更改
                                    </Button>
                                </div>
                            }}
                        />
                    </div>
                    <If condition={showInfoSidebar}>
                    <div className="w-72 shrink-0 xl:w-80">
                        <div className="sticky top-6 space-y-4 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-bold">内容信息</h3>
                                    <p className="mt-1 text-sm secondary">快速修改元信息和发布状态。</p>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-full px-3 py-1 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                    onClick={() => setShowInfoSidebar(false)}
                                    aria-label="隐藏内容信息栏"
                                >
                                    隐藏
                                </button>
                            </div>

                            <Button pill color="blue" className="w-full"
                                    disabled={loadingAdditional || !user.roles.includes(Role.writer)}
                                    onClick={async () => {
                                        if (!requestConfirm) {
                                            setRequestConfirm(true)
                                            return
                                        }
                                        setLoadingAdditional(true)
                                        await requestContentReview({ entityType: init.type, entityId: post.id })
                                        setLoadingAdditional(false)
                                        setRequestConfirm(false)
                                        await refresh()
                                        router.refresh()
                                    }}>{requestConfirm ? '确认请求审核？' : '请求审核'}</Button>

                            <SidebarBlock
                                label="标题"
                                action={<SidebarEditButton label="编辑标题" onClick={() => setShowTitleForm(true)}/>}
                            >
                                <p className="text-2xl font-bold leading-tight">{post.titleDraftZH}</p>
                                <p className="text-base secondary">{post.titleDraftEN}</p>
                            </SidebarBlock>

                            <SidebarBlock
                                label="链接位置"
                                action={<SidebarEditButton label="编辑链接位置" onClick={() => setShowSlugForm(true)}/>}
                            >
                                <p className="break-all text-base font-medium">{post.slug}</p>
                            </SidebarBlock>

                            <SidebarBlock
                                label="类别"
                                action={<SidebarEditButton label="编辑类别" onClick={() => setShowCategoryForm(true)}/>}
                            >
                                <p className="text-base font-medium">{post.categoryZH || '暂未设置'}</p>
                                <p className="text-sm secondary">{post.categoryEN || 'Not set yet'}</p>
                            </SidebarBlock>

                            <SidebarBlock
                                label="短内容"
                                action={<SidebarEditButton label="编辑短内容" onClick={() => setShowShortContentForm(true)}/>}
                            >
                                <p className="text-sm leading-6 text-gray-700">
                                    {post.shortContentDraftZH || post.shortContentDraftEN || '还没有填写短内容'}
                                </p>
                            </SidebarBlock>

                            <SidebarBlock label="状态">
                                <p className="text-base font-medium">
                                    <If condition={post.contentPublishedEN === post.contentDraftEN && post.contentPublishedZH === post.contentDraftZH}>
                                        已发布
                                    </If>
                                    <If condition={post.contentPublishedEN == null && post.contentPublishedZH == null}>
                                        草稿
                                    </If>
                                    <If condition={(post.contentPublishedEN !== post.contentDraftEN || post.contentPublishedZH !== post.contentDraftZH) && post.contentPublishedEN != null && post.contentPublishedZH != null}>
                                        有更新未发布
                                    </If>
                                </p>
                            </SidebarBlock>

                            <SidebarBlock
                                label="显示日期"
                                action={<SidebarEditButton label="编辑显示日期" onClick={() => setShowDateForm(true)}/>}
                            >
                                <p className="text-base font-medium">{formatDateLabel(post.createdAt)}</p>
                            </SidebarBlock>

                            <SidebarBlock label="最新更改">
                                <p className="text-sm">{formatDateTimeLabel(post.updatedAt)}</p>
                            </SidebarBlock>

                            <SidebarBlock label="封面">
                                <If condition={post.coverImageDraft != null}>
                                    <button onClick={() => setShowMediaLibrary(true)} className="block cursor-pointer overflow-hidden rounded-2xl" type="button">
                                        <img className="h-40 w-full object-cover" alt={post.coverImageDraft?.altText}
                                             src={`${uploadPrefix}/${post.coverImageDraft?.sha1}_thumb.webp`}/>
                                    </button>
                                </If>
                                <Button pill color="blue" className="w-full"
                                        onClick={() => setShowMediaLibrary(true)}>
                                    {post.coverImageDraft == null ? '设置封面' : '更换封面'}
                                </Button>
                            </SidebarBlock>

                            <SidebarBlock label="创建用户">
                                <p className="text-base font-medium">{post.creator.name}</p>
                            </SidebarBlock>

                            <div className="space-y-2 pt-1">
                                <If condition={post.contentPublishedEN != null || post.contentPublishedZH != null}>
                                    <Button disabled={loadingAdditional || !user.roles.includes(Role.editor)} pill color="red" className="w-full" onClick={async () => {
                                        if (!unpublishConfirm) { setUnpublishConfirm(true); return }
                                        setLoadingAdditional(true)
                                        await unpublishContentEntity(post.id)
                                        setLoadingAdditional(false)
                                        await refresh()
                                        router.refresh()
                                    }}>{unpublishConfirm ? '确认撤回?' : '撤回发布'}</Button>
                                </If>
                                <Button disabled={loadingAdditional || !user.roles.includes(Role.editor)} pill color="red" className="w-full" onClick={async () => {
                                    if (!deleteConfirm) { setDeleteConfirm(true); return }
                                    setLoadingAdditional(true)
                                    await deleteContentEntity(post.id)
                                    setLoadingAdditional(false)
                                    router.push('/studio')
                                }}>{deleteConfirm ? '确认删除?' : '删除'}</Button>
                            </div>
                        </div>
                    </div>
                    </If>
                </div>
            </TabItem>
            <TabItem title="预览" icon={HiSearch}>
                <div className="px-8 py-8">
                    <Button pill color="alternative" className="mb-5" onClick={switchLanguage}>
                        切换到{inEnglish ? '中文' : '英文'}
                    </Button>
                    <If condition={post.coverImageDraft != null}>
                        <img className="mb-5 h-64 w-full object-cover" alt={post.coverImageDraft?.altText}
                             src={`${uploadPrefix}/${post.coverImageDraft?.sha1}.webp`}/>
                    </If>
                    <article>
                        <h1>{inEnglish ? post.titleDraftEN : post.titleDraftZH}</h1>
                        <Render
                            config={PUCK_CONFIG}
                            data={inEnglish ? contentDraftENData : contentDraftZHData}
                        />
                    </article>
                </div>
            </TabItem>
            <TabItem title="审核与发布" icon={HiCloudUpload}>
                <div className="px-8 py-8">
                    <ApprovalProcess entityType={init.type} entityId={post.id} entity={post} doAlign={async () => {
                        await alignContentEntity(post.id)
                        await refresh()
                    }}/>
                </div>
            </TabItem>
        </Tabs>
    </>
}

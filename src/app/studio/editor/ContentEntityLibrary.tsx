'use client'

import { Paginated, SimplifiedContentEntity } from '@/app/lib/data-types'
import { useEffect, useMemo, useState } from 'react'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import {
    checkWeChatWorkerStatus,
    createContentEntity,
    createPostFromWeChat,
    getContentEntities,
    updateLibraryEntityMeta,
    updateLibraryLandingBlock
} from '@/app/studio/editor/entity-actions'
import {
    Button,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Pagination,
    Select,
    TextInput
} from 'flowbite-react'
import If from '@/app/lib/If'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WeChatWorkerStatus } from '@/app/studio/editor/entity-types'
import { EntityType, Role, User } from '@/generated/prisma/browser'
import { LIBRARY_CONFIG } from '@/app/studio/editor/library-config'
import { LibraryEntityPlacement, LibraryLandingBlock } from '@/app/studio/editor/library-types'

type EditableEntity = SimplifiedContentEntity & {
    editCategoryZH: string
    editCategoryEN: string
    editShortContentZH: string
    editShortContentEN: string
}

function toEditableEntity(entity: SimplifiedContentEntity): EditableEntity {
    return {
        ...entity,
        editCategoryZH: entity.categoryZH ?? '',
        editCategoryEN: entity.categoryEN ?? '',
        editShortContentZH: entity.shortContentDraftZH ?? '',
        editShortContentEN: entity.shortContentDraftEN ?? ''
    }
}

function getEditorPath(entity: SimplifiedContentEntity) {
    return entity.type === EntityType.page ? `/studio/pages/${entity.id}/editor` : `/studio/editor/${entity.id}`
}

function getPublicPath(entity: SimplifiedContentEntity) {
    return entity.slug ? `/zh/content/${new Date(entity.createdAt).getFullYear()}/${(new Date(entity.createdAt).getMonth() + 1).toString().padStart(2, '0')}/${new Date(entity.createdAt).getDate().toString().padStart(2, '0')}/${entity.slug}` : ''
}

function getStructureHint(type: EntityType) {
    const config = LIBRARY_CONFIG[type]
    if (!config.structureParentSlug) {
        return null
    }

    return `/studio/wangzhanjiegou`
}

function buildPlacementMap(blocks: LibraryLandingBlock[]) {
    const byEntityId = new Map<number, LibraryEntityPlacement[]>()

    for (const block of blocks) {
        for (const entityId of block.manualEntityIds) {
            const placements = byEntityId.get(entityId) ?? []
            placements.push({
                entityId,
                pageId: block.pageId,
                pageTitle: block.pageTitle,
                pageSlug: block.pageSlug,
                componentId: block.componentId,
                componentTitle: block.title,
                componentType: block.componentType
            })
            byEntityId.set(entityId, placements)
        }
    }

    return byEntityId
}

export default function ContentEntityLibrary({
    init,
    title,
    user,
    type,
    landingBlocks
}: {
    init: Paginated<SimplifiedContentEntity>
    title: string
    user: User
    type: EntityType
    landingBlocks: LibraryLandingBlock[]
}) {
    const config = LIBRARY_CONFIG[type]
    const [ page, setPage ] = useState<Paginated<EditableEntity>>({
        ...init,
        items: init.items.map(toEditableEntity)
    })
    const [ currentPage, setCurrentPage ] = useState(0)
    const [ showCreate, setShowCreate ] = useState(false)
    const [ postTitleEN, setPostTitleEN ] = useState('')
    const [ postTitleZH, setPostTitleZH ] = useState('')
    const [ search, setSearch ] = useState('')
    const [ debouncedSearch, setDebouncedSearch ] = useState('')
    const [ showWeChatLink, setShowWeChatLink ] = useState(false)
    const [ wechatLink, setWeChatLink ] = useState('')
    const [ wechatStatus, setWeChatStatus ] = useState<WeChatWorkerStatus>(WeChatWorkerStatus.idle)
    const [ loading, setLoading ] = useState(false)
    const [ uploadServePath, setUploadServePath ] = useState<string>('')
    const [ savingMetaId, setSavingMetaId ] = useState<number | null>(null)
    const [ placementSavingId, setPlacementSavingId ] = useState<number | null>(null)
    const [ statusMessage, setStatusMessage ] = useState('')
    const [ selectedBlockByEntityId, setSelectedBlockByEntityId ] = useState<Record<number, string>>({})
    const [ selectedPlacementByEntityId, setSelectedPlacementByEntityId ] = useState<Record<number, string>>({})

    const router = useRouter()
    const canRenderImages = uploadServePath !== ''

    const placementMap = useMemo(() => buildPlacementMap(landingBlocks), [ landingBlocks ])
    const blockOptions = useMemo(() => landingBlocks.map(block => ({
        value: `${block.pageId}:${block.componentId}`,
        label: `${block.pageTitle} / ${block.title}`
    })), [ landingBlocks ])

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(t)
    }, [ search ])

    useEffect(() => {
        ;(async () => {
            setUploadServePath(await getUploadServePath())
            setWeChatStatus(await checkWeChatWorkerStatus())
            const res = await getContentEntities(currentPage, type, debouncedSearch || undefined)
            setPage({
                ...res,
                items: res.items.map(toEditableEntity)
            })
        })()
    }, [ currentPage, debouncedSearch, type ])

    const categorySuggestions = config.categorySuggestions ?? []
    const canWrite = user.roles.includes(Role.writer)

    async function saveEntityMeta(entity: EditableEntity) {
        setSavingMetaId(entity.id)
        setStatusMessage('')
        try {
            const updated = await updateLibraryEntityMeta({
                id: entity.id,
                categoryEN: entity.editCategoryEN.trim() || null,
                categoryZH: entity.editCategoryZH.trim() || null,
                shortContentDraftEN: entity.editShortContentEN.trim() || null,
                shortContentDraftZH: entity.editShortContentZH.trim() || null
            })
            setPage(prev => ({
                ...prev,
                items: prev.items.map(item => item.id === entity.id ? toEditableEntity(updated) : item)
            }))
            setStatusMessage(`已更新「${updated.titleDraftZH}」的分类和摘要`)
        } finally {
            setSavingMetaId(null)
        }
    }

    async function attachEntityToBlock(entity: EditableEntity) {
        const blockKey = selectedBlockByEntityId[entity.id]
        if (!blockKey) {
            return
        }

        const [ pageIdRaw, componentId ] = blockKey.split(':')
        const pageId = Number(pageIdRaw)
        const block = landingBlocks.find(item => item.pageId === pageId && item.componentId === componentId)
        if (!block) {
            return
        }

        const nextIds = Array.from(new Set([ ...block.manualEntityIds, entity.id ]))

        setPlacementSavingId(entity.id)
        setStatusMessage('')
        try {
            await updateLibraryLandingBlock({
                pageId: block.pageId,
                componentId: block.componentId,
                entityType: type,
                selectedEntityIds: nextIds,
                categoryEN: block.categoryEN,
                categoryZH: block.categoryZH
            })
            const nextBlock = {
                ...block,
                manualEntityIds: nextIds
            }
            const nextBlocks = landingBlocks.map(item =>
                item.pageId === block.pageId && item.componentId === block.componentId ? nextBlock : item
            )
            const nextMap = buildPlacementMap(nextBlocks)
            const placements = nextMap.get(entity.id) ?? []
            setSelectedPlacementByEntityId(prev => ({
                ...prev,
                [entity.id]: placements[0] ? `${placements[0].pageId}:${placements[0].componentId}` : ''
            }))
            setStatusMessage(`已把「${entity.titleDraftZH}」加入 ${block.pageTitle} / ${block.title}`)
            router.refresh()
        } finally {
            setPlacementSavingId(null)
        }
    }

    async function removeEntityFromPlacement(entity: EditableEntity) {
        const placementKey = selectedPlacementByEntityId[entity.id]
        if (!placementKey) {
            return
        }

        const [ pageIdRaw, componentId ] = placementKey.split(':')
        const pageId = Number(pageIdRaw)
        const block = landingBlocks.find(item => item.pageId === pageId && item.componentId === componentId)
        if (!block) {
            return
        }

        const nextIds = block.manualEntityIds.filter(id => id !== entity.id)

        setPlacementSavingId(entity.id)
        setStatusMessage('')
        try {
            await updateLibraryLandingBlock({
                pageId: block.pageId,
                componentId: block.componentId,
                entityType: type,
                selectedEntityIds: nextIds,
                categoryEN: block.categoryEN,
                categoryZH: block.categoryZH
            })
            setSelectedPlacementByEntityId(prev => ({
                ...prev,
                [entity.id]: ''
            }))
            setStatusMessage(`已把「${entity.titleDraftZH}」从 ${block.pageTitle} / ${block.title} 移出`)
            router.refresh()
        } finally {
            setPlacementSavingId(null)
        }
    }

    return <>
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
                    <p className="text-sm">英文标题请使用正确大小写，如 Old Meets New: BAID Beijing Cultural Exploration</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button disabled={loading} pill color="blue" onClick={async () => {
                    if (!postTitleEN || !postTitleZH) return
                    setLoading(true)
                    const post = await createContentEntity(type, postTitleEN, postTitleZH)
                    setLoading(false)
                    setShowCreate(false)
                    router.push(getEditorPath(post))
                }}>创建</Button>
                <Button disabled={loading} pill color="alternative" onClick={() => setShowCreate(false)}>
                    取消
                </Button>
            </ModalFooter>
        </Modal>

        <Modal show={showWeChatLink} size="md" popup onClose={() => setShowWeChatLink(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">同步微信公众号文章</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="wechat-link">链接</Label>
                        </div>
                        <TextInput id="wechat-link" value={wechatLink} placeholder="https://mp.weixin.qq.com/..."
                                   onChange={e => setWeChatLink(e.currentTarget.value)}
                                   required/>
                    </div>
                    <p className="text-sm">同步需要 5 到 10 分钟。同步完成后，请检查排版、中文内容及自动翻译。图片会自动放入媒体库。</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button disabled={loading} pill color="blue" onClick={async () => {
                    if (!wechatLink) return
                    try {
                        const url = new URL(wechatLink)
                        if (url.hostname !== 'mp.weixin.qq.com') {
                            return
                        }
                    } catch {
                        return
                    }
                    await createPostFromWeChat(wechatLink, null)
                    setWeChatStatus(WeChatWorkerStatus.download)
                    setShowWeChatLink(false)
                }}>开始同步任务</Button>
                <Button disabled={loading} pill color="alternative" onClick={() => setShowWeChatLink(false)}>
                    取消
                </Button>
            </ModalFooter>
        </Modal>

        <div className="p-8">
            <div className="mb-6 rounded-[2rem] border border-gray-200 bg-[#faf7f2] p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">{config.title}</p>
                <h2 className="mt-2 text-3xl font-bold">{config.description}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                    {config.examples.map(example => (
                        <span key={example} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                            {example}
                        </span>
                    ))}
                </div>
                <If condition={!!config.sectionDescription}>
                    <p className="mt-4 max-w-4xl text-sm leading-7 text-gray-600">{config.sectionDescription}</p>
                </If>
            </div>

            <If condition={landingBlocks.length > 0}>
                <div className="mb-8 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">栏目联动</p>
                        <h3 className="text-2xl font-bold">这个内容库正在驱动哪些公开页面</h3>
                        <p className="text-sm leading-7 text-gray-600">
                            这里列的是当前可挂内容的栏目区块。你可以在下方把单条内容加入这些区块，公开页会自动显示。
                        </p>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {landingBlocks.map(block => (
                            <article key={`${block.pageId}-${block.componentId}`} className="rounded-[1.5rem] border border-gray-200 bg-[#faf7f2] p-4">
                                <p className="text-sm font-semibold text-[#7a1f1c]">{block.pageTitle}</p>
                                <h4 className="mt-2 text-lg font-bold">{block.title}</h4>
                                <p className="mt-2 text-sm text-gray-600">
                                    {block.componentType === 'EntityShowcaseConfig' ? '精选区' : '浏览区'}
                                    {block.categoryZH || block.categoryEN ? ` · ${block.categoryZH || block.categoryEN}` : ''}
                                </p>
                                <p className="mt-3 text-sm text-gray-600">当前已挂 {block.manualEntityIds.length} 条内容</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Link href={block.pageEditorPath} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm">
                                        编辑栏目页
                                    </Link>
                                    <Link href={block.pagePublicPath} className="rounded-full bg-[#7a1f1c] px-4 py-2 text-sm font-medium text-white shadow-sm">
                                        查看公开页
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                    <If condition={!!getStructureHint(type)}>
                        <div className="mt-5 rounded-[1.5rem] border border-dashed border-gray-300 bg-[#faf7f2] p-4 text-sm leading-7 text-gray-600">
                            这些内容除了能挂到栏目区块里，也建议在网站结构里给对应栏目配置子页面入口文案。这样公开页上的跳转卡片、顶部导航和页脚会保持一致。
                            <div className="mt-3">
                                <Link href={getStructureHint(type) ?? '/studio/wangzhanjiegou'} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm">
                                    打开网站结构编辑器
                                </Link>
                            </div>
                        </div>
                    </If>
                </div>
            </If>

            <div className="flex gap-3 mb-1">
                <If condition={type === EntityType.post}>
                    <Button pill
                            disabled={wechatStatus !== WeChatWorkerStatus.idle || !canWrite}
                            color="blue"
                            onClick={() => setShowWeChatLink(true)}>
                        {{
                            idle: '同步微信公众号文章',
                            download: '正在下载文章...',
                            imageClassification: '正在分类图片...',
                            sanitization: '正在清理内容...',
                            translation: '正在翻译内容...',
                            savingImages: '正在保存图片...',
                            creatingPost: '正在创建文章...'
                        }[wechatStatus]}
                    </Button>
                </If>
                <Button pill disabled={!canWrite} color="blue" className="mb-3"
                        onClick={() => setShowCreate(true)}>
                    {config.createLabel}
                </Button>
            </div>

            {statusMessage && (
                <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {statusMessage}
                </div>
            )}

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
                <div className="grid gap-5 mb-5">
                    {page.items.filter(entity => entity.slug !== 'temporary-slug').map(entity => {
                        const placements = placementMap.get(entity.id) ?? []

                        return <article
                            key={entity.id}
                            className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm"
                        >
                            <div className="grid gap-0 xl:grid-cols-[19rem_minmax(0,1fr)]">
                                <div className="bg-gray-50">
                                    <Link href={getEditorPath(entity)} className="block h-full">
                                        <If condition={canRenderImages && entity.coverImageDraft != null && !!entity.coverImageDraft.sha1}>
                                            <img src={`${uploadServePath}/${entity.coverImageDraft?.sha1}_thumb.webp`}
                                                 alt={entity.coverImageDraft?.altText} className="h-full min-h-56 w-full object-cover"/>
                                        </If>
                                        <If condition={!canRenderImages || entity.coverImageDraft == null || !entity.coverImageDraft.sha1}>
                                            <div className="h-full min-h-56 w-full bg-gradient-to-tr from-blue-300 to-blue-500"/>
                                        </If>
                                    </Link>
                                </div>

                                <div className="p-6">
                                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7a1f1c]">
                                                {config.entryPathLabel}
                                            </p>
                                            <h3 className="mt-2 text-2xl font-bold">{entity.titleDraftZH}</h3>
                                            <p className="mt-1 text-base text-gray-500">{entity.titleDraftEN}</p>
                                            <p className="mt-3 break-all text-sm text-[#7a1f1c]">/{entity.slug}</p>
                                            <p className="mt-3 text-sm text-gray-500">更新于 {new Date(entity.updatedAt).toLocaleString('zh-CN')}</p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <Link href={getEditorPath(entity)} className="rounded-full bg-[#7a1f1c] px-4 py-2 text-sm font-medium text-white">
                                                    进入编辑器
                                                </Link>
                                                <If condition={!!entity.slug}>
                                                    <Link href={getPublicPath(entity)} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800">
                                                        查看公开详情
                                                    </Link>
                                                </If>
                                            </div>
                                        </div>

                                        <div className="w-full rounded-[1.5rem] border border-gray-200 bg-[#faf7f2] p-4 xl:max-w-sm">
                                            <p className="text-sm font-semibold text-[#7a1f1c]">当前页面联动</p>
                                            <If condition={placements.length > 0}>
                                                <div className="mt-3 space-y-2">
                                                    {placements.map(placement => (
                                                        <div key={`${placement.pageId}-${placement.componentId}`} className="rounded-2xl bg-white px-3 py-2 text-sm text-gray-700">
                                                            <span className="font-medium">{placement.pageTitle}</span>
                                                            {' / '}
                                                            {placement.componentTitle}
                                                        </div>
                                                    ))}
                                                </div>
                                            </If>
                                            <If condition={placements.length < 1}>
                                                <p className="mt-3 text-sm text-gray-600">还没有加入任何栏目区块</p>
                                            </If>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid gap-5 xl:grid-cols-2">
                                        <section className="rounded-[1.5rem] border border-gray-200 bg-[#faf7f2] p-4">
                                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7a1f1c]">分类与摘要</p>
                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                <div>
                                                    <div className="mb-2 block">
                                                        <Label htmlFor={`category-zh-${entity.id}`}>分类（中文）</Label>
                                                    </div>
                                                    <TextInput
                                                        id={`category-zh-${entity.id}`}
                                                        value={entity.editCategoryZH}
                                                        onChange={e => setPage(prev => ({
                                                            ...prev,
                                                            items: prev.items.map(item => item.id === entity.id
                                                                ? { ...item, editCategoryZH: e.currentTarget.value }
                                                                : item)
                                                        }))}
                                                        placeholder="如：表演艺术"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="mb-2 block">
                                                        <Label htmlFor={`category-en-${entity.id}`}>分类（英文）</Label>
                                                    </div>
                                                    <TextInput
                                                        id={`category-en-${entity.id}`}
                                                        value={entity.editCategoryEN}
                                                        onChange={e => setPage(prev => ({
                                                            ...prev,
                                                            items: prev.items.map(item => item.id === entity.id
                                                                ? { ...item, editCategoryEN: e.currentTarget.value }
                                                                : item)
                                                        }))}
                                                        placeholder="Such as Performing Arts"
                                                    />
                                                </div>
                                            </div>
                                            <If condition={categorySuggestions.length > 0}>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {categorySuggestions.map(suggestion => (
                                                        <button
                                                            key={suggestion}
                                                            type="button"
                                                            className="rounded-full bg-white px-3 py-1 text-sm text-gray-700 shadow-sm"
                                                            onClick={() => setPage(prev => ({
                                                                ...prev,
                                                                items: prev.items.map(item => item.id === entity.id
                                                                    ? { ...item, editCategoryZH: suggestion }
                                                                    : item)
                                                            }))}
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </If>
                                            <div className="mt-4 grid gap-3">
                                                <div>
                                                    <div className="mb-2 block">
                                                        <Label htmlFor={`short-zh-${entity.id}`}>摘要（中文）</Label>
                                                    </div>
                                                    <TextInput
                                                        id={`short-zh-${entity.id}`}
                                                        value={entity.editShortContentZH}
                                                        onChange={e => setPage(prev => ({
                                                            ...prev,
                                                            items: prev.items.map(item => item.id === entity.id
                                                                ? { ...item, editShortContentZH: e.currentTarget.value }
                                                                : item)
                                                        }))}
                                                        placeholder="简短说明这条内容适合如何展示"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="mb-2 block">
                                                        <Label htmlFor={`short-en-${entity.id}`}>摘要（英文）</Label>
                                                    </div>
                                                    <TextInput
                                                        id={`short-en-${entity.id}`}
                                                        value={entity.editShortContentEN}
                                                        onChange={e => setPage(prev => ({
                                                            ...prev,
                                                            items: prev.items.map(item => item.id === entity.id
                                                                ? { ...item, editShortContentEN: e.currentTarget.value }
                                                                : item)
                                                        }))}
                                                        placeholder="Brief English summary"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    pill
                                                    color="blue"
                                                    disabled={!canWrite || savingMetaId === entity.id}
                                                    onClick={() => saveEntityMeta(entity)}
                                                >
                                                    {savingMetaId === entity.id ? '正在保存...' : '保存分类与摘要'}
                                                </Button>
                                            </div>
                                        </section>

                                        <section className="rounded-[1.5rem] border border-gray-200 bg-[#faf7f2] p-4">
                                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7a1f1c]">加入栏目区块</p>
                                            <p className="mt-2 text-sm leading-7 text-gray-600">
                                                把这条内容加入一个公开栏目页的精选区或浏览区。被挂入后，栏目页会自动显示它。
                                            </p>

                                            <div className="mt-4">
                                                <div className="mb-2 block">
                                                    <Label htmlFor={`block-add-${entity.id}`}>加入到</Label>
                                                </div>
                                                <Select
                                                    id={`block-add-${entity.id}`}
                                                    value={selectedBlockByEntityId[entity.id] ?? ''}
                                                    onChange={e => setSelectedBlockByEntityId(prev => ({
                                                        ...prev,
                                                        [entity.id]: e.currentTarget.value
                                                    }))}
                                                >
                                                    <option value="">选择栏目区块</option>
                                                    {blockOptions.map(option => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </Select>
                                            </div>

                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    pill
                                                    color="blue"
                                                    disabled={!canWrite || placementSavingId === entity.id || !selectedBlockByEntityId[entity.id]}
                                                    onClick={() => attachEntityToBlock(entity)}
                                                >
                                                    {placementSavingId === entity.id ? '正在更新...' : '加入栏目页'}
                                                </Button>
                                            </div>

                                            <If condition={placements.length > 0}>
                                                <div className="mt-5 border-t border-gray-200 pt-4">
                                                    <div className="mb-2 block">
                                                        <Label htmlFor={`block-remove-${entity.id}`}>从栏目区块移出</Label>
                                                    </div>
                                                    <Select
                                                        id={`block-remove-${entity.id}`}
                                                        value={selectedPlacementByEntityId[entity.id] ?? ''}
                                                        onChange={e => setSelectedPlacementByEntityId(prev => ({
                                                            ...prev,
                                                            [entity.id]: e.currentTarget.value
                                                        }))}
                                                    >
                                                        <option value="">选择已加入的区块</option>
                                                        {placements.map(placement => (
                                                            <option
                                                                key={`${placement.pageId}:${placement.componentId}`}
                                                                value={`${placement.pageId}:${placement.componentId}`}
                                                            >
                                                                {placement.pageTitle} / {placement.componentTitle}
                                                            </option>
                                                        ))}
                                                    </Select>
                                                    <div className="mt-4 flex justify-end">
                                                        <Button
                                                            pill
                                                            color="light"
                                                            disabled={!canWrite || placementSavingId === entity.id || !selectedPlacementByEntityId[entity.id]}
                                                            onClick={() => removeEntityFromPlacement(entity)}
                                                        >
                                                            从该区块移出
                                                        </Button>
                                                    </div>
                                                </div>
                                            </If>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </article>
                    })}
                </div>

                <Pagination currentPage={currentPage + 1} onPageChange={p => setCurrentPage(p - 1)}
                            totalPages={page.pages}/>
                <p className="mt-4 text-sm secondary">{config.publicPathHint}</p>
            </If>
        </div>
    </>
}

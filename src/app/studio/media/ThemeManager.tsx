'use client'

import {
    Alert,
    Button,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Pagination,
    Select,
    TabItem,
    Tabs,
    TextInput
} from 'flowbite-react'
import type { TabsRef } from 'flowbite-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
    HiChevronDown,
    HiChevronRight,
    HiPlus,
    HiVideoCamera,
    HiXMark
} from 'react-icons/hi2'

import { getMedia, type ImagePage } from '@/app/studio/media/media-actions'
import {
    addImagesToCollectionAction,
    createCollectionLinkAction,
    deleteCollectionAction,
    deleteCollectionLinkAction,
    getMediaTaxonomyAction,
    removeImageFromCollectionAction,
    type CollectionLinkSummary,
    type CollectionSummary,
    type MediaTaxonomy
} from '@/app/studio/media/taxonomy-actions'
import {
    buildCollectionTree,
    collectionPath,
    flattenCollectionTree,
    getCollectionSubtreeIds,
    type CollectionNode
} from '@/app/studio/media/taxonomy-tree'
import CollectionEditorDialog from '@/app/studio/media/CollectionEditorDialog'
import MediaBulkPickerDialog from '@/app/studio/media/MediaBulkPickerDialog'
import TaxonomyChip from '@/app/studio/media/TaxonomyChip'
import TaxonomyIcon from '@/app/studio/media/TaxonomyIcon'
import ThemeGraph from '@/app/studio/media/ThemeGraph'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'

type RelatedLink = {
    link: CollectionLinkSummary
    other: CollectionSummary
}

const MEDIA_TYPES = [ 'image', 'video' ] as const

function byChineseName(left: CollectionSummary, right: CollectionSummary): number {
    return left.name.localeCompare(right.name, 'zh-Hans-CN')
}

/** Theme management workspace: nested theme tree, theme details, relations, and the graph tab. */
export default function ThemeManager({ init, canWrite }: { init: MediaTaxonomy, canWrite: boolean }) {
    const [ taxonomy, setTaxonomy ] = useState<MediaTaxonomy>(init)
    const [ selectedId, setSelectedId ] = useState<number | null>(null)
    const [ expanded, setExpanded ] = useState<Set<number>>(
        () => new Set(init.collections.map(collection => collection.id))
    )
    const [ error, setError ] = useState('')
    const [ busy, setBusy ] = useState(false)

    const [ editorOpen, setEditorOpen ] = useState(false)
    const [ editingId, setEditingId ] = useState<number | null>(null)
    const [ editorParentId, setEditorParentId ] = useState<number | null>(null)

    const [ deleteOpen, setDeleteOpen ] = useState(false)
    const [ deleteBusy, setDeleteBusy ] = useState(false)
    const [ deleteError, setDeleteError ] = useState('')

    const [ linkOpen, setLinkOpen ] = useState(false)
    const [ linkTargetId, setLinkTargetId ] = useState('')
    const [ linkLabel, setLinkLabel ] = useState('')
    const [ linkBusy, setLinkBusy ] = useState(false)
    const [ linkError, setLinkError ] = useState('')

    const [ pickerOpen, setPickerOpen ] = useState(false)

    const [ mediaPage, setMediaPage ] = useState(0)
    const [ media, setMedia ] = useState<ImagePage | null>(null)
    const [ mediaError, setMediaError ] = useState('')
    const [ mediaVersion, setMediaVersion ] = useState(0)

    const tabsRef = useRef<TabsRef>(null)
    const {
        permissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    const tree = useMemo(() => buildCollectionTree(taxonomy.collections), [ taxonomy.collections ])
    const selected = useMemo(
        () => selectedId == null
            ? null
            : taxonomy.collections.find(collection => collection.id === selectedId) ?? null,
        [ taxonomy.collections, selectedId ]
    )
    const ancestors = useMemo(
        () => selected == null ? [] : collectionPath(taxonomy.collections, selected.id).slice(0, -1),
        [ taxonomy.collections, selected ]
    )
    const children = useMemo(() => {
        if (selected == null) return []
        return taxonomy.collections
            .filter(collection => collection.parentId === selected.id)
            .sort(byChineseName)
    }, [ taxonomy.collections, selected ])
    const relatedLinks = useMemo<RelatedLink[]>(() => {
        if (selected == null) return []
        const byId = new Map(taxonomy.collections.map(collection => [ collection.id, collection ]))
        const entries: RelatedLink[] = []
        for (const link of taxonomy.links) {
            if (link.fromId !== selected.id && link.toId !== selected.id) continue
            const otherId = link.fromId === selected.id ? link.toId : link.fromId
            const other = byId.get(otherId)
            if (other != null) entries.push({ link, other })
        }
        return entries
    }, [ taxonomy.collections, taxonomy.links, selected ])
    const relatedIds = useMemo(() => new Set(relatedLinks.map(entry => entry.other.id)), [ relatedLinks ])
    const linkCandidates = useMemo(() => {
        if (selected == null) return []
        return flattenCollectionTree(tree).filter(node => node.id !== selected.id && !relatedIds.has(node.id))
    }, [ tree, selected, relatedIds ])
    const descendantCount = selected == null
        ? 0
        : Math.max(0, getCollectionSubtreeIds(taxonomy.collections, selected.id).size - 1)
    const editingCollection = editingId == null
        ? null
        : taxonomy.collections.find(collection => collection.id === editingId) ?? null
    const selectedCollectionId = selected?.id ?? null

    const refreshTaxonomy = useCallback(async () => {
        try {
            const next = await getMediaTaxonomyAction()
            setTaxonomy(next)
            return next
        } catch (caught) {
            if (!handlePermissionError(caught)) setError('刷新主题数据失败，请重试。')
            return null
        }
    }, [ handlePermissionError ])

    useEffect(() => {
        if (selectedCollectionId == null) {
            setMedia(null)
            setMediaError('')
            return
        }
        let cancelled = false
        setMediaError('')
        ;(async () => {
            const next = await getMedia(mediaPage, [ ...MEDIA_TYPES ], {
                collectionId: selectedCollectionId,
                includeCollectionChildren: false
            })
            if (cancelled) return
            // Another editor may have removed media, shrinking the page count under us.
            if (next.pages > 0 && mediaPage >= next.pages) {
                setMediaPage(next.pages - 1)
                return
            }
            setMedia(next)
        })().catch(caught => {
            if (cancelled) return
            if (!handlePermissionError(caught)) setMediaError('加载主题媒体失败，请重试。')
        })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ selectedCollectionId, mediaPage, mediaVersion ])

    function expandAncestors(collectionId: number) {
        const path = collectionPath(taxonomy.collections, collectionId)
        setExpanded(current => {
            const next = new Set(current)
            for (const node of path) next.add(node.id)
            return next
        })
    }

    function toggleExpanded(collectionId: number) {
        setExpanded(current => {
            const next = new Set(current)
            if (next.has(collectionId)) {
                next.delete(collectionId)
            } else {
                next.add(collectionId)
            }
            return next
        })
    }

    function selectCollection(collectionId: number | null) {
        setSelectedId(collectionId)
        setMediaPage(0)
        setMedia(null)
        setMediaError('')
        setDeleteOpen(false)
        setDeleteError('')
        setLinkOpen(false)
        setLinkError('')
        setPickerOpen(false)
        if (collectionId != null) expandAncestors(collectionId)
    }

    function openCreateDialog(parentId: number | null) {
        if (!canWrite) return
        setEditingId(null)
        setEditorParentId(parentId)
        setEditorOpen(true)
    }

    function openEditDialog(collection: CollectionSummary) {
        if (!canWrite) return
        setEditingId(collection.id)
        setEditorParentId(null)
        setEditorOpen(true)
    }

    function closeEditorDialog() {
        setEditorOpen(false)
        setEditingId(null)
        setEditorParentId(null)
    }

    function handleCollectionSaved(saved: CollectionSummary) {
        const creating = editingId == null
        closeEditorDialog()
        setTaxonomy(current => {
            const exists = current.collections.some(collection => collection.id === saved.id)
            return {
                ...current,
                collections: exists
                    ? current.collections.map(collection => collection.id === saved.id ? saved : collection)
                    : [ ...current.collections, saved ]
            }
        })
        setExpanded(current => {
            const next = new Set(current)
            next.add(saved.id)
            if (saved.parentId != null) next.add(saved.parentId)
            return next
        })
        if (creating) {
            setSelectedId(saved.id)
            setMediaPage(0)
            setMedia(null)
        }
        void refreshTaxonomy()
    }

    async function confirmDelete() {
        if (selected == null || deleteBusy) return
        const deletedId = selected.id
        const parentId = selected.parentId
        const doomed = getCollectionSubtreeIds(taxonomy.collections, deletedId)
        setDeleteBusy(true)
        setDeleteError('')
        try {
            const result = await deleteCollectionAction(deletedId)
            if (!result.ok) {
                setDeleteError(result.message)
                return
            }
            setTaxonomy(current => ({
                ...current,
                collections: current.collections.filter(collection => !doomed.has(collection.id)),
                links: current.links.filter(link => !doomed.has(link.fromId) && !doomed.has(link.toId))
            }))
            setExpanded(current => {
                const next = new Set(current)
                for (const id of doomed) next.delete(id)
                return next
            })
            setDeleteOpen(false)
            selectCollection(parentId)
            void refreshTaxonomy()
        } catch (caught) {
            if (!handlePermissionError(caught)) setDeleteError('删除失败，请重试。')
        } finally {
            setDeleteBusy(false)
        }
    }

    function openLinkDialog() {
        if (!canWrite || selected == null) return
        setLinkTargetId('')
        setLinkLabel('')
        setLinkError('')
        setLinkOpen(true)
    }

    async function createLink() {
        if (selected == null || linkBusy) return
        const targetId = Number(linkTargetId)
        if (!Number.isSafeInteger(targetId) || targetId <= 0) {
            setLinkError('请选择要关联的主题')
            return
        }
        setLinkBusy(true)
        setLinkError('')
        try {
            const result = await createCollectionLinkAction({
                fromId: selected.id,
                toId: targetId,
                label: linkLabel.trim()
            })
            if (!result.ok) {
                setLinkError(result.message)
                return
            }
            const created = result.data
            setTaxonomy(current => current.links.some(link => link.id === created.id)
                ? current
                : { ...current, links: [ ...current.links, created ] })
            setLinkOpen(false)
            void refreshTaxonomy()
        } catch (caught) {
            if (!handlePermissionError(caught)) setLinkError('创建关联失败，请重试。')
        } finally {
            setLinkBusy(false)
        }
    }

    async function removeLink(linkId: number) {
        if (busy) return
        setBusy(true)
        setError('')
        try {
            const result = await deleteCollectionLinkAction(linkId)
            if (!result.ok) {
                setError(result.message)
                return
            }
            setTaxonomy(current => ({
                ...current,
                links: current.links.filter(link => link.id !== linkId)
            }))
            void refreshTaxonomy()
        } catch (caught) {
            if (!handlePermissionError(caught)) setError('取消关联失败，请重试。')
        } finally {
            setBusy(false)
        }
    }

    async function addPickedImages(imageIds: number[]) {
        if (selected == null) return
        const collectionId = selected.id
        setPickerOpen(false)
        setBusy(true)
        setError('')
        try {
            const result = await addImagesToCollectionAction({ collectionId, imageIds })
            if (!result.ok) {
                setError(result.message)
                return
            }
            setMediaPage(0)
            setMediaVersion(current => current + 1)
            void refreshTaxonomy()
        } catch (caught) {
            if (!handlePermissionError(caught)) setError('添加媒体失败，请重试。')
        } finally {
            setBusy(false)
        }
    }

    async function removeImageFromTheme(imageId: number) {
        if (selected == null || busy) return
        const collectionId = selected.id
        setBusy(true)
        setError('')
        try {
            const result = await removeImageFromCollectionAction({ collectionId, imageId })
            if (!result.ok) {
                setError(result.message)
                return
            }
            if (media != null && media.items.length <= 1 && mediaPage > 0) {
                setMediaPage(current => current - 1)
            } else {
                setMediaVersion(current => current + 1)
            }
            void refreshTaxonomy()
        } catch (caught) {
            if (!handlePermissionError(caught)) setError('移除媒体失败，请重试。')
        } finally {
            setBusy(false)
        }
    }

    function showListTab() {
        tabsRef.current?.setActiveTab(0)
    }

    function renderTreeNodes(nodes: CollectionNode[]): ReactNode {
        return nodes.map(node => {
            const hasChildren = node.children.length > 0
            const isExpanded = expanded.has(node.id)
            const isSelected = selectedId === node.id
            return <div key={node.id}>
                <div className={`flex items-center rounded-lg pr-1 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                     style={{ paddingLeft: node.depth * 14 }}>
                    {hasChildren
                        ? <button type="button"
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                                  aria-label={isExpanded ? `折叠主题 ${node.name} 的子主题` : `展开主题 ${node.name} 的子主题`}
                                  aria-expanded={isExpanded}
                                  onClick={() => toggleExpanded(node.id)}>
                            {isExpanded
                                ? <HiChevronDown className="size-4" aria-hidden="true"/>
                                : <HiChevronRight className="size-4" aria-hidden="true"/>}
                        </button>
                        : <span aria-hidden="true" className="h-7 w-7 shrink-0"/>}
                    <button type="button"
                            aria-current={isSelected ? 'true' : undefined}
                            aria-label={`查看主题 ${node.name}，${node.imageCount} 个媒体，${node.childCount} 个子主题`}
                            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-left"
                            onClick={() => selectCollection(node.id)}>
                        <span aria-hidden="true"
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                              style={{ backgroundColor: `${node.color}1f`, color: node.color }}>
                            <TaxonomyIcon icon={node.icon} size={14}/>
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${isSelected ? 'font-medium text-blue-700' : 'text-gray-800'}`}>
                            {node.name}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums text-gray-400">
                            <span title={`${node.imageCount} 个媒体`}>{node.imageCount} 媒体</span>
                            {node.childCount > 0 &&
                                <span title={`${node.childCount} 个子主题`}>{node.childCount} 子</span>}
                        </span>
                    </button>
                </div>
                {hasChildren && isExpanded && <div>{renderTreeNodes(node.children)}</div>}
            </div>
        })
    }

    function renderDetail() {
        if (selected == null) {
            return <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center text-gray-500">
                <p className="text-sm">从左侧选择一个主题，或新建主题</p>
                {canWrite && <Button pill color="light" className="mt-4" onClick={() => openCreateDialog(null)}>
                    新建主题
                </Button>}
            </div>
        }
        return <div className="min-w-0 space-y-6">
            <div>
                <nav aria-label="主题层级路径" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-gray-500">
                    {ancestors.length === 0
                        ? <span>顶层主题</span>
                        : ancestors.map(ancestor => <span key={ancestor.id} className="inline-flex items-center gap-1">
                            <button type="button"
                                    className="rounded px-1 hover:bg-gray-100 hover:text-gray-900"
                                    aria-label={`切换到上级主题 ${ancestor.name}`}
                                    onClick={() => selectCollection(ancestor.id)}>
                                {ancestor.name}
                            </button>
                        </span>)}
                </nav>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <TaxonomyChip name={selected.name} color={selected.color} icon={selected.icon}
                                  count={selected.imageCount} className="px-4 py-1.5 text-sm"/>
                    {canWrite && <div className="flex items-center gap-2">
                        <Button pill size="sm" color="light" aria-label={`编辑主题 ${selected.name}`}
                                onClick={() => openEditDialog(selected)}>编辑</Button>
                        <Button pill size="sm" color="red" aria-label={`删除主题 ${selected.name}`}
                                onClick={() => {
                                    setDeleteError('')
                                    setDeleteOpen(true)
                                }}>删除</Button>
                    </div>}
                </div>
                <p className="mt-3 text-sm secondary">{selected.description ?? '这个主题还没有描述。'}</p>
                <p className="mt-1 text-xs text-gray-400">
                    共 {selected.imageCount} 个媒体 · {selected.childCount} 个子主题
                </p>
            </div>

            <section aria-label={`子主题，共 ${children.length} 个`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-gray-700">子主题（{children.length}）</h3>
                    {canWrite && <Button pill size="xs" color="light" onClick={() => openCreateDialog(selected.id)}>
                        新建子主题
                    </Button>}
                </div>
                {children.length === 0
                    ? <p className="text-sm text-gray-400">没有子主题。</p>
                    : <div className="flex flex-wrap gap-2">
                        {children.map(child => <TaxonomyChip key={child.id} name={child.name} color={child.color}
                                                             icon={child.icon} count={child.imageCount}
                                                             title={`查看子主题 ${child.name}`}
                                                             onClick={() => selectCollection(child.id)}/>)}
                    </div>}
            </section>

            <section aria-label={`关联主题，共 ${relatedLinks.length} 个`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-gray-700">关联主题（{relatedLinks.length}）</h3>
                    {canWrite && <Button pill size="xs" color="light" disabled={linkCandidates.length === 0}
                                         onClick={openLinkDialog}>添加关联</Button>}
                </div>
                {relatedLinks.length === 0
                    ? <p className="text-sm text-gray-400">还没有关联主题。</p>
                    : <ul className="space-y-2">
                        {relatedLinks.map(({ link, other }) => <li key={link.id}
                                                                   className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
                            <TaxonomyChip name={other.name} color={other.color} icon={other.icon}
                                          count={other.imageCount} title={`查看关联主题 ${other.name}`}
                                          onClick={() => selectCollection(other.id)}/>
                            {link.label != null && link.label.length > 0 &&
                                <span className="min-w-0 flex-1 truncate text-sm text-gray-500">{link.label}</span>}
                            {canWrite && <button type="button"
                                                 aria-label={`取消与 ${other.name} 的关联`}
                                                 disabled={busy}
                                                 className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                                 onClick={() => void removeLink(link.id)}>
                                <HiXMark className="size-4" aria-hidden="true"/>
                            </button>}
                        </li>)}
                    </ul>}
            </section>

            <section aria-label="主题媒体">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-gray-700">媒体（{selected.imageCount}）</h3>
                    {canWrite && <div className="flex items-center gap-2">
                        {media != null && media.pages > 1 && <span className="text-xs text-gray-400">
                            第 {mediaPage + 1} / {media.pages} 页
                        </span>}
                        <Button pill size="xs" color="light" aria-label={`向主题 ${selected.name} 添加媒体`}
                                onClick={() => setPickerOpen(true)}>添加媒体</Button>
                    </div>}
                </div>
                {mediaError.length > 0
                    ? <p className="rounded-xl border border-dashed border-red-200 py-10 text-center text-sm text-red-600">
                        {mediaError}
                    </p>
                    : media == null
                        ? <p className="py-10 text-center text-sm text-gray-500">媒体加载中…</p>
                        : media.pages < 1
                            ? <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                                这个主题还没有媒体，使用「添加媒体」加入图片或视频。
                            </p>
                            : <>
                                <div className="grid grid-cols-6 gap-3">
                                    {media.items.map(item => <div key={item.id}
                                                                  className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                        <img src={`${media.uploadServePath}/${item.sha1}_thumb.webp`}
                                             alt={item.altText || item.name} loading="lazy" decoding="async"
                                             className="h-full w-full object-cover"/>
                                        {item.mediaType === 'video' &&
                                            <span aria-hidden="true"
                                                  className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/70 p-0.5 text-white">
                                                <HiVideoCamera className="size-3"/>
                                            </span>}
                                        {canWrite && <button type="button"
                                                             aria-label={`将「${item.altText || item.name}」移出主题`}
                                                             disabled={busy}
                                                             className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                                                             onClick={() => void removeImageFromTheme(item.id)}>
                                            <HiXMark className="size-3.5" aria-hidden="true"/>
                                        </button>}
                                    </div>)}
                                </div>
                                {media.pages > 1 && <div className="mt-4 flex justify-center">
                                    <Pagination currentPage={mediaPage + 1} totalPages={media.pages}
                                                onPageChange={nextPage => setMediaPage(nextPage - 1)}/>
                                </div>}
                            </>}
            </section>
        </div>
    }

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 className="mb-1 text-2xl">主题与关系</h1>
                <p className="secondary">主题文件夹可以嵌套，也可以互相建立关联，形成网状结构。</p>
            </div>
            {canWrite && <Button pill color="blue" onClick={() => openCreateDialog(null)}>
                <HiPlus className="mr-2 size-4" aria-hidden="true"/>
                新建主题
            </Button>}
        </div>

        {error.length > 0 && <Alert color="failure" className="mb-4" onDismiss={() => setError('')}>
            {error}
        </Alert>}

        <Tabs aria-label="主题视图" ref={tabsRef}>
            <TabItem title="主题列表">
                <div className="flex flex-col gap-6 lg:flex-row">
                    <aside className="w-full shrink-0 lg:w-72" aria-label="主题树">
                        <div className="mb-2 flex items-center justify-between px-1">
                            <span className="text-sm font-medium text-gray-500">全部主题</span>
                            <span className="text-xs text-gray-400">{taxonomy.collections.length} 个</span>
                        </div>
                        <div className="max-h-[36rem] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5">
                            {tree.length === 0
                                ? <div className="px-3 py-10 text-center text-sm text-gray-500">
                                    <p>还没有主题。</p>
                                    {canWrite && <Button pill size="sm" color="light" className="mt-3"
                                                         onClick={() => openCreateDialog(null)}>
                                        新建主题
                                    </Button>}
                                </div>
                                : renderTreeNodes(tree)}
                        </div>
                    </aside>
                    <section className="min-w-0 flex-1" aria-label="主题详情">
                        {renderDetail()}
                    </section>
                </div>
            </TabItem>

            <TabItem title="关系图谱">
                <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="min-w-0 flex-1">
                        <ThemeGraph collections={taxonomy.collections} links={taxonomy.links}
                                    selectedId={selected?.id ?? null}
                                    onSelect={collectionId => selectCollection(collectionId)}/>
                    </div>
                    <aside className="w-full shrink-0 lg:w-64" aria-label="选中主题简介">
                        <div className="rounded-2xl border border-gray-200 p-4">
                            {selected == null
                                ? <p className="text-sm text-gray-500">
                                    在左侧图谱中选择一个主题，这里会显示它的简介。
                                </p>
                                : <div className="space-y-3">
                                    <TaxonomyChip name={selected.name} color={selected.color} icon={selected.icon}
                                                  count={selected.imageCount} className="px-3 py-1"/>
                                    <p className="text-sm secondary">
                                        {selected.description ?? '这个主题还没有描述。'}
                                    </p>
                                    <dl className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">媒体</dt>
                                            <dd className="tabular-nums">{selected.imageCount}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">子主题</dt>
                                            <dd className="tabular-nums">{selected.childCount}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">关联主题</dt>
                                            <dd className="tabular-nums">{relatedLinks.length}</dd>
                                        </div>
                                    </dl>
                                    <Button pill size="sm" color="light" className="w-full" onClick={showListTab}>
                                        在列表中查看
                                    </Button>
                                </div>}
                        </div>
                    </aside>
                </div>
            </TabItem>
        </Tabs>

        <CollectionEditorDialog open={editorOpen} collection={editingCollection}
                                collections={taxonomy.collections} defaultParentId={editorParentId}
                                onClose={closeEditorDialog} onSaved={handleCollectionSaved}
                                onPermissionError={handlePermissionError}/>

        {pickerOpen && selected != null && <MediaBulkPickerDialog
            open
            title={`把媒体添加到「${selected.name}」`}
            excludeIds={media?.items.map(item => item.id) ?? []}
            onClose={() => setPickerOpen(false)}
            onPicked={imageIds => void addPickedImages(imageIds)}
            onPermissionError={handlePermissionError}/>}

        <Modal show={deleteOpen && selected != null} size="md" popup onClose={() => {
            if (!deleteBusy) setDeleteOpen(false)
        }}>
            <ModalHeader/>
            <ModalBody>
                <h3 className="mb-2 text-xl font-bold">删除主题</h3>
                {deleteError.length > 0 && <Alert color="failure" className="mb-3">{deleteError}</Alert>}
                <p className="mb-2 text-sm">确定要删除主题「{selected?.name ?? ''}」吗？</p>
                <p className="text-sm text-gray-500">
                    {descendantCount > 0
                        ? `将同时删除 ${descendantCount} 个子主题，但不会删除任何图片。此操作无法撤销。`
                        : '该主题没有子主题。删除后不会删除任何图片，但此操作无法撤销。'}
                </p>
            </ModalBody>
            <ModalFooter className="border-0">
                <Button pill color="red" disabled={deleteBusy} onClick={() => void confirmDelete()}>
                    {deleteBusy ? '删除中…' : '确认删除'}
                </Button>
                <Button pill color="alternative" disabled={deleteBusy} onClick={() => setDeleteOpen(false)}>
                    取消
                </Button>
            </ModalFooter>
        </Modal>

        <Modal show={linkOpen && selected != null} size="md" popup onClose={() => {
            if (!linkBusy) setLinkOpen(false)
        }}>
            <ModalHeader/>
            <ModalBody>
                <h3 className="mb-1 text-xl font-bold">添加关联主题</h3>
                <p className="mb-4 text-sm text-gray-500">
                    为「{selected?.name ?? ''}」关联另一个主题，关联是双向的。
                </p>
                {linkError.length > 0 && <Alert color="failure" className="mb-3">{linkError}</Alert>}
                {linkCandidates.length === 0
                    ? <p className="py-6 text-center text-sm text-gray-500">
                        没有可关联的主题，请先创建更多主题。
                    </p>
                    : <>
                        <div className="mb-3">
                            <Label htmlFor="theme-link-target" className="mb-1 block">关联到</Label>
                            <Select id="theme-link-target" value={linkTargetId}
                                    onChange={event => setLinkTargetId(event.currentTarget.value)}>
                                <option value="">请选择主题</option>
                                {linkCandidates.map(candidate => <option key={candidate.id} value={candidate.id}>
                                    {'　'.repeat(candidate.depth)}{candidate.name}
                                </option>)}
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="theme-link-label" className="mb-1 block">关联说明（可选）</Label>
                            <TextInput id="theme-link-label" value={linkLabel} maxLength={80}
                                       placeholder="例如：同属 2026 春季校园活动"
                                       onChange={event => setLinkLabel(event.currentTarget.value)}/>
                        </div>
                    </>}
            </ModalBody>
            <ModalFooter className="border-0">
                <Button pill color="blue" disabled={linkBusy || linkCandidates.length === 0}
                        onClick={() => void createLink()}>
                    {linkBusy ? '添加中…' : '添加关联'}
                </Button>
                <Button pill color="alternative" disabled={linkBusy} onClick={() => setLinkOpen(false)}>
                    取消
                </Button>
            </ModalFooter>
        </Modal>
    </>
}

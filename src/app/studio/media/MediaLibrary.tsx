'use client'

import {
    Alert,
    Button,
    Pagination,
    Select,
    TabItem,
    Tabs,
    TabsRef,
    TextInput
} from 'flowbite-react'
import { HiArrowUpTray, HiFolder, HiMagnifyingGlass, HiPhoto, HiTag, HiVideoCamera } from 'react-icons/hi2'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Role, User, type Image } from '@/generated/prisma/browser'
import { deleteImage, getMedia } from '@/app/studio/media/media-actions'
import type { ImagePage, MediaImage, MediaScope, MediaType } from '@/app/studio/media/media-actions'
import {
    getMediaTaxonomyAction,
    removeImageFromCollectionAction,
    removeTagsFromImagesAction
} from '@/app/studio/media/taxonomy-actions'
import type { MediaTaxonomy } from '@/app/studio/media/taxonomy-actions'
import { buildCollectionTree, flattenCollectionTree } from '@/app/studio/media/taxonomy-tree'
import If from '@/app/lib/If'
import UploadAreaClient from '@/app/studio/media/upload/UploadAreaClient'
import { getMyUser } from '@/app/login/login-actions'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'
import ImageFocusDialog from './ImageFocusDialog'
import FocusImage from '@/app/lib/FocusImage'
import TaxonomyChip from './TaxonomyChip'
import TaxonomyIcon from './TaxonomyIcon'
import TagAssignDialog from './TagAssignDialog'
import CollectionPickerDialog from './CollectionPickerDialog'

function formatSize(kb: number): string {
    if (kb < 1024) {
        return `${kb} KB`
    } else {
        return `${(kb / 1024).toFixed(2)} MB`
    }
}

const ALL_MEDIA_TYPES: MediaType[] = [ 'image', 'video' ]
const MEDIA_SCOPE_STORAGE_KEY = 'helium-media-picker-scope'
const EMPTY_TAXONOMY: MediaTaxonomy = { tags: [], collections: [], links: [] }

function isMediaScope(value: string | null): value is MediaScope {
    return value === 'all' || value === 'mine' || value === 'entity'
}

export default function MediaLibrary({
                                         init, pickMode, allowUnpick, allowedMediaTypes = ALL_MEDIA_TYPES,
                                         currentEntityMediaIds, onPick
                                     }: {
    init: ImagePage,
    pickMode?: boolean,
    allowUnpick?: boolean,
    allowedMediaTypes?: MediaType[],
    currentEntityMediaIds?: number[],
    onPick?: (image: Image | null) => void
}) {
    const [ user, setUser ] = useState<User>()
    const [ page, setPage ] = useState<ImagePage>(init)
    const [ loading, setLoading ] = useState(false)
    const [ selectedImage, setSelectedImage ] = useState<MediaImage | null>(null)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ editingFocus, setEditingFocus ] = useState(false)
    const [ currentPage, setCurrentPage ] = useState(0)
    const [ currentMediaType, setCurrentMediaType ] = useState<MediaType>(allowedMediaTypes[0] ?? 'image')
    const [ query, setQuery ] = useState('')
    const [ debouncedQuery, setDebouncedQuery ] = useState('')
    const [ scope, setScope ] = useState<MediaScope>('all')
    const [ refreshVersion, setRefreshVersion ] = useState(0)
    const [ taxonomy, setTaxonomy ] = useState<MediaTaxonomy>(EMPTY_TAXONOMY)
    const [ taxonomyVersion, setTaxonomyVersion ] = useState(0)
    const [ tagFilterIds, setTagFilterIds ] = useState<number[]>([])
    const [ collectionFilterId, setCollectionFilterId ] = useState(0)
    const [ bulkSelectedIds, setBulkSelectedIds ] = useState<Set<number>>(new Set())
    const [ tagDialogTarget, setTagDialogTarget ] = useState<MediaImage[] | null>(null)
    const [ collectionDialogTarget, setCollectionDialogTarget ] = useState<{
        mode: 'bulk' | 'manage', images: MediaImage[]
    } | null>(null)
    const [ actionError, setActionError ] = useState('')
    const {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    const tabsRef = useRef<TabsRef>(null)
    const canWrite = user?.roles.includes(Role.writer) ?? false

    useEffect(() => {
        (async () => {
            setUser((await getMyUser())!)
        })()
    }, [])

    // Keep the taxonomy (tags, theme folders) in sync with the database.
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const next = await getMediaTaxonomyAction()
                if (!cancelled) setTaxonomy(next)
            } catch (error) {
                if (!cancelled) console.error('Failed to load media taxonomy', error)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [ taxonomyVersion ])

    const allowedTypesKey = allowedMediaTypes.join(',')
    const entityMediaIdsKey = currentEntityMediaIds?.join(',') ?? ''
    const hasEntityScope = currentEntityMediaIds != null
    const tagFilterKey = tagFilterIds.join(',')

    useEffect(() => {
        const savedScope = window.localStorage.getItem(MEDIA_SCOPE_STORAGE_KEY)
        setScope(isMediaScope(savedScope) && (savedScope !== 'entity' || hasEntityScope) ? savedScope : 'all')
    }, [ hasEntityScope ])

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(query), 250)
        return () => window.clearTimeout(timer)
    }, [ query ])

    useEffect(() => {
        if (!allowedMediaTypes.includes(currentMediaType)) {
            setCurrentMediaType(allowedMediaTypes[0] ?? 'image')
        }
    }, [ allowedTypesKey, allowedMediaTypes, currentMediaType ])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const nextPage = await getMedia(currentPage, [ currentMediaType ], {
                query: debouncedQuery,
                scope,
                entityMediaIds: currentEntityMediaIds,
                tagIds: tagFilterIds,
                collectionId: collectionFilterId > 0 ? collectionFilterId : undefined
            })
            if (!cancelled) setPage(nextPage)
        })().catch(error => {
            if (!cancelled) console.error('Failed to load media', error)
        })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ currentMediaType, currentPage, debouncedQuery, entityMediaIdsKey, refreshVersion, scope, tagFilterKey,
        collectionFilterId ])

    // Keep the details panel and bulk selection in sync with the freshly loaded page.
    useEffect(() => {
        setSelectedImage(current => current == null
            ? null
            : page.items.find(item => item.id === current.id) ?? null)
        setBulkSelectedIds(current => new Set(
            [ ...current ].filter(id => page.items.some(item => item.id === id))))
    }, [ page ])

    useEffect(() => {
        setCurrentPage(0)
        setSelectedImage(null)
        setDeleteConfirm(false)
        setBulkSelectedIds(new Set())
    }, [ debouncedQuery, scope, tagFilterKey, collectionFilterId ])

    function refreshTaxonomy() {
        setTaxonomyVersion(version => version + 1)
    }

    function refreshMedia() {
        setRefreshVersion(version => version + 1)
        refreshTaxonomy()
    }

    function toggleTagFilter(tagId: number) {
        setTagFilterIds(current => current.includes(tagId)
            ? current.filter(id => id !== tagId)
            : [ ...current, tagId ])
    }

    const collectionFilterOptions = useMemo(() => {
        return flattenCollectionTree(buildCollectionTree(taxonomy.collections))
    }, [ taxonomy.collections ])

    const bulkImages = page.items.filter(image => bulkSelectedIds.has(image.id))

    function toggleBulkSelection(imageId: number) {
        setBulkSelectedIds(current => {
            const next = new Set(current)
            if (next.has(imageId)) {
                next.delete(imageId)
            } else {
                next.add(imageId)
            }
            return next
        })
    }

    async function removeTag(image: MediaImage, tagId: number) {
        setActionError('')
        setLoading(true)
        try {
            const result = await removeTagsFromImagesAction({ imageIds: [ image.id ], tagIds: [ tagId ] })
            if (result.ok) {
                refreshMedia()
            } else {
                setActionError(result.message)
            }
        } catch (error) {
            if (!handlePermissionError(error)) setActionError('移除标签失败，请重试。')
        } finally {
            setLoading(false)
        }
    }

    async function removeCollection(image: MediaImage, collectionId: number) {
        setActionError('')
        setLoading(true)
        try {
            const result = await removeImageFromCollectionAction({ collectionId, imageId: image.id })
            if (result.ok) {
                refreshMedia()
            } else {
                setActionError(result.message)
            }
        } catch (error) {
            if (!handlePermissionError(error)) setActionError('移出主题失败，请重试。')
        } finally {
            setLoading(false)
        }
    }

    const renderMediaPanel = () => <>
        <div className="mb-5 flex gap-3">
            <TextInput className="min-w-0 flex-1" icon={HiMagnifyingGlass} value={query}
                       placeholder="搜索名称、解释性文字、ID 或哈希"
                       aria-label="搜索媒体"
                       onChange={event => setQuery(event.currentTarget.value)}/>
            <Select className="w-52 shrink-0" value={scope} aria-label="筛选媒体"
                    theme={{
                        field: {
                            select: {
                                sizes: {
                                    md: 'py-2.5 pl-2.5 pr-12 text-sm'
                                }
                            }
                        }
                    }}
                    onChange={event => {
                        const nextScope = event.currentTarget.value as MediaScope
                        setScope(nextScope)
                        window.localStorage.setItem(MEDIA_SCOPE_STORAGE_KEY, nextScope)
                    }}>
                <option value="all">全部媒体</option>
                <option value="mine">我上传的</option>
                {currentEntityMediaIds != null && <option value="entity">当前内容中的媒体</option>}
            </Select>
        </div>

        <If condition={taxonomy.tags.length > 0 || taxonomy.collections.length > 0}>
            <div className="mb-4 space-y-2">
                <If condition={taxonomy.tags.length > 0}>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 inline-flex items-center gap-1 text-xs text-gray-500">
                            <HiTag className="size-3.5"/>标签
                        </span>
                        {taxonomy.tags.map(tag => <TaxonomyChip key={tag.id} name={tag.name} color={tag.color}
                                                                 icon={tag.icon} count={tag.imageCount}
                                                                 pressed={tagFilterIds.includes(tag.id)}
                                                                 onClick={() => toggleTagFilter(tag.id)}/>)}
                        <If condition={tagFilterIds.length > 0}>
                            <button type="button"
                                    className="ml-1 text-xs text-gray-500 underline hover:text-gray-800"
                                    onClick={() => setTagFilterIds([])}>清除标签筛选
                            </button>
                        </If>
                    </div>
                </If>
                <If condition={taxonomy.collections.length > 0}>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <HiFolder className="size-3.5"/>主题
                        </span>
                        <Select sizing="sm" className="w-64" value={String(collectionFilterId)}
                                aria-label="按主题筛选"
                                onChange={event => setCollectionFilterId(Number(event.currentTarget.value))}>
                            <option value="0">全部主题</option>
                            {collectionFilterOptions.map(node => <option key={node.id} value={node.id}>
                                {'　'.repeat(node.depth)}{node.name}
                            </option>)}
                        </Select>
                    </div>
                </If>
            </div>
        </If>

        <If condition={bulkSelectedIds.size > 0}>
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-blue-50 px-3 py-2">
                <p className="text-sm font-medium text-blue-800">已选 {bulkSelectedIds.size} 项</p>
                <Button size="xs" pill color="blue" disabled={!canWrite}
                        onClick={() => setTagDialogTarget(bulkImages)}>批量打标签</Button>
                <Button size="xs" pill color="light" disabled={!canWrite}
                        onClick={() => setCollectionDialogTarget({ mode: 'bulk', images: bulkImages })}>加入主题</Button>
                <Button size="xs" pill color="alternative"
                        onClick={() => setBulkSelectedIds(new Set())}>取消选择</Button>
            </div>
        </If>

        <If condition={page.pages < 1}>
            <div className="flex flex-col justify-center items-center">
                <img src="/assets/reading-light.png" alt="" className="h-48 mb-3"/>
                <p className="mb-3">
                    {debouncedQuery.length > 0 || scope !== 'all' || tagFilterIds.length > 0 || collectionFilterId > 0
                        ? '没有符合条件的媒体'
                        : '暂时没有媒体'}
                </p>
                <If condition={canWrite}>
                    <Button pill color="blue"
                            onClick={() => tabsRef.current?.setActiveTab(allowedMediaTypes.length)}>上传</Button>
                </If>
                <If condition={allowUnpick}>
                    <Button pill disabled={loading} color="alternative" className="mt-3" onClick={() => {
                        if (onPick != null) {
                            onPick(null)
                        }
                    }}>取消选取</Button>
                </If>
            </div>
        </If>
        <If condition={page.pages > 0}>
            <div className="flex gap-4">
                <div className="w-2/3">
                    <div className="grid grid-cols-6 gap-4 mb-3">
                        {page.items.map(image =>
                            <div key={image.id} className="relative h-full w-full">
                                <button type="button"
                                        aria-label={`${selectedImage?.id === image.id ? '取消选择' : '选择'}${image.mediaType === 'video' ? '视频' : '图片'}: ${image.altText || image.name}`}
                                        aria-pressed={selectedImage?.id === image.id}
                                        className={`h-full w-full rounded
                                     ${selectedImage?.id === image.id ? 'ring-4 ring-blue-500' : ''}
                                     ${bulkSelectedIds.has(image.id) ? 'ring-4 ring-blue-300' : ''}`}
                                        onClick={() => {
                                            setDeleteConfirm(false)
                                            setActionError('')
                                            if (selectedImage?.id === image.id) {
                                                setSelectedImage(null)
                                            } else {
                                                setSelectedImage(image)
                                            }
                                        }}>
                                    {image.mediaType === 'video'
                                        ?
                                        <img className="aspect-square w-full bg-black object-cover" width={300}
                                             height={200}
                                             decoding="async" alt={`视频: ${image.name}`}
                                             src={`${page.uploadServePath}/${image.sha1}_thumb.webp`}/>
                                        :
                                        <FocusImage image={image} className="aspect-square w-full object-cover"
                                                    width={300}
                                                    height={200}
                                                    decoding="async" alt={`图片: ${image.name}`}
                                                    src={`${page.uploadServePath}/${image.sha1}_thumb.webp`}/>}
                                </button>
                                <If condition={!pickMode && canWrite}>
                                    <button type="button"
                                            aria-label={`${bulkSelectedIds.has(image.id) ? '取消批量选择' : '批量选择'}${image.altText || image.name}`}
                                            aria-pressed={bulkSelectedIds.has(image.id)}
                                            className={`absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded border text-xs font-bold transition-colors ${bulkSelectedIds.has(image.id) ? 'border-blue-600 bg-blue-600 text-white' : 'border-white/80 bg-white/70 text-transparent hover:border-blue-400'}`}
                                            onClick={event => {
                                                event.stopPropagation()
                                                toggleBulkSelection(image.id)
                                            }}>✓</button>
                                </If>
                                {image.tags.length > 0 &&
                                    <div className="pointer-events-none absolute inset-x-1 bottom-1 flex flex-wrap gap-0.5">
                                        {image.tags.slice(0, 3).map(tag => <span key={tag.id}
                                                                                  className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium"
                                                                                  style={{
                                                                                      color: tag.color,
                                                                                      backgroundColor: 'rgba(255,255,255,0.85)'
                                                                                  }}>
                                            <TaxonomyIcon icon={tag.icon} size={10}/>{tag.name}
                                        </span>)}
                                    </div>}
                            </div>
                        )}
                    </div>
                    <Pagination currentPage={currentPage + 1} onPageChange={p => setCurrentPage(p - 1)}
                                totalPages={page.pages}/>
                    <If condition={allowUnpick}>
                        <Button pill disabled={loading} color="alternative" className="mt-3"
                                onClick={() => {
                                    if (onPick != null) {
                                        onPick(null)
                                    }
                                }}>取消选取</Button>
                    </If>
                </div>

                <div className="w-1/3">
                    <If condition={selectedImage != null}>
                        <div>
                            <p className="font-bold mb-3 text-xl secondary">
                                {selectedImage?.mediaType === 'video' ? '视频详情' : '图片详情'}
                            </p>
                            <div className="flex gap-3 mb-3 items-center">
                                {selectedImage?.mediaType === 'video'
                                    ? <video controls preload="metadata"
                                             className="h-24 max-w-40 rounded-xl bg-black"
                                             aria-label={selectedImage.altText || selectedImage.name}
                                             src={`${page.uploadServePath}/${selectedImage.sha1}.${selectedImage.extension}`}/>
                                    : <a target="_blank" rel="noreferrer"
                                         aria-label={`在新窗口查看原图: ${selectedImage?.altText || selectedImage?.name}`}
                                         href={`${page.uploadServePath}/${selectedImage?.sha1}.${selectedImage?.extension}`}>
                                        <img className="h-24" alt={`图片: ${selectedImage?.name}`}
                                             src={`${page.uploadServePath}/${selectedImage?.sha1}_thumb.webp`}/>
                                    </a>}
                                <div>
                                    <p className="font-bold">{selectedImage?.name}</p>
                                    {selectedImage?.mediaType === 'image' &&
                                        <p className="secondary">{selectedImage?.width} × {selectedImage?.height}</p>}
                                    <p className="secondary">{formatSize(selectedImage?.sizeKB ?? 0)}</p>
                                </div>
                            </div>

                            <p className="font-bold secondary text-sm">解释性文字</p>
                            <p className="mb-3">{selectedImage?.altText}</p>

                            {actionError.length > 0 && <Alert color="failure" className="mb-3">{actionError}</Alert>}

                            <p className="font-bold secondary text-sm">标签</p>
                            <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                {selectedImage?.tags.map(tag => <TaxonomyChip key={tag.id} name={tag.name}
                                                                               color={tag.color} icon={tag.icon}
                                                                               trailing={canWrite
                                                                                   ? <button type="button"
                                                                                             aria-label={`移除标签 ${tag.name}`}
                                                                                             className="ml-0.5 rounded-full px-1 leading-none opacity-60 hover:opacity-100"
                                                                                             onClick={() => void removeTag(selectedImage, tag.id)}>×</button>
                                                                                   : undefined}/>)}
                                <If condition={selectedImage?.tags.length === 0}>
                                    <span className="text-sm text-gray-400">暂无标签</span>
                                </If>
                                <If condition={canWrite}>
                                    <button type="button"
                                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600"
                                            onClick={() => selectedImage != null && setTagDialogTarget([ selectedImage ])}>
                                        + 标签
                                    </button>
                                </If>
                            </div>

                            <p className="font-bold secondary text-sm">所属主题</p>
                            <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                {selectedImage?.collections.map(collection =>
                                    <TaxonomyChip key={collection.id} name={collection.name}
                                                  color={collection.color} icon={collection.icon}
                                                  trailing={canWrite
                                                      ? <button type="button"
                                                                aria-label={`从主题 ${collection.name} 中移出`}
                                                                className="ml-0.5 rounded-full px-1 leading-none opacity-60 hover:opacity-100"
                                                                onClick={() => void removeCollection(selectedImage, collection.id)}>×</button>
                                                      : undefined}/>)}
                                <If condition={selectedImage?.collections.length === 0}>
                                    <span className="text-sm text-gray-400">未加入主题</span>
                                </If>
                                <If condition={canWrite}>
                                    <button type="button"
                                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600"
                                            onClick={() => selectedImage != null && setCollectionDialogTarget({
                                                mode: 'manage', images: [ selectedImage ]
                                            })}>
                                        + 主题
                                    </button>
                                </If>
                            </div>

                            <If condition={pickMode}>
                                <div className="flex gap-3 mb-3">
                                    <Button pill disabled={loading} color="blue" onClick={() => {
                                        if (onPick != null) {
                                            onPick(selectedImage!)
                                        }
                                    }}>选取</Button>
                                </div>
                            </If>
                            <If condition={canWrite}>
                                {selectedImage?.mediaType === 'image' &&
                                    <Button pill color="blue" className="mb-3"
                                            onClick={() => setEditingFocus(true)}>调整剪裁</Button>}
                                <Button pill disabled={loading} color="red"
                                        onClick={async () => {
                                            if (!canWrite) {
                                                showPermissionDenied()
                                                return
                                            }
                                            if (deleteConfirm && selectedImage != null) {
                                                setLoading(true)
                                                try {
                                                    await deleteImage(selectedImage.id)
                                                    setSelectedImage(null)
                                                    setDeleteConfirm(false)
                                                    refreshMedia()
                                                } catch (error) {
                                                    if (!handlePermissionError(error)) {
                                                        console.error('Failed to delete image:', error)
                                                    }
                                                } finally {
                                                    setLoading(false)
                                                }
                                            } else {
                                                setDeleteConfirm(true)
                                            }
                                        }}>{deleteConfirm ? '确认删除?' : '删除媒体'}</Button>
                            </If>
                        </div>
                    </If>
                </div>
            </div>
        </If>
    </>

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        {editingFocus && selectedImage?.mediaType === 'image' && <ImageFocusDialog
            key={selectedImage.id} image={selectedImage} uploadPrefix={page.uploadServePath}
            onClose={() => setEditingFocus(false)} onPermissionError={handlePermissionError}
            onSaved={image => {
                setSelectedImage(current => current == null ? current : { ...current, ...image })
                setPage(current => ({
                    ...current,
                    items: current.items.map(item => item.id === image.id ? { ...item, ...image } : item)
                }))
                setEditingFocus(false)
            }}/>}
        <TagAssignDialog open={tagDialogTarget != null} images={tagDialogTarget ?? []}
                         allTags={taxonomy.tags}
                         onClose={() => setTagDialogTarget(null)}
                         onSaved={() => {
                             setTagDialogTarget(null)
                             setBulkSelectedIds(new Set())
                             refreshMedia()
                         }}
                         onPermissionError={handlePermissionError}/>
        <CollectionPickerDialog open={collectionDialogTarget != null}
                                mode={collectionDialogTarget?.mode ?? 'bulk'}
                                images={collectionDialogTarget?.images ?? []}
                                collections={taxonomy.collections}
                                onClose={() => setCollectionDialogTarget(null)}
                                onSaved={() => {
                                    setCollectionDialogTarget(null)
                                    setBulkSelectedIds(new Set())
                                    refreshMedia()
                                }}
                                onPermissionError={handlePermissionError}/>

        <div className="p-8">
            <Tabs aria-label="媒体库选项卡" variant="default" ref={tabsRef}
                  onActiveTabChange={index => {
                      const mediaType = allowedMediaTypes[index]
                      if (mediaType == null) return
                      setSelectedImage(null)
                      setDeleteConfirm(false)
                      setCurrentPage(0)
                      setCurrentMediaType(mediaType)
                  }}>
                {allowedMediaTypes.includes('image') &&
                    <TabItem active={currentMediaType === 'image'} title="图片" icon={HiPhoto}>
                        {renderMediaPanel()}
                    </TabItem>}
                {allowedMediaTypes.includes('video') &&
                    <TabItem active={currentMediaType === 'video'} title="视频" icon={HiVideoCamera}>
                        {renderMediaPanel()}
                    </TabItem>}
                {canWrite ? (
                    <TabItem title="上传" icon={HiArrowUpTray}>
                        <UploadAreaClient uploadPrefix={page.uploadServePath} allowedMediaTypes={allowedMediaTypes}
                                          onAdded={image => {
                                              if (image.mediaType !== currentMediaType) return
                                              setCurrentPage(0)
                                              setRefreshVersion(version => version + 1)
                                          }}/>
                    </TabItem>
                ) : null}
            </Tabs>
        </div>
    </>
}

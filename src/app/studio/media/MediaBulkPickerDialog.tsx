'use client'

import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Pagination, TextInput } from 'flowbite-react'
import { HiMagnifyingGlass, HiVideoCamera } from 'react-icons/hi2'
import { useEffect, useState } from 'react'

import { getMedia } from '@/app/studio/media/media-actions'
import type { ImagePage, MediaType } from '@/app/studio/media/media-actions'

const MEDIA_TYPES: MediaType[] = [ 'image', 'video' ]

/** Multi-select media picker used to add images to a theme folder. */
export default function MediaBulkPickerDialog({
                                                  open, title = '添加媒体', excludeIds = [],
                                                  onClose, onPicked, onPermissionError
                                              }: {
    open: boolean
    title?: string
    excludeIds?: number[]
    onClose: () => void
    onPicked: (imageIds: number[]) => void
    onPermissionError: (error: unknown) => boolean
}) {
    const [ page, setPage ] = useState<ImagePage | null>(null)
    const [ loading, setLoading ] = useState(false)
    const [ currentPage, setCurrentPage ] = useState(0)
    const [ query, setQuery ] = useState('')
    const [ debouncedQuery, setDebouncedQuery ] = useState('')
    const [ selected, setSelected ] = useState<Set<number>>(new Set())
    const [ error, setError ] = useState('')

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(query), 250)
        return () => window.clearTimeout(timer)
    }, [ query ])

    useEffect(() => {
        if (!open) return
        setSelected(new Set())
        setCurrentPage(0)
        setQuery('')
        setDebouncedQuery('')
        setError('')
    }, [ open ])

    useEffect(() => {
        if (!open) return
        let cancelled = false
        setLoading(true)
        ;(async () => {
            const next = await getMedia(currentPage, MEDIA_TYPES, { query: debouncedQuery })
            if (!cancelled) {
                setPage(next)
                setLoading(false)
            }
        })().catch(caught => {
            if (cancelled) return
            if (!onPermissionError(caught)) setError('加载媒体失败，请重试。')
            setLoading(false)
        })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ open, currentPage, debouncedQuery ])

    function toggle(imageId: number) {
        setSelected(current => {
            const next = new Set(current)
            if (next.has(imageId)) {
                next.delete(imageId)
            } else {
                next.add(imageId)
            }
            return next
        })
    }

    return <Modal show={open} size="5xl" popup onClose={() => {
        if (!loading) onClose()
    }}>
        <ModalHeader/>
        <ModalBody>
            <h3 className="mb-4 text-xl font-bold">{title}</h3>
            {error.length > 0 && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="mb-4 flex items-center gap-3">
                <TextInput className="min-w-0 flex-1" icon={HiMagnifyingGlass} value={query}
                           placeholder="搜索名称或解释性文字" aria-label="搜索媒体"
                           onChange={event => setQuery(event.currentTarget.value)}/>
                <p className="shrink-0 text-sm text-gray-500">已选 {selected.size} 项</p>
            </div>
            {page == null || page.pages < 1
                ? <p className="py-12 text-center text-sm text-gray-500">
                    {loading ? '加载中…' : '没有找到媒体。'}
                </p>
                : <>
                    <div className="grid max-h-[26rem] grid-cols-6 gap-3 overflow-y-auto pr-1">
                        {page.items.map(image => {
                            const excluded = excludeIds.includes(image.id)
                            const checked = selected.has(image.id)
                            return <button type="button" key={image.id}
                                           aria-label={`${checked ? '取消选择' : '选择'}${image.mediaType === 'video' ? '视频' : '图片'}: ${image.altText || image.name}`}
                                           aria-pressed={checked}
                                           disabled={excluded}
                                           title={image.altText || image.name}
                                           className={`relative aspect-square overflow-hidden rounded border-2 transition-colors ${checked ? 'border-blue-600' : 'border-transparent'} ${excluded ? 'opacity-40' : 'hover:border-blue-300'}`}
                                           onClick={() => toggle(image.id)}>
                                <img className="h-full w-full object-cover" alt=""
                                     loading="lazy" decoding="async"
                                     src={`${page.uploadServePath}/${image.sha1}_thumb.webp`}/>
                                {image.mediaType === 'video' &&
                                    <span className="absolute bottom-1 left-1 rounded bg-black/70 p-0.5 text-white">
                                        <HiVideoCamera className="size-3"/>
                                    </span>}
                                {checked &&
                                    <span aria-hidden="true"
                                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">✓</span>}
                                {excluded &&
                                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                                        已在主题中
                                    </span>}
                            </button>
                        })}
                    </div>
                    {page.pages > 1 && <div className="mt-4 flex justify-center">
                        <Pagination currentPage={currentPage + 1} totalPages={page.pages}
                                    onPageChange={nextPage => setCurrentPage(nextPage - 1)}/>
                    </div>}
                </>}
        </ModalBody>
        <ModalFooter className="border-0">
            <Button pill color="blue" disabled={loading || selected.size === 0} onClick={() => {
                onPicked([ ...selected ])
            }}>添加 {selected.size} 项</Button>
            <Button pill color="alternative" disabled={loading} onClick={onClose}>取消</Button>
        </ModalFooter>
    </Modal>
}

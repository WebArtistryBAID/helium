'use client'

import { Alert, Button, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from 'flowbite-react'
import { useEffect, useMemo, useState } from 'react'

import type { MediaImage } from '@/app/studio/media/media-actions'
import {
    addTagsToImagesAction,
    removeTagsFromImagesAction,
    type TagSummary
} from '@/app/studio/media/taxonomy-actions'
import TagEditorDialog from '@/app/studio/media/TagEditorDialog'
import TaxonomyChip from '@/app/studio/media/TaxonomyChip'

type TagState = 'all' | 'some' | 'none'

function computeInitialState(images: MediaImage[], tags: TagSummary[]): Map<number, TagState> {
    const states = new Map<number, TagState>()
    for (const tag of tags) {
        let matched = 0
        for (const image of images) {
            if (image.tags.some(item => item.id === tag.id)) matched += 1
        }
        states.set(tag.id, matched === images.length ? 'all' : matched === 0 ? 'none' : 'some')
    }
    return states
}

/** Assigns tags to one image or to a bulk selection. Only rows the user touched are written. */
export default function TagAssignDialog({
                                            open, images, allTags, onClose, onSaved, onPermissionError
                                        }: {
    open: boolean
    images: MediaImage[]
    allTags: TagSummary[]
    onClose: () => void
    onSaved: () => void
    onPermissionError: (error: unknown) => boolean
}) {
    const [ tags, setTags ] = useState<TagSummary[]>([])
    const [ states, setStates ] = useState<Map<number, TagState>>(new Map())
    const [ dirty, setDirty ] = useState<Set<number>>(new Set())
    const [ search, setSearch ] = useState('')
    const [ saving, setSaving ] = useState(false)
    const [ error, setError ] = useState('')
    const [ creating, setCreating ] = useState(false)

    const imagesKey = images.map(image => image.id).join(',')
    useEffect(() => {
        if (!open) return
        setTags(allTags)
        setStates(computeInitialState(images, allTags))
        setDirty(new Set())
        setSearch('')
        setError('')
        setSaving(false)
        setCreating(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ open, imagesKey ])

    useEffect(() => {
        if (!open) return
        setTags(current => {
            const merged = [ ...current ]
            for (const tag of allTags) {
                if (!merged.some(item => item.id === tag.id)) merged.push(tag)
            }
            return merged
        })
    }, [ allTags, open ])

    const visibleTags = useMemo(() => {
        const query = search.trim().toLowerCase()
        const sorted = [ ...tags ].sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
        return query.length === 0 ? sorted : sorted.filter(tag => tag.name.toLowerCase().includes(query))
    }, [ tags, search ])

    function toggle(tagId: number) {
        setStates(current => {
            const next = new Map(current)
            next.set(tagId, current.get(tagId) === 'all' ? 'none' : 'all')
            return next
        })
        setDirty(current => new Set(current).add(tagId))
    }

    async function save() {
        const imageIds = images.map(image => image.id)
        const addTagIds = [ ...dirty ].filter(id => states.get(id) === 'all')
        const removeTagIds = [ ...dirty ].filter(id => states.get(id) === 'none')
        if (addTagIds.length === 0 && removeTagIds.length === 0) {
            onClose()
            return
        }
        setSaving(true)
        setError('')
        try {
            if (addTagIds.length > 0) {
                const result = await addTagsToImagesAction({ imageIds, tagIds: addTagIds })
                if (!result.ok) {
                    setError(result.message)
                    return
                }
            }
            if (removeTagIds.length > 0) {
                const result = await removeTagsFromImagesAction({ imageIds, tagIds: removeTagIds })
                if (!result.ok) {
                    setError(result.message)
                    return
                }
            }
            onSaved()
        } catch (caught) {
            if (!onPermissionError(caught)) setError('保存失败，请重试。')
        } finally {
            setSaving(false)
        }
    }

    return <>
        <Modal show={open} size="lg" popup onClose={() => {
            if (!saving) onClose()
        }}>
            <ModalHeader/>
            <ModalBody>
                <h3 className="mb-1 text-xl font-bold">设置标签</h3>
                <p className="mb-4 text-sm text-gray-500">
                    为 {images.length} 个媒体设置标签。勾选表示加入，取消勾选表示移出。
                </p>
                {error.length > 0 && <Alert color="failure" className="mb-4">{error}</Alert>}
                <div className="mb-3 flex gap-2">
                    <TextInput className="min-w-0 flex-1" value={search} placeholder="搜索标签"
                               aria-label="搜索标签"
                               onChange={event => setSearch(event.currentTarget.value)}/>
                    <Button pill color="light" onClick={() => setCreating(true)}>新建标签</Button>
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                    {visibleTags.length === 0 && <p className="py-6 text-center text-sm text-gray-500">
                        {tags.length === 0 ? '还没有标签，先新建一个吧。' : '没有匹配的标签。'}
                    </p>}
                    {visibleTags.map(tag => {
                        const state = states.get(tag.id) ?? 'none'
                        const changed = dirty.has(tag.id)
                        return <button type="button" key={tag.id}
                                       aria-pressed={state === 'all'}
                                       onClick={() => toggle(tag.id)}
                                       className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50 ${changed ? 'bg-blue-50/40' : ''}`}>
                            <span aria-hidden="true"
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${state === 'all' ? 'border-blue-600 bg-blue-600 text-white' : state === 'some' ? 'border-blue-400 bg-blue-100 text-blue-600' : 'border-gray-300 bg-white text-transparent'}`}>
                                {state === 'all' ? '✓' : state === 'some' ? '–' : '✓'}
                            </span>
                            <TaxonomyChip name={tag.name} color={tag.color} icon={tag.icon}/>
                            <span className="ml-auto text-xs text-gray-400">{tag.imageCount}</span>
                        </button>
                    })}
                </div>
            </ModalBody>
            <ModalFooter className="border-0">
                <Button pill color="blue" disabled={saving} onClick={() => void save()}>
                    {saving ? '保存中…' : '保存'}
                </Button>
                <Button pill color="alternative" disabled={saving} onClick={onClose}>取消</Button>
            </ModalFooter>
        </Modal>

        <TagEditorDialog open={creating} existingTags={tags} onClose={() => setCreating(false)}
                         onPermissionError={onPermissionError}
                         onSaved={tag => {
                             setTags(current => [ ...current, tag ])
                             setStates(current => new Map(current).set(tag.id, 'all'))
                             setDirty(current => new Set(current).add(tag.id))
                             setCreating(false)
                         }}/>
    </>
}

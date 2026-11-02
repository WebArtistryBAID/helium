'use client'

import { Alert, Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react'
import { useEffect, useMemo, useState } from 'react'

import type { MediaImage } from '@/app/studio/media/media-actions'
import {
    addImagesToCollectionAction,
    removeImageFromCollectionAction,
    type CollectionSummary
} from '@/app/studio/media/taxonomy-actions'
import { buildCollectionTree, flattenCollectionTree } from '@/app/studio/media/taxonomy-tree'
import TaxonomyChip from '@/app/studio/media/TaxonomyChip'

type Props = {
    open: boolean
    /** `bulk` adds every image to one theme; `manage` edits one image's memberships. */
    mode: 'bulk' | 'manage'
    images: MediaImage[]
    collections: CollectionSummary[]
    onClose: () => void
    onSaved: () => void
    onPermissionError: (error: unknown) => boolean
}

export default function CollectionPickerDialog({
                                                   open, mode, images, collections, onClose, onSaved, onPermissionError
                                               }: Props) {
    const [ selectedIds, setSelectedIds ] = useState<Set<number>>(new Set())
    const [ initialIds, setInitialIds ] = useState<Set<number>>(new Set())
    const [ bulkTargetId, setBulkTargetId ] = useState('')
    const [ saving, setSaving ] = useState(false)
    const [ error, setError ] = useState('')

    const imagesKey = images.map(image => image.id).join(',')
    useEffect(() => {
        if (!open) return
        const current = new Set<number>(mode === 'manage' && images.length === 1
            ? images[0].collections.map(collection => collection.id)
            : [])
        setSelectedIds(current)
        setInitialIds(new Set(current))
        setBulkTargetId('')
        setError('')
        setSaving(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ open, imagesKey, mode ])

    const flat = useMemo(() => flattenCollectionTree(buildCollectionTree(collections)), [ collections ])

    function toggle(collectionId: number) {
        setSelectedIds(current => {
            const next = new Set(current)
            if (next.has(collectionId)) {
                next.delete(collectionId)
            } else {
                next.add(collectionId)
            }
            return next
        })
    }

    async function save() {
        setSaving(true)
        setError('')
        try {
            if (mode === 'bulk') {
                const collectionId = Number(bulkTargetId)
                if (!Number.isSafeInteger(collectionId) || collectionId <= 0) {
                    setError('请选择一个主题')
                    return
                }
                const result = await addImagesToCollectionAction({
                    collectionId, imageIds: images.map(image => image.id)
                })
                if (!result.ok) {
                    setError(result.message)
                    return
                }
                onSaved()
                return
            }
            const image = images[0]
            if (image == null) {
                onClose()
                return
            }
            const addIds = [ ...selectedIds ].filter(id => !initialIds.has(id))
            const removeIds = [ ...initialIds ].filter(id => !selectedIds.has(id))
            for (const collectionId of addIds) {
                const result = await addImagesToCollectionAction({ collectionId, imageIds: [ image.id ] })
                if (!result.ok) {
                    setError(result.message)
                    return
                }
            }
            for (const collectionId of removeIds) {
                const result = await removeImageFromCollectionAction({ collectionId, imageId: image.id })
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

    return <Modal show={open} size="lg" popup onClose={() => {
        if (!saving) onClose()
    }}>
        <ModalHeader/>
        <ModalBody>
            <h3 className="mb-1 text-xl font-bold">加入主题</h3>
            <p className="mb-4 text-sm text-gray-500">
                {mode === 'bulk'
                    ? `把选中的 ${images.length} 个媒体加入一个主题文件夹。`
                    : '勾选这个媒体所属的主题。'}
            </p>
            {error.length > 0 && <Alert color="failure" className="mb-4">{error}</Alert>}
            {flat.length === 0
                ? <p className="py-8 text-center text-sm text-gray-500">
                    还没有主题。请先到「主题与关系」页面创建主题。
                </p>
                : mode === 'bulk'
                    ? <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                        {flat.map(node => <button type="button" key={node.id}
                                                  aria-pressed={bulkTargetId === String(node.id)}
                                                  onClick={() => setBulkTargetId(String(node.id))}
                                                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50 ${bulkTargetId === String(node.id) ? 'bg-blue-50' : ''}`}>
                            <span aria-hidden="true"
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${bulkTargetId === String(node.id) ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                {bulkTargetId === String(node.id) &&
                                    <span className="h-1.5 w-1.5 rounded-full bg-white"/>}
                            </span>
                            <span className="text-gray-400">{'　'.repeat(node.depth)}</span>
                            <TaxonomyChip name={node.name} color={node.color} icon={node.icon}/>
                        </button>)}
                    </div>
                    : <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                        {flat.map(node => {
                            const checked = selectedIds.has(node.id)
                            return <button type="button" key={node.id}
                                           aria-pressed={checked}
                                           onClick={() => toggle(node.id)}
                                           className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50">
                                <span aria-hidden="true"
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                                    ✓
                                </span>
                                <span className="text-gray-400">{'　'.repeat(node.depth)}</span>
                                <TaxonomyChip name={node.name} color={node.color} icon={node.icon}/>
                                {selectedIds.has(node.id) && <span className="ml-auto text-xs text-blue-600">已加入</span>}
                            </button>
                        })}
                    </div>}
        </ModalBody>
        <ModalFooter className="border-0">
            <Button pill color="blue" disabled={saving || flat.length === 0} onClick={() => void save()}>
                {saving ? '保存中…' : mode === 'bulk' ? '加入' : '保存'}
            </Button>
            <Button pill color="alternative" disabled={saving} onClick={onClose}>取消</Button>
        </ModalFooter>
    </Modal>
}

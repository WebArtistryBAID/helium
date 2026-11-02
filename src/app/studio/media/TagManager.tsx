'use client'

import { Alert, Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react'
import { HiPlus } from 'react-icons/hi2'
import { useMemo, useState } from 'react'

import {
    deleteTagAction,
    type MediaTaxonomy,
    type TagSummary
} from '@/app/studio/media/taxonomy-actions'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'
import TagEditorDialog from '@/app/studio/media/TagEditorDialog'
import TaxonomyIcon from '@/app/studio/media/TaxonomyIcon'
import TaxonomyChip from '@/app/studio/media/TaxonomyChip'

function sortTags(tags: TagSummary[]): TagSummary[] {
    return [ ...tags ].sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
}

/** 标签管理：创建、编辑、删除标签。 */
export default function TagManager({ init, canWrite }: { init: MediaTaxonomy; canWrite: boolean }) {
    const [ tags, setTags ] = useState<TagSummary[]>(sortTags(init.tags))
    const [ editorOpen, setEditorOpen ] = useState(false)
    const [ editingTag, setEditingTag ] = useState<TagSummary | null>(null)
    const [ deletingTag, setDeletingTag ] = useState<TagSummary | null>(null)
    const [ deleting, setDeleting ] = useState(false)
    const [ error, setError ] = useState('')
    const {
        permissionDenied, showPermissionDenied, closePermissionDenied, handlePermissionError
    } = usePermissionDialog()

    const totalUsage = useMemo(() => tags.reduce((total, tag) => total + tag.imageCount, 0), [ tags ])

    function openCreate() {
        if (!canWrite) {
            showPermissionDenied()
            return
        }
        setEditingTag(null)
        setEditorOpen(true)
    }

    function openEdit(tag: TagSummary) {
        if (!canWrite) {
            showPermissionDenied()
            return
        }
        setEditingTag(tag)
        setEditorOpen(true)
    }

    async function confirmDelete() {
        if (deletingTag == null) return
        setDeleting(true)
        setError('')
        try {
            const result = await deleteTagAction(deletingTag.id)
            if (!result.ok) {
                setError(result.message)
                return
            }
            setTags(current => current.filter(tag => tag.id !== deletingTag.id))
            setDeletingTag(null)
        } catch (caught) {
            if (!handlePermissionError(caught)) setError('删除失败，请重试。')
        } finally {
            setDeleting(false)
        }
    }

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        <div className="p-16">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl">标签管理</h1>
                <Button pill color="blue" onClick={openCreate}>
                    <HiPlus className="mr-2 size-4"/>新建标签
                </Button>
            </div>
            <p className="mb-6 text-sm text-gray-500">
                标签可以为任意媒体着色并选择图标，一张图片可以有多个标签。共 {tags.length} 个标签，
                使用了 {totalUsage} 次。
            </p>

            {error.length > 0 && <Alert color="failure" className="mb-4" onDismiss={() => setError('')}>
                {error}
            </Alert>}

            {tags.length === 0
                ? <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16">
                    <img src="/assets/reading-light.png" alt="" className="mb-3 h-40"/>
                    <p className="mb-3 text-gray-600">还没有标签。创建第一个标签，开始整理媒体库吧。</p>
                    <Button pill color="blue" onClick={openCreate}>新建标签</Button>
                </div>
                : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {tags.map(tag => <div key={tag.id}
                                          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span aria-hidden="true"
                                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                                      style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}>
                                    <TaxonomyIcon icon={tag.icon} size={20}/>
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-lg font-bold" style={{ color: tag.color }}>
                                        {tag.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{tag.imageCount} 个媒体</p>
                                </div>
                            </div>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums"
                                  style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}>
                                {tag.color}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="xs" pill color="light" onClick={() => openEdit(tag)}>编辑</Button>
                            <Button size="xs" pill color="red" disabled={!canWrite}
                                    onClick={() => {
                                        setError('')
                                        setDeletingTag(tag)
                                    }}>删除</Button>
                        </div>
                    </div>)}
                </div>}
        </div>

        <TagEditorDialog open={editorOpen} tag={editingTag} existingTags={tags}
                         onClose={() => setEditorOpen(false)}
                         onPermissionError={handlePermissionError}
                         onSaved={saved => {
                             setTags(current => sortTags(editingTag == null
                                 ? [ ...current, saved ]
                                 : current.map(tag => tag.id === saved.id ? saved : tag)))
                             setEditorOpen(false)
                         }}/>

        <Modal show={deletingTag != null} size="md" popup onClose={() => {
            if (!deleting) setDeletingTag(null)
        }}>
            <ModalHeader/>
            <ModalBody>
                <h3 className="mb-3 text-xl font-bold">删除标签</h3>
                <p className="text-sm text-gray-600">
                    确定要删除标签 <TaxonomyChip name={deletingTag?.name ?? ''} color={deletingTag?.color ?? '#3b82f6'}
                                              icon={deletingTag?.icon}/> 吗？
                    删除标签不会删除任何图片，只会从 {deletingTag?.imageCount ?? 0} 个媒体上移除这个标签。
                </p>
            </ModalBody>
            <ModalFooter className="border-0">
                <Button pill color="red" disabled={deleting} onClick={() => void confirmDelete()}>
                    {deleting ? '删除中…' : '删除'}
                </Button>
                <Button pill color="alternative" disabled={deleting}
                        onClick={() => setDeletingTag(null)}>取消</Button>
            </ModalFooter>
        </Modal>
    </>
}

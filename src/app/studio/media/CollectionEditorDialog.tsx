'use client'

import { Alert, Button, Label, Modal, ModalBody, ModalFooter, ModalHeader, Select, Textarea, TextInput } from 'flowbite-react'
import { useEffect, useMemo, useState } from 'react'

import {
    createCollectionAction,
    updateCollectionAction,
    type CollectionSummary
} from '@/app/studio/media/taxonomy-actions'
import { COLLECTION_COLOR_PRESETS, DEFAULT_COLLECTION_COLOR, DEFAULT_COLLECTION_ICON, ICON_PRESETS } from '@/app/studio/media/taxonomy-presets'
import { buildCollectionTree, flattenCollectionTree } from '@/app/studio/media/taxonomy-tree'
import TaxonomyChip from '@/app/studio/media/TaxonomyChip'
import TaxonomyIcon from '@/app/studio/media/TaxonomyIcon'

type Props = {
    open: boolean
    collection?: CollectionSummary | null
    collections: CollectionSummary[]
    defaultParentId?: number | null
    onClose: () => void
    onSaved: (collection: CollectionSummary) => void
    onPermissionError: (error: unknown) => boolean
}

/** Creates or edits a theme folder, including its place in the nested theme tree. */
export default function CollectionEditorDialog({
                                                   open, collection, collections, defaultParentId = null,
                                                   onClose, onSaved, onPermissionError
                                               }: Props) {
    const [ name, setName ] = useState('')
    const [ color, setColor ] = useState(DEFAULT_COLLECTION_COLOR)
    const [ icon, setIcon ] = useState<string>(DEFAULT_COLLECTION_ICON)
    const [ description, setDescription ] = useState('')
    const [ parentId, setParentId ] = useState('')
    const [ saving, setSaving ] = useState(false)
    const [ error, setError ] = useState('')

    useEffect(() => {
        if (!open) return
        setName(collection?.name ?? '')
        setColor(collection?.color ?? DEFAULT_COLLECTION_COLOR)
        setIcon(collection?.icon ?? DEFAULT_COLLECTION_ICON)
        setDescription(collection?.description ?? '')
        setParentId(String(collection?.parentId ?? defaultParentId ?? ''))
        setError('')
        setSaving(false)
    }, [ open, collection, defaultParentId ])

    const parentOptions = useMemo(() => {
        const nodes = flattenCollectionTree(buildCollectionTree(collections))
        if (collection == null) return nodes
        const excluded = new Set<number>([ collection.id ])
        let changed = true
        while (changed) {
            changed = false
            for (const node of nodes) {
                if (node.parentId != null && excluded.has(node.parentId) && !excluded.has(node.id)) {
                    excluded.add(node.id)
                    changed = true
                }
            }
        }
        return nodes.filter(node => !excluded.has(node.id))
    }, [ collections, collection ])

    async function save() {
        const trimmedName = name.trim()
        if (trimmedName.length === 0) {
            setError('请填写主题名称')
            return
        }
        const effectiveParent = parentId === '' ? null : Number(parentId)
        const siblingTaken = collections.some(item => item.id !== collection?.id
            && (item.parentId ?? null) === effectiveParent && item.name === trimmedName)
        if (siblingTaken) {
            setError('同一层级下已存在同名主题')
            return
        }
        setSaving(true)
        setError('')
        try {
            const payload = {
                name: trimmedName,
                color,
                icon,
                description: description.trim(),
                parentId: effectiveParent
            }
            const result = collection == null
                ? await createCollectionAction(payload)
                : await updateCollectionAction({ id: collection.id, ...payload })
            if (!result.ok) {
                setError(result.message)
                return
            }
            onSaved(result.data)
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
            <h3 className="mb-4 text-xl font-bold">{collection == null ? '新建主题' : '编辑主题'}</h3>
            {error.length > 0 && <Alert color="failure" className="mb-4">{error}</Alert>}
            <div className="mb-4 flex items-center justify-center rounded-2xl bg-gray-50 py-4">
                <TaxonomyChip name={name.trim() || '主题预览'} color={color} icon={icon}
                              className="px-4 py-1.5 text-sm"/>
            </div>
            <div className="mb-3">
                <Label htmlFor="collection-name" className="mb-1 block">名称</Label>
                <TextInput id="collection-name" value={name} maxLength={60} autoFocus
                           placeholder="例如：2026 校园开放日"
                           onChange={event => setName(event.currentTarget.value)}
                           onKeyDown={event => {
                               if (event.key === 'Enter') {
                                   event.preventDefault()
                                   void save()
                               }
                           }}/>
            </div>
            <div className="mb-3">
                <Label className="mb-1 block">图标</Label>
                <div className="flex flex-wrap gap-1.5">
                    {ICON_PRESETS.map(preset => <button type="button" key={preset}
                                                        aria-label={`使用图标 ${preset}`}
                                                        aria-pressed={icon === preset}
                                                        title={preset}
                                                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${icon === preset ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'}`}
                                                        onClick={() => setIcon(preset)}>
                        <TaxonomyIcon icon={preset} size={16} color={icon === preset ? color : '#64748b'}/>
                    </button>)}
                </div>
            </div>
            <div className="mb-3">
                <Label className="mb-1 block">颜色</Label>
                <div className="flex flex-wrap items-center gap-2">
                    {COLLECTION_COLOR_PRESETS.map(preset => <button type="button" key={preset}
                                                                    aria-label={`使用颜色 ${preset}`}
                                                                    aria-pressed={color === preset}
                                                                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 ${color === preset ? 'border-gray-900' : 'border-white'}`}
                                                                    style={{ backgroundColor: preset }}
                                                                    onClick={() => setColor(preset)}/>)}
                    <label className="ml-2 inline-flex items-center gap-2 text-sm text-gray-600">
                        自定义
                        <input type="color" value={color} aria-label="自定义颜色"
                               className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
                               onChange={event => setColor(event.currentTarget.value)}/>
                    </label>
                </div>
            </div>
            <div className="mb-3">
                <Label htmlFor="collection-parent" className="mb-1 block">上级主题</Label>
                <Select id="collection-parent" value={parentId}
                        onChange={event => setParentId(event.currentTarget.value)}>
                    <option value="">（顶层主题）</option>
                    {parentOptions.map(node => <option key={node.id} value={node.id}>
                        {'　'.repeat(node.depth)}{node.name}
                    </option>)}
                </Select>
            </div>
            <div>
                <Label htmlFor="collection-description" className="mb-1 block">描述（可选）</Label>
                <Textarea id="collection-description" value={description} rows={3} maxLength={500}
                          placeholder="这个主题包含哪些内容？和哪些主题相关？"
                          onChange={event => setDescription(event.currentTarget.value)}/>
            </div>
        </ModalBody>
        <ModalFooter className="border-0">
            <Button pill color="blue" disabled={saving} onClick={() => void save()}>
                {saving ? '保存中…' : '保存'}
            </Button>
            <Button pill color="alternative" disabled={saving} onClick={onClose}>取消</Button>
        </ModalFooter>
    </Modal>
}

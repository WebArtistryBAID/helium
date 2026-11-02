'use client'

import { Alert, Button, Label, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from 'flowbite-react'
import { useEffect, useState } from 'react'

import type { TagSummary } from '@/app/studio/media/taxonomy-actions'
import { createTagAction, updateTagAction } from '@/app/studio/media/taxonomy-actions'
import { DEFAULT_TAG_COLOR, DEFAULT_TAG_ICON, ICON_PRESETS, TAG_COLOR_PRESETS } from '@/app/studio/media/taxonomy-presets'
import TaxonomyChip from '@/app/studio/media/TaxonomyChip'
import TaxonomyIcon from '@/app/studio/media/TaxonomyIcon'

type Props = {
    open: boolean
    tag?: TagSummary | null
    /** Tags known to the client, used for a friendly duplicate-name check before saving. */
    existingTags?: TagSummary[]
    onClose: () => void
    onSaved: (tag: TagSummary) => void
    onPermissionError: (error: unknown) => boolean
}

export default function TagEditorDialog({
                                            open, tag, existingTags = [], onClose, onSaved, onPermissionError
                                        }: Props) {
    const [ name, setName ] = useState('')
    const [ color, setColor ] = useState(DEFAULT_TAG_COLOR)
    const [ icon, setIcon ] = useState<string>(DEFAULT_TAG_ICON)
    const [ saving, setSaving ] = useState(false)
    const [ error, setError ] = useState('')

    useEffect(() => {
        if (!open) return
        setName(tag?.name ?? '')
        setColor(tag?.color ?? DEFAULT_TAG_COLOR)
        setIcon(tag?.icon ?? DEFAULT_TAG_ICON)
        setError('')
        setSaving(false)
    }, [ open, tag ])

    async function save() {
        const trimmedName = name.trim()
        if (trimmedName.length === 0) {
            setError('请填写标签名称')
            return
        }
        if (existingTags.some(item => item.id !== tag?.id && item.name === trimmedName)) {
            setError('已存在同名标签')
            return
        }
        setSaving(true)
        setError('')
        try {
            const result = tag == null
                ? await createTagAction({ name: trimmedName, color, icon })
                : await updateTagAction({ id: tag.id, name: trimmedName, color, icon })
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
            <h3 className="mb-4 text-xl font-bold">{tag == null ? '新建标签' : '编辑标签'}</h3>
            {error.length > 0 && <Alert color="failure" className="mb-4">{error}</Alert>}
            <div className="mb-4 flex items-center justify-center rounded-2xl bg-gray-50 py-4">
                <TaxonomyChip name={name.trim() || '标签预览'} color={color} icon={icon}
                              className="px-4 py-1.5 text-sm"/>
            </div>
            <div className="mb-4">
                <Label htmlFor="tag-name" className="mb-1 block">名称</Label>
                <TextInput id="tag-name" value={name} maxLength={60} autoFocus
                           placeholder="例如：校园活动"
                           onChange={event => setName(event.currentTarget.value)}
                           onKeyDown={event => {
                               if (event.key === 'Enter') {
                                   event.preventDefault()
                                   void save()
                               }
                           }}/>
            </div>
            <div className="mb-4">
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
            <div>
                <Label className="mb-1 block">颜色</Label>
                <div className="flex flex-wrap items-center gap-2">
                    {TAG_COLOR_PRESETS.map(preset => <button type="button" key={preset}
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
        </ModalBody>
        <ModalFooter className="border-0">
            <Button pill color="blue" disabled={saving} onClick={() => void save()}>
                {saving ? '保存中…' : '保存'}
            </Button>
            <Button pill color="alternative" disabled={saving} onClick={onClose}>取消</Button>
        </ModalFooter>
    </Modal>
}

'use client'

import { HydratedContentEntity } from '@/app/lib/data-types'
import {
    deleteContentEntity,
    getContentEntity,
    unpublishContentEntity,
    updateContentEntity
} from '@/app/studio/editor/entity-actions'
import { useSaveShortcut } from '@/app/lib/save/useSaveShortcuts'
import { useSavableEntity } from '@/app/lib/save/useSavableEntity'
import { useCallback, useEffect, useState } from 'react'
import { useEntityLock } from '@/app/lib/lock/useEntityLock'
import LockBrokenPrompt from '@/app/lib/lock/LockBrokenPrompt'
import { Puck } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import StableInlineText from '@/app/lib/puck/StableInlineText'
import { Badge, Button, HelperText, Label, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from 'flowbite-react'
import { useRouter } from 'next/navigation'
import If from '@/app/lib/If'
import '@measured/puck/puck.css'
import { Role, User } from '@/generated/prisma/browser'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'

const STABLE_INLINE_TEXT_TRANSFORMS = {
    text: ({ componentId, field, isReadOnly, propPath, value }: any) =>
        field.contentEditable && typeof value === 'string'
            ? <StableInlineText componentId={componentId} disableLineBreaks isReadOnly={isReadOnly}
                                propPath={propPath} value={value}/>
            : value,
    textarea: ({ componentId, field, isReadOnly, propPath, value }: any) =>
        field.contentEditable && typeof value === 'string'
            ? <StableInlineText componentId={componentId} isReadOnly={isReadOnly}
                                propPath={propPath} value={value}/>
            : value,
    custom: ({ componentId, field, isReadOnly, propPath, value }: any) =>
        field.contentEditable && typeof value === 'string'
            ? <StableInlineText componentId={componentId} isReadOnly={isReadOnly}
                                propPath={propPath} value={value}/>
            : value
}

const AUTO_SAVE_INTERVAL_MS = 30_000

export default function PageEditor({ init, lockToken, user, host }: {
    init: HydratedContentEntity,
    lockToken: string,
    user: User,
    host: string
}) {
    const [ showLockBroken, setShowLockBroken ] = useState(false)
    const [ showMetadata, setShowMetadata ] = useState(false)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ unpublishConfirm, setUnpublishConfirm ] = useState(false)
    const [ loadingAdditional, setLoadingAdditional ] = useState(false)
    const [ inEnglish, setInEnglish ] = useState(false)

    const router = useRouter()
    const canWrite = user.roles.includes(Role.writer)
    const canModerate = user.roles.includes(Role.editor)
    const {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    // = Switch language
    function switchLanguage() {
        setInEnglish(!inEnglish)
    }

    // = Save
    const {
        draft,
        setDraft,
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
            slug: draft.slug,
            contentDraftEN: draft.contentDraftEN,
            contentDraftZH: draft.contentDraftZH,
            shortContentDraftEN: null,
            shortContentDraftZH: null,
            categoryEN: null,
            categoryZH: null,
            coverImageDraftId: null,
            createdAt: draft.createdAt
        }),
        refreshFn: async () => (await getContentEntity(init.id))!,
        compareKeys: [
            'titleDraftEN',
            'titleDraftZH',
            'slug',
            'contentDraftEN',
            'contentDraftZH',
            'createdAt'
        ]
    })

    const guardedSave = useCallback(async () => {
        if (!canWrite) {
            showPermissionDenied()
            return
        }
        try {
            await save()
        } catch (error) {
            if (!handlePermissionError(error)) {
                console.error('Failed to save page:', error)
            }
        }
    }, [ canWrite, handlePermissionError, save, showPermissionDenied ])

    useSaveShortcut(true, guardedSave)

    useEffect(() => {
        if (!canWrite || showLockBroken) return

        const interval = window.setInterval(() => {
            if (hasChanges && !loading) void guardedSave()
        }, AUTO_SAVE_INTERVAL_MS)

        return () => window.clearInterval(interval)
    }, [ canWrite, guardedSave, hasChanges, loading, showLockBroken ])

    // = Locking
    useEntityLock({
        entityType: init.type,
        entityId: draft.id,
        token: lockToken,
        hasChanges,
        onLockLost: () => setShowLockBroken(true)
    })

    const publishStatus = draft.contentPublishedEN === draft.contentDraftEN && draft.contentPublishedZH === draft.contentDraftZH
        ? { label: '已发布', color: 'blue' }
        : draft.contentPublishedEN != null || draft.contentPublishedZH != null
            ? { label: '有更新未发布', color: 'warning' }
            : { label: '草稿', color: 'gray' }
    const pageUrl = `${host.replace(/\/+$/, '')}/${draft.slug.replace(/^\/+/, '')}`

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        <LockBrokenPrompt show={showLockBroken} returnUri="/studio/pages"/>

        <Modal show={showMetadata} size="xl" popup onClose={() => setShowMetadata(false)}>
            <ModalHeader>页面信息</ModalHeader>
            <ModalBody>
                <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <div className="mb-2 block">
                                <Label htmlFor="title-zh">标题</Label>
                            </div>
                            <TextInput id="title-zh" value={`${draft.titleDraftZH} / ${draft.titleDraftEN}`} disabled/>
                            <HelperText>请通过编辑器更改标题。</HelperText>
                        </div>

                        <div className="sm:col-span-2">
                            <div className="mb-2 block">
                                <Label htmlFor="slug">链接位置</Label>
                            </div>
                            <TextInput id="slug" value={draft.slug} placeholder="better-me-better-world"
                                       disabled={!canWrite}
                                       onChange={e => {
                                           if (!canWrite) {
                                               showPermissionDenied()
                                               return
                                           }
                                           const val = e.currentTarget?.value ?? '' // I really don't know why it can be null
                                           setDraft(prev => ({
                                               ...prev,
                                               slug: val
                                           }))
                                       }}/>
                            <HelperText>保存后，链接更新才会生效。</HelperText>
                            <HelperText className="break-all">本页面将显示于 {pageUrl}。</HelperText>
                        </div>
                    </div>

                    <dl className="grid gap-4 border-t border-gray-200 pt-5 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-gray-500">状态</dt>
                            <dd className="mt-1 font-medium text-gray-900">{publishStatus.label}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">创建用户</dt>
                            <dd className="mt-1 font-medium text-gray-900">{draft.creator.name}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">创建时间</dt>
                            <dd className="mt-1 font-medium text-gray-900">{draft.createdAt.toLocaleString()}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">最新更改时间</dt>
                            <dd className="mt-1 font-medium text-gray-900">{draft.updatedAt.toLocaleString()}</dd>
                        </div>
                    </dl>

                    <p className="text-sm text-gray-500">关闭后，请务必保存。</p>
                </div>
            </ModalBody>
            <ModalFooter className="flex flex-wrap items-center gap-2">
                <If condition={canWrite}>
                    <Button pill size="md" color="alternative" className="whitespace-nowrap"
                            onClick={() => {
                                if (!canWrite) {
                                    showPermissionDenied()
                                    return
                                }
                                setDraft(prev => ({
                                    ...prev,
                                    contentDraftEN: prev.contentDraftZH,
                                    titleDraftEN: prev.titleDraftZH
                                }))
                            }}>用中文内容覆盖英文</Button>
                </If>

                <div className="ml-auto flex flex-wrap gap-2">
                    <If condition={canModerate && (draft.contentPublishedEN != null || draft.contentPublishedZH != null)}>
                        <Button disabled={loadingAdditional} pill size="md" color="red" className="whitespace-nowrap"
                                onClick={async () => {
                        if (!canModerate) {
                            showPermissionDenied()
                            return
                        }
                        if (!unpublishConfirm) {
                            setUnpublishConfirm(true)
                            return
                        }
                        setLoadingAdditional(true)
                        try {
                            await unpublishContentEntity(draft.id)
                            await refresh()
                            setUnpublishConfirm(false)
                            setDraft(prev => ({ // Somehow refreshing doesn't work so we update the state locally
                                ...prev,
                                titlePublishedEN: null,
                                titlePublishedZH: null,
                                contentPublishedEN: null,
                                contentPublishedZH: null
                            }))
                            router.refresh()
                        } catch (error) {
                            if (!handlePermissionError(error)) {
                                console.error('Failed to unpublish page:', error)
                            }
                        } finally {
                            setLoadingAdditional(false)
                        }
                                }}>
                            {unpublishConfirm ? '确认撤回?' : '撤回发布'}
                        </Button>
                    </If>
                    <If condition={canModerate}>
                        <Button disabled={loadingAdditional} pill size="md" color="red" className="whitespace-nowrap"
                                onClick={async () => {
                        if (!canModerate) {
                            showPermissionDenied()
                            return
                        }
                        if (!deleteConfirm) {
                            setDeleteConfirm(true)
                            return
                        }
                        setLoadingAdditional(true)
                        try {
                            await deleteContentEntity(draft.id)
                            router.push('/studio/pages')
                        } catch (error) {
                            if (!handlePermissionError(error)) {
                                console.error('Failed to delete page:', error)
                            }
                        } finally {
                            setLoadingAdditional(false)
                        }
                                }}>{deleteConfirm ? '确认删除?' : '删除页面'}</Button>
                    </If>
                </div>
            </ModalFooter>
        </Modal>

        <div className="page-editor">
            <Puck
                key={inEnglish ? 'en' : 'zh'} // Force re-render
                config={PUCK_CONFIG}
                data={JSON.parse(inEnglish ? draft.contentDraftEN : draft.contentDraftZH)} // Avoid empty string error
                fieldTransforms={STABLE_INLINE_TEXT_TRANSFORMS}
                onChange={data => {
                    if (!canWrite) {
                        showPermissionDenied()
                        return
                    }
                    if (inEnglish) {
                        setDraft(prev => ({
                            ...prev,
                            contentDraftEN: JSON.stringify(data),
                            titleDraftEN: data.root.props?.title ?? ''
                        }))
                    } else {
                        setDraft(prev => ({
                            ...prev,
                            contentDraftZH: JSON.stringify(data),
                            titleDraftZH: data.root.props?.title ?? ''
                        }))
                    }
                }}
                overrides={{
                    headerActions: () => <>
                        <Button pill size="md" color="alternative"
                                onClick={switchLanguage}>切换到{inEnglish ? '中文' : '英文'}</Button>
                        <Button pill size="md" color="alternative"
                                onClick={() => setShowMetadata(true)}>页面信息</Button>
                        <Button pill size="md" color="alternative"
                                onClick={() => router.push(`/studio/pages/${draft.id}/approval`)}>审核与发布</Button>
                        <If condition={canWrite}>
                            <Button pill size="md" color="blue" disabled={loading || !hasChanges} onClick={guardedSave}>
                                {loading ? '保存中…' : hasChanges ? '保存更改' : '已保存'}
                            </Button>
                        </If>
                    </>
                }}
            />
        </div>
    </>
}

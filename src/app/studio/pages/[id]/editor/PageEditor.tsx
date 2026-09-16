'use client'

import { HydratedContentEntity } from '@/app/lib/data-types'
import {
    deleteContentEntity,
    getContentEntity,
    restoreContentEntityDraftFromPublished,
    unpublishContentEntity,
    updateContentEntity
} from '@/app/studio/editor/entity-actions'
import { useSaveShortcut } from '@/app/lib/save/useSaveShortcuts'
import { useSavableEntity } from '@/app/lib/save/useSavableEntity'
import { useCallback, useEffect, useState } from 'react'
import { useEntityLock } from '@/app/lib/lock/useEntityLock'
import LockBrokenPrompt from '@/app/lib/lock/LockBrokenPrompt'
import { Puck } from '@puckeditor/core'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import StableInlineText from '@/app/lib/puck/StableInlineText'
import PuckComments, { PuckCommentActionBar, PuckCommentHighlights } from '@/app/studio/pages/[id]/editor/PuckComments'
import { Button, HelperText, Label, Modal, ModalBody, ModalHeader, TextInput } from 'flowbite-react'
import { useRouter } from 'next/navigation'
import If from '@/app/lib/If'
import '@puckeditor/core/puck.css'
import { ContentLanguage, Role, User } from '@/generated/prisma/browser'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'
import type { PuckCommentThread } from '@/app/lib/puck/puck-comment-types'
import {
    createPuckCommentThread,
    deletePuckComponentCommentThreads,
    deletePuckCommentThread,
    replyToPuckCommentThread,
    setPuckCommentThreadResolved
} from '@/app/studio/pages/[id]/editor/comment-actions'
import { collectPuckComponentIds } from '@/app/lib/puck/puck-component-ids'

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

export default function PageEditor({ init, lockToken, user, host, initialCommentThreads }: {
    init: HydratedContentEntity,
    lockToken: string,
    user: User,
    host: string,
    initialCommentThreads: PuckCommentThread[]
}) {
    const [ showLockBroken, setShowLockBroken ] = useState(false)
    const [ showMetadata, setShowMetadata ] = useState(false)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ unpublishConfirm, setUnpublishConfirm ] = useState(false)
    const [ restoreConfirm, setRestoreConfirm ] = useState(false)
    const [ puckRevision, setPuckRevision ] = useState(0)
    const [ loadingAdditional, setLoadingAdditional ] = useState(false)
    const [ inEnglish, setInEnglish ] = useState(false)
    const [ commentThreads, setCommentThreads ] = useState(initialCommentThreads)
    const [ activeCommentComponentId, setActiveCommentComponentId ] = useState<string | null>(null)

    const router = useRouter()
    const canWrite = user.roles.includes(Role.writer)
    const canModerate = user.roles.includes(Role.editor)
    const canDeleteComments = user.roles.includes(Role.admin)
    const commentLanguage = inEnglish ? ContentLanguage.en : ContentLanguage.zh
    const languageCommentThreads = commentThreads.filter(thread => thread.language === commentLanguage)
    const commentThreadCounts = languageCommentThreads.reduce<Record<string, number>>((counts, thread) => {
        if (thread.componentId != null && thread.resolvedAt == null) {
            counts[thread.componentId] = (counts[thread.componentId] ?? 0) + 1
        }
        return counts
    }, {})
    const {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    // = Switch language
    function switchLanguage() {
        setActiveCommentComponentId(null)
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

    async function createComponentComment(componentId: string, body: string) {
        try {
            const thread = await createPuckCommentThread({
                entityId: draft.id,
                language: commentLanguage,
                componentId,
                body
            })
            setCommentThreads(current => [ ...current, thread ])
        } catch (error) {
            handlePermissionError(error)
            throw error
        }
    }

    async function replyToComponentComment(threadId: string, body: string) {
        try {
            const comment = await replyToPuckCommentThread({ threadId, body })
            setCommentThreads(current => current.map(thread => thread.id === threadId
                ? { ...thread, comments: [ ...thread.comments, comment ], updatedAt: comment.updatedAt }
                : thread))
        } catch (error) {
            handlePermissionError(error)
            throw error
        }
    }

    async function setComponentCommentResolved(threadId: string, resolved: boolean) {
        try {
            const updated = await setPuckCommentThreadResolved({ threadId, resolved })
            setCommentThreads(current => current.map(thread => thread.id === threadId ? updated : thread))
        } catch (error) {
            handlePermissionError(error)
            throw error
        }
    }

    async function deleteComponentComment(threadId: string) {
        try {
            await deletePuckCommentThread(threadId)
            setCommentThreads(current => current.filter(thread => thread.id !== threadId))
        } catch (error) {
            handlePermissionError(error)
            throw error
        }
    }

    function removeDeletedComponentComments(nextData: unknown, previousData: unknown) {
        const nextIds = collectPuckComponentIds(nextData)
        const deletedIds = [ ...collectPuckComponentIds(previousData) ].filter(id => !nextIds.has(id))
        if (deletedIds.length === 0) return

        setCommentThreads(current => current.filter(thread =>
            thread.language !== commentLanguage || thread.componentId == null || !deletedIds.includes(thread.componentId)
        ))
        if (activeCommentComponentId != null && deletedIds.includes(activeCommentComponentId)) {
            setActiveCommentComponentId(null)
        }
        void deletePuckComponentCommentThreads({
            entityId: draft.id,
            language: commentLanguage,
            componentIds: deletedIds
        }).catch(error => {
            if (!handlePermissionError(error)) console.error('Failed to delete component comments:', error)
        })
    }

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        <LockBrokenPrompt show={showLockBroken} returnUri="/studio/pages"/>

        <Modal show={showMetadata} size="xl" popup onClose={() => setShowMetadata(false)}>
            <ModalHeader className="px-6 pt-6 pb-4">页面信息</ModalHeader>
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

                    <div className="flex flex-wrap gap-2">
                        <If condition={canWrite}>
                            <Button pill size="sm" color="alternative" className="whitespace-nowrap"
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
                                        setPuckRevision(current => current + 1)
                                    }}>用中文内容覆盖英文</Button>
                        </If>
                        <If condition={canWrite && draft.titlePublishedEN != null && draft.titlePublishedZH != null &&
                            draft.contentPublishedEN != null && draft.contentPublishedZH != null}>
                            <Button disabled={loadingAdditional} pill size="sm" color="red" outline
                                    className="whitespace-nowrap" onClick={async () => {
                                if (!restoreConfirm) {
                                    setRestoreConfirm(true)
                                    return
                                }
                                setLoadingAdditional(true)
                                try {
                                    const restored = await restoreContentEntityDraftFromPublished(draft.id)
                                    setDraft(restored)
                                    setPuckRevision(current => current + 1)
                                    setRestoreConfirm(false)
                                    setShowMetadata(false)
                                    router.refresh()
                                } catch (error) {
                                    if (!handlePermissionError(error)) {
                                        console.error('Failed to restore published page:', error)
                                    }
                                } finally {
                                    setLoadingAdditional(false)
                                }
                            }}>{restoreConfirm ? '确认退回?' : '退回到线上版'}</Button>
                        </If>
                        <If condition={canModerate && (draft.contentPublishedEN != null || draft.contentPublishedZH != null)}>
                            <Button disabled={loadingAdditional} pill size="sm" color="red" outline
                                    className="whitespace-nowrap"
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
                            <Button disabled={loadingAdditional} pill size="sm" color="red" outline
                                    className="whitespace-nowrap"
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
                </div>
            </ModalBody>
        </Modal>

        <div className="page-editor">
            <PuckCommentHighlights componentIds={Object.keys(commentThreadCounts)}/>
            <Puck
                key={`${inEnglish ? 'en' : 'zh'}-${puckRevision}`} // Force re-render
                config={PUCK_CONFIG}
                data={JSON.parse(inEnglish ? draft.contentDraftEN : draft.contentDraftZH)} // Avoid empty string error
                fieldTransforms={STABLE_INLINE_TEXT_TRANSFORMS}
                onAction={(_action, appState, previousAppState) => {
                    removeDeletedComponentComments(appState.data, previousAppState.data)
                }}
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
                    actionBar: props => <PuckCommentActionBar
                        {...props}
                        activeComponentId={activeCommentComponentId}
                        threadCounts={commentThreadCounts}
                        onOpen={componentId => setActiveCommentComponentId(current =>
                            current === componentId ? null : componentId
                        )}
                    />,
                    fields: props => <PuckComments
                        {...props}
                        activeComponentId={activeCommentComponentId}
                        canComment={canWrite}
                        canDelete={canDeleteComments}
                        threads={languageCommentThreads.filter(thread => thread.componentId === activeCommentComponentId)}
                        onClose={() => setActiveCommentComponentId(null)}
                        onCreate={createComponentComment}
                        onDelete={deleteComponentComment}
                        onReply={replyToComponentComment}
                        onSetResolved={setComponentCommentResolved}
                    />,
                    headerActions: () => <>
                        <Button pill size="md" color="alternative"
                                onClick={switchLanguage}>切换到{inEnglish ? '中文' : '英文'}</Button>
                        <Button pill size="md" color="alternative"
                                onClick={() => setShowMetadata(true)}>页面信息</Button>
                        <Button pill size="md" color="alternative"
                                onClick={() => router.push(`/studio/pages/${draft.id}/preview`)}>预览</Button>
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

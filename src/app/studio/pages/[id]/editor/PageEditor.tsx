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
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Puck, type Data } from '@puckeditor/core'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import StableInlineText from '@/app/lib/puck/StableInlineText'
import {
    PuckCommentActionBarOverride,
    PuckCommentHighlights,
    PuckCommentsFieldsOverride,
    PuckCommentsProvider
} from '@/app/studio/pages/[id]/editor/PuckComments'
import { Button, Checkbox, HelperText, Label, Modal, ModalBody, ModalHeader, TextInput } from 'flowbite-react'
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
    getPuckCommentThreads,
    replyToPuckCommentThread,
    setPuckCommentThreadResolved
} from '@/app/studio/pages/[id]/editor/comment-actions'
import { collectPuckComponentIds } from '@/app/lib/puck/puck-component-ids'
import {
    collaborationStatusLabel,
    PuckCollaborationBridge,
    PuckCollaborativePreview,
    PuckCollaboratorsPortal,
    replacePuckCollaborationDocument,
    usePuckCollaboration
} from '@/app/lib/puck/PuckCollaboration'
import { parsePuckData } from '@/app/lib/puck/puck-data'

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

export default function PageEditor({ init, user, host, initialCommentThreads }: {
    init: HydratedContentEntity,
    user: User,
    host: string,
    initialCommentThreads: PuckCommentThread[]
}) {
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
        setInEnglish(current => !current)
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
        saveFn: async (draft, previous) => {
            return await updateContentEntity({
                id: draft.id,
                titleDraftEN: draft.titleDraftEN !== previous.titleDraftEN ? draft.titleDraftEN : undefined,
                titleDraftZH: draft.titleDraftZH !== previous.titleDraftZH ? draft.titleDraftZH : undefined,
                slug: draft.slug !== previous.slug ? draft.slug : undefined,
                contentDraftEN: draft.contentDraftEN !== previous.contentDraftEN ? draft.contentDraftEN : undefined,
                contentDraftZH: draft.contentDraftZH !== previous.contentDraftZH ? draft.contentDraftZH : undefined,
                shortContentDraftEN: undefined,
                shortContentDraftZH: undefined,
                categoryEN: undefined,
                categoryZH: undefined,
                coverImageDraftId: undefined,
                transparentNavbarDraft: draft.transparentNavbarDraft !== previous.transparentNavbarDraft
                    ? draft.transparentNavbarDraft : undefined,
                createdAt: undefined
            })
        },
        refreshFn: async () => (await getContentEntity(init.id))!,
        compareKeys: [
            'titleDraftEN',
            'titleDraftZH',
            'slug',
            'contentDraftEN',
            'contentDraftZH',
            'transparentNavbarDraft',
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
        if (!canWrite) return

        const interval = window.setInterval(() => {
            if (hasChanges && !loading) void guardedSave()
        }, AUTO_SAVE_INTERVAL_MS)

        return () => window.clearInterval(interval)
    }, [ canWrite, guardedSave, hasChanges, loading ])

    const publishStatus = draft.contentPublishedEN === draft.contentDraftEN && draft.contentPublishedZH === draft.contentDraftZH
        ? { label: '已发布', color: 'blue' }
        : draft.contentPublishedEN != null || draft.contentPublishedZH != null
            ? { label: '有更新未发布', color: 'warning' }
            : { label: '草稿', color: 'gray' }
    const pageUrl = `${host.replace(/\/+$/, '')}/${draft.slug.replace(/^\/+/, '')}`
    const puckDocumentKey = `${inEnglish ? 'en' : 'zh'}-${puckRevision}`
    const puckDataRef = useRef<{ data: ReturnType<typeof JSON.parse>, key: string } | null>(null)
    if (puckDataRef.current?.key !== puckDocumentKey) {
        puckDataRef.current = {
            data: parsePuckData(inEnglish ? draft.contentDraftEN : draft.contentDraftZH,
                inEnglish ? draft.titleDraftEN : draft.titleDraftZH),
            key: puckDocumentKey
        }
    }
    const applyRemotePuckData = useCallback((data: Data) => {
        setDraft(previous => inEnglish
            ? {
                ...previous,
                contentDraftEN: JSON.stringify(data),
                titleDraftEN: String(data.root.props?.title ?? '')
            }
            : {
                ...previous,
                contentDraftZH: JSON.stringify(data),
                titleDraftZH: String(data.root.props?.title ?? '')
            })
    }, [ inEnglish, setDraft ])
    const refreshCommentThreads = useCallback(async () => {
        try {
            setCommentThreads(await getPuckCommentThreads(draft.id))
        } catch (error) {
            console.error('Failed to refresh collaborative comments:', error)
        }
    }, [ draft.id ])
    const collaboration = usePuckCollaboration({
        enabled: canWrite,
        entityId: draft.id,
        initialData: puckDataRef.current.data as Data,
        language: inEnglish ? 'en' : 'zh',
        userId: String(user.id),
        userName: user.name,
        onCommentsChanged: refreshCommentThreads,
        onRemoteData: applyRemotePuckData
    })

    const puckOverrideStateRef = useRef<{
        inEnglish: boolean
        loading: boolean
        hasChanges: boolean
        collaboration: typeof collaboration
    } | null>(null)
    puckOverrideStateRef.current = {
        inEnglish,
        loading,
        hasChanges,
        collaboration
    }
    const puckOverridesRef = useRef<Record<string, (props?: any) => ReactNode> | null>(null)
    if (puckOverridesRef.current == null) {
        puckOverridesRef.current = {
            header: ({ children }: { children: ReactNode }) => {
                const state = puckOverrideStateRef.current!
                return <>
                    {children}
                    <PuckCollaboratorsPortal collaborators={state.collaboration.collaborators}/>
                    <span className="sr-only" role="status">
                        {collaborationStatusLabel(state.collaboration.status)}
                    </span>
                </>
            },
            preview: ({ children }: { children: ReactNode }) => {
                const state = puckOverrideStateRef.current!
                return <PuckCollaborativePreview cursors={state.collaboration.remoteCursors}
                                                 onCursorLeave={state.collaboration.clearCursor}
                                                 onCursorMove={state.collaboration.updateCursor}>
                    {children}
                </PuckCollaborativePreview>
            },
            actionBar: (props: any) => <PuckCommentActionBarOverride {...props}/>,
            fields: (props: any) => <PuckCommentsFieldsOverride {...props}/>,
            headerActions: () => {
                const state = puckOverrideStateRef.current!
                return <>
                    <Button pill size="md" color="alternative"
                            onClick={switchLanguage}>切换到{state.inEnglish ? '中文' : '英文'}</Button>
                    <Button pill size="md" color="alternative"
                            onClick={() => setShowMetadata(true)}>页面信息</Button>
                    <Button pill size="md" color="alternative"
                            onClick={() => router.push(`/studio/pages/${draft.id}/preview`)}>预览</Button>
                    <Button pill size="md" color="alternative"
                            onClick={() => router.push(`/studio/pages/${draft.id}/approval`)}>审核与发布</Button>
                    <If condition={canWrite}>
                        <Button pill size="md" color="blue" disabled={state.loading || !state.hasChanges}
                                onClick={guardedSave}>
                            {state.loading ? '保存中…' : state.hasChanges ? '保存更改' : '已保存'}
                        </Button>
                    </If>
                </>
            }
        }
    }

    async function createComponentComment(componentId: string, body: string) {
        try {
            const thread = await createPuckCommentThread({
                entityId: draft.id,
                language: commentLanguage,
                componentId,
                body
            })
            setCommentThreads(current => [ ...current, thread ])
            collaboration.signalCommentsChanged()
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
            collaboration.signalCommentsChanged()
        } catch (error) {
            handlePermissionError(error)
            throw error
        }
    }

    async function setComponentCommentResolved(threadId: string, resolved: boolean) {
        try {
            const updated = await setPuckCommentThreadResolved({ threadId, resolved })
            setCommentThreads(current => current.map(thread => thread.id === threadId ? updated : thread))
            collaboration.signalCommentsChanged()
        } catch (error) {
            handlePermissionError(error)
            throw error
        }
    }

    async function deleteComponentComment(threadId: string) {
        try {
            await deletePuckCommentThread(threadId)
            setCommentThreads(current => current.filter(thread => thread.id !== threadId))
            collaboration.signalCommentsChanged()
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
        }).then(() => collaboration.signalCommentsChanged())
            .catch(error => {
                if (!handlePermissionError(error)) console.error('Failed to delete component comments:', error)
            })
    }

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        <Modal show={canWrite && collaboration.status === 'offline'} size="md" dismissible={false}>
            <ModalHeader className="border-b-0">无法连接到编辑器</ModalHeader>
            <ModalBody>
                <p className="text-sm text-gray-600">
                    网络连接恢复后，编辑器将自动重新连接。
                </p>
            </ModalBody>
        </Modal>
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

                        <div className="sm:col-span-2">
                            <div className="flex items-center gap-2">
                                <Checkbox id="transparent-navbar" checked={draft.transparentNavbarDraft}
                                          disabled={!canWrite}
                                          aria-describedby="transparent-navbar-description"
                                          onChange={event => {
                                              const checked = event.currentTarget.checked
                                              setDraft(current => ({
                                                  ...current,
                                                  transparentNavbarDraft: checked
                                              }))
                                          }}/>
                                <Label htmlFor="transparent-navbar">透明导航栏</Label>
                            </div>
                            <p id="transparent-navbar-description" className="mt-1 pl-6 text-sm text-gray-500">
                                开启后，打开这个页面时，导航栏顶部透明，向下滚动后变为白色。
                            </p>
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
                                    disabled={loadingAdditional}
                                    onClick={async () => {
                                        if (!canWrite) {
                                            showPermissionDenied()
                                            return
                                        }
                                        setLoadingAdditional(true)
                                        try {
                                            const content = draft.contentDraftZH
                                            await replacePuckCollaborationDocument({
                                                data: parsePuckData(content, draft.titleDraftZH),
                                                entityId: draft.id,
                                                language: 'en'
                                            })
                                            setDraft(prev => ({
                                                ...prev,
                                                contentDraftEN: content,
                                                titleDraftEN: prev.titleDraftZH
                                            }))
                                            setPuckRevision(current => current + 1)
                                        } finally {
                                            setLoadingAdditional(false)
                                        }
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
                                    await Promise.all([
                                        replacePuckCollaborationDocument({
                                            data: parsePuckData(restored.contentDraftEN, restored.titleDraftEN),
                                            entityId: draft.id,
                                            language: 'en'
                                        }),
                                        replacePuckCollaborationDocument({
                                            data: parsePuckData(restored.contentDraftZH, restored.titleDraftZH),
                                            entityId: draft.id,
                                            language: 'zh'
                                        })
                                    ])
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
                key={puckDocumentKey} // Force re-render only for intentional document changes
                config={PUCK_CONFIG}
                data={puckDataRef.current.data}
                fieldTransforms={STABLE_INLINE_TEXT_TRANSFORMS}
                onAction={(_action, appState, previousAppState) => {
                    removeDeletedComponentComments(appState.data, previousAppState.data)
                    collaboration.updateFromPuck(appState.data)
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
                overrides={puckOverridesRef.current}
            >
                <PuckCommentsProvider value={{
                    activeComponentId: activeCommentComponentId,
                    canComment: canWrite,
                    canDelete: canDeleteComments,
                    threadCounts: commentThreadCounts,
                    threads: languageCommentThreads.filter(thread => thread.componentId === activeCommentComponentId),
                    onOpen: componentId => setActiveCommentComponentId(current =>
                        current === componentId ? null : componentId
                    ),
                    onClose: () => setActiveCommentComponentId(null),
                    onCreate: createComponentComment,
                    onDelete: deleteComponentComment,
                    onReply: replyToComponentComment,
                    onSetResolved: setComponentCommentResolved
                }}>
                    <PuckCollaborationBridge register={collaboration.registerPuck}/>
                    <Puck.Layout/>
                </PuckCommentsProvider>
            </Puck>
        </div>
    </>
}

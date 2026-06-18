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
import { useState } from 'react'
import { useEntityLock } from '@/app/lib/lock/useEntityLock'
import LockBrokenPrompt from '@/app/lib/lock/LockBrokenPrompt'
import { Puck } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { Button, HelperText, Label, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from 'flowbite-react'
import { useRouter } from 'next/navigation'
import If from '@/app/lib/If'
import '@measured/puck/puck.css'
import { Role, User } from '@/generated/prisma/browser'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'

export default function PageEditor({ init, lockToken, user }: {
    init: HydratedContentEntity,
    lockToken: string,
    user: User
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

    async function guardedSave() {
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
    }

    useSaveShortcut(true, guardedSave)

    // = Locking
    useEntityLock({
        entityType: init.type,
        entityId: draft.id,
        token: lockToken,
        hasChanges,
        onLockLost: () => setShowLockBroken(true)
    })

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        <LockBrokenPrompt show={showLockBroken} returnUri="/studio/pages"/>

        <Modal show={showMetadata} size="md" popup onClose={() => setShowMetadata(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">页面信息</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="title-zh">标题</Label>
                        </div>
                        <TextInput id="title-zh" value={`${draft.titleDraftZH} / ${draft.titleDraftEN}`} disabled/>
                        <HelperText>
                            请通过编辑器更改标题。
                        </HelperText>
                    </div>
                    <div>
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
                    </div>
                    <div>
                        <Label>状态</Label>
                        <p className="text-xl">
                            <If condition={draft.contentPublishedEN === draft.contentDraftEN && draft.contentPublishedZH === draft.contentDraftZH}>
                                已发布
                            </If>

                            <If condition={draft.contentPublishedEN == null && draft.contentPublishedZH == null}>
                                草稿
                            </If>

                            <If condition={(draft.contentPublishedEN !== draft.contentDraftEN || draft.contentPublishedZH !== draft.contentDraftZH) &&
                                draft.contentPublishedEN != null && draft.contentPublishedZH != null}>
                                有更新未发布
                            </If>
                        </p>
                    </div>
                    <div>
                        <Label>创建用户</Label>
                        <p className="text-xl">{draft.creator.name}</p>
                    </div>
                    <div>
                        <Label>创建时间</Label>
                        <p className="text-xl">{draft.createdAt.toLocaleString()}</p>
                    </div>
                    <div>
                        <Label>最新更改时间</Label>
                        <p className="text-xl">{draft.updatedAt.toLocaleString()}</p>
                    </div>

                    <p className="text-sm">关闭后，请务必保存。</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <If condition={canWrite}>
                    <Button pill color="alternative"
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

                <If condition={canModerate && (draft.contentPublishedEN != null || draft.contentPublishedZH != null)}>
                    <Button disabled={loadingAdditional} pill color="red" onClick={async () => {
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
                    <Button disabled={loadingAdditional} pill color="red" onClick={async () => {
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
            </ModalFooter>
        </Modal>

        <Puck
            key={inEnglish ? 'en' : 'zh'} // Force re-render
            config={PUCK_CONFIG}
            data={JSON.parse(inEnglish ? draft.contentDraftEN : draft.contentDraftZH)} // Avoid empty string error
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
                    <Button pill color="alternative"
                            onClick={switchLanguage}>切换到{inEnglish ? '中文' : '英文'}</Button>
                    <Button pill color="alternative" onClick={() => setShowMetadata(true)}>页面信息</Button>
                    <Button pill color="alternative"
                            onClick={() => router.push(`/studio/pages/${draft.id}/approval`)}>审核与发布</Button>
                    <If condition={canWrite}>
                        <Button pill color="blue" disabled={loading} onClick={guardedSave}>保存更改</Button>
                    </If>
                </>
            }}
        />
    </>
}

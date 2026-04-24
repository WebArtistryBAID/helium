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
import { useEffect, useRef, useState } from 'react'
import { useEntityLock } from '@/app/lib/lock/useEntityLock'
import LockBrokenPrompt from '@/app/lib/lock/LockBrokenPrompt'
import { Data, Puck } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { Button, HelperText, Label, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from 'flowbite-react'
import { useRouter } from 'next/navigation'
import If from '@/app/lib/If'
import '@measured/puck/puck.css'
import './editor-theme.css'
import { Role } from '@/generated/prisma/enums'

type PuckDraftData = Data

function createEmptyPuckData(): PuckDraftData {
    return {
        content: [],
        root: { props: {} },
        zones: {}
    }
}

function parsePuckData(raw: string): PuckDraftData {
    try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
            return parsed as PuckDraftData
        }
    } catch {
    }

    return createEmptyPuckData()
}

export default function PageEditor({ init, userId, lockToken }: {
    init: HydratedContentEntity,
    userId: number,
    lockToken: string
}) {
    const [ showLockBroken, setShowLockBroken ] = useState(false)
    const [ showMetadata, setShowMetadata ] = useState(false)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ unpublishConfirm, setUnpublishConfirm ] = useState(false)
    const [ loadingAdditional, setLoadingAdditional ] = useState(false)
    const [ inEnglish, setInEnglish ] = useState(false)

    const router = useRouter()

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
    useSaveShortcut(true, save)

    const contentDraftENRef = useRef(draft.contentDraftEN)
    const contentDraftZHRef = useRef(draft.contentDraftZH)
    const [ contentDraftENData, setContentDraftENData ] = useState<PuckDraftData>(() => parsePuckData(init.contentDraftEN))
    const [ contentDraftZHData, setContentDraftZHData ] = useState<PuckDraftData>(() => parsePuckData(init.contentDraftZH))

    useEffect(() => {
        if (draft.contentDraftEN === contentDraftENRef.current) return
        contentDraftENRef.current = draft.contentDraftEN
        setContentDraftENData(parsePuckData(draft.contentDraftEN))
    }, [ draft.contentDraftEN ])

    useEffect(() => {
        if (draft.contentDraftZH === contentDraftZHRef.current) return
        contentDraftZHRef.current = draft.contentDraftZH
        setContentDraftZHData(parsePuckData(draft.contentDraftZH))
    }, [ draft.contentDraftZH ])

    // = Locking
    useEntityLock({
        entityType: init.type,
        entityId: draft.id,
        userId,
        initialToken: lockToken,
        hasChanges,
        onLockLost: () => setShowLockBroken(true)
    })

    return <>
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
                                   onChange={e => {
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
                <Button pill color="alternative"
                        onClick={() => {
                            setDraft(prev => ({
                                ...prev,
                                contentDraftEN: prev.contentDraftZH,
                                titleDraftEN: prev.titleDraftZH
                            }))
                        }}>用中文内容覆盖英文</Button>

                <If condition={draft.contentPublishedEN != null || draft.contentPublishedZH != null}>
                    <Button disabled={loadingAdditional} pill color="red" onClick={async () => {
                        if (!unpublishConfirm) {
                            setUnpublishConfirm(true)
                            return
                        }
                        setLoadingAdditional(true)
                        await unpublishContentEntity(draft.id)
                        setLoadingAdditional(false)
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
                    }}>
                        {unpublishConfirm ? '确认撤回?' : '撤回发布'}
                    </Button>
                </If>
                <Button disabled={loadingAdditional} pill color="red" onClick={async () => {
                    if (!deleteConfirm) {
                        setDeleteConfirm(true)
                        return
                    }
                    setLoadingAdditional(true)
                    await deleteContentEntity(draft.id)
                    setLoadingAdditional(false)
                    router.push('/studio/pages')
                }}>{deleteConfirm ? '确认删除?' : '删除页面'}</Button>
            </ModalFooter>
        </Modal>

        <Puck
            key={inEnglish ? 'en' : 'zh'}
            config={PUCK_CONFIG}
            data={inEnglish ? contentDraftENData : contentDraftZHData}
            onChange={data => {
                const nextContent = JSON.stringify(data)
                if (inEnglish) {
                    contentDraftENRef.current = nextContent
                    setContentDraftENData(data as PuckDraftData)
                    setDraft(prev => ({
                        ...prev,
                        contentDraftEN: nextContent,
                        titleDraftEN: data.root.props?.title ?? ''
                    }))
                } else {
                    contentDraftZHRef.current = nextContent
                    setContentDraftZHData(data as PuckDraftData)
                    setDraft(prev => ({
                        ...prev,
                        contentDraftZH: nextContent,
                        titleDraftZH: data.root.props?.title ?? ''
                    }))
                }
            }}
            overrides={{
                headerActions: () => <div className="puck-editor-actions flex min-w-max items-center justify-end gap-2 whitespace-nowrap">
                    <Button
                        pill
                        color="alternative"
                        className="shrink-0 whitespace-nowrap"
                        onClick={switchLanguage}
                    >
                        切换到{inEnglish ? '中文' : '英文'}
                    </Button>
                    <Button
                        pill
                        color="alternative"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setShowMetadata(true)}
                    >
                        页面信息
                    </Button>
                    <Button
                        pill
                        color="alternative"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => router.push(`/studio/pages/${draft.id}/approval`)}
                    >
                        审核与发布
                    </Button>
                    <Button
                        pill
                        className="shrink-0 whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
                        disabled={loading}
                        onClick={save}
                    >
                        保存更改
                    </Button>
                </div>
            }}
        />
    </>
}

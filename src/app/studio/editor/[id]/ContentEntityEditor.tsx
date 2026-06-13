'use client'

import If from '@/app/lib/If'
import {
    Button,
    Datepicker,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    TabItem,
    Tabs,
    TabsRef,
    TextInput
} from 'flowbite-react'
import { HiNewspaper, HiPencil } from 'react-icons/hi2'
import { HiCloudUpload, HiSearch } from 'react-icons/hi'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SimpleMarkdownEditor from '@/app/studio/editor/SimpleMarkdownEditor'
import Markdown from 'react-markdown'
import ApprovalProcess from '@/app/lib/approval/ApprovalProcess'
import { useEntityLock } from '@/app/lib/lock/useEntityLock'
import { useImagePlaceholders } from '@/app/studio/media/useImagePlaceholders'
import MediaPicker from '@/app/studio/media/MediaPicker'
import LockBrokenPrompt from '@/app/lib/lock/LockBrokenPrompt'
import { useSavableEntity } from '@/app/lib/save/useSavableEntity'
import { useSaveShortcut } from '@/app/lib/save/useSaveShortcuts'
import { HydratedContentEntity } from '@/app/lib/data-types'
import {
    alignContentEntity,
    deleteContentEntity,
    getContentEntity,
    unpublishContentEntity,
    updateContentEntity
} from '@/app/studio/editor/entity-actions'
import { Role, User } from '@/generated/prisma/browser'

export default function ContentEntityEditor({ init, user, lockToken, uploadPrefix }: {
    init: HydratedContentEntity,
    user: User,
    lockToken: string,
    uploadPrefix: string
}) {
    const [ loadingAdditional, setLoadingAdditional ] = useState(false)
    const [ showLockBroken, setShowLockBroken ] = useState(false)
    const [ showMediaLibrary, setShowMediaLibrary ] = useState(false)
    const [ showTitleForm, setShowTitleForm ] = useState(false)
    const [ showShortContentForm, setShowShortContentForm ] = useState(false)
    const [ showSlugForm, setShowSlugForm ] = useState(false)
    const [ showDateForm, setShowDateForm ] = useState(false)
    const [ showCategoryForm, setShowCategoryForm ] = useState(false)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ unpublishConfirm, setUnpublishConfirm ] = useState(false)
    const [ markdownContent, setMarkdownContent ] = useState(init.contentDraftZH)
    const [ inEnglish, setInEnglish ] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [ _, setActiveTab ] = useState(0)
    const tabsRef = useRef<TabsRef>(null)
    const router = useRouter()

    const { previewContent } = useImagePlaceholders({
        markdown: markdownContent,
        uploadPrefix
    })

    useEffect(() => {
        if (location.hash === '#approval') {
            setActiveTab(2)
        } else if (location.hash === '#preview') {
            setActiveTab(1)
        }
    }, [])

    // = Switch language
    function switchLanguage() {
        if (inEnglish) {
            setMarkdownContent(post.contentDraftZH)
            setInEnglish(false)
        } else {
            setMarkdownContent(post.contentDraftEN)
            setInEnglish(true)
        }
    }

    // = Save
    const {
        draft: post,
        setDraft: setPost,
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
            categoryEN: draft.categoryEN,
            categoryZH: draft.categoryZH,
            slug: draft.slug,
            contentDraftEN: draft.contentDraftEN,
            contentDraftZH: draft.contentDraftZH,
            shortContentDraftEN: draft.shortContentDraftEN,
            shortContentDraftZH: draft.shortContentDraftZH,
            coverImageDraftId: draft.coverImageDraft?.id,
            createdAt: draft.createdAt
        }),
        refreshFn: async () => (await getContentEntity(init.id))!,
        compareKeys: [
            'titleDraftEN',
            'titleDraftZH',
            'categoryEN',
            'categoryZH',
            'slug',
            'coverImageDraft.id',
            'contentDraftEN',
            'contentDraftZH',
            'shortContentDraftEN',
            'shortContentDraftZH',
            'createdAt'
        ]
    })
    useSaveShortcut(true, save)

    // = Locking
    useEntityLock({
        entityType: init.type,
        entityId: post.id,
        token: lockToken,
        hasChanges,
        onLockLost: () => setShowLockBroken(true)
    })

    return <>
        <Modal show={showTitleForm} size="md" popup onClose={() => setShowTitleForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改标题</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="title-zh">标题 (中文)</Label>
                        </div>
                        <TextInput id="title-zh" value={post.titleDraftZH} placeholder="世界因我更美好"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           titleDraftZH: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="title-en">标题 (英文)</Label>
                        </div>
                        <TextInput id="title-en" value={post.titleDraftEN} placeholder="Better Me, Better World"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           titleDraftEN: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <p className="text-sm">英文标题请使用正确大小写，如 Old Meets New: BAID Beijing Cultural
                        Exploration</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={() => setShowTitleForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showShortContentForm} size="md" popup onClose={() => setShowShortContentForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改短内容</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="sc-zh">短内容 (中文)</Label>
                        </div>
                        <TextInput id="sc-zh" value={post.shortContentDraftZH ?? ''}
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           shortContentDraftZH: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="sc-en">短内容 (英文)</Label>
                        </div>
                        <TextInput id="sc-en" value={post.shortContentDraftEN ?? ''}
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           shortContentDraftEN: value
                                       }))
                                   }}
                                   required/>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading}
                        onClick={() => setShowShortContentForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showCategoryForm} size="md" popup onClose={() => setShowCategoryForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改类别</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="category-zh">类别 (中文)</Label>
                        </div>
                        <TextInput id="category-zh" value={post.categoryZH ?? ''} placeholder="世界因我更美好"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           categoryZH: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="category-en">类别 (英文)</Label>
                        </div>
                        <TextInput id="category-en" value={post.categoryEN ?? ''} placeholder="Better Me, Better World"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           categoryEN: value
                                       }))
                                   }}
                                   required/>
                    </div>
                    <p className="text-sm">英文类别请使用正确大小写，如 AP Courses</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={() => setShowCategoryForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showSlugForm} size="md" popup onClose={() => setShowSlugForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改链接位置</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="slug">链接位置</Label>
                        </div>
                        <TextInput id="slug" value={post.slug} placeholder="better-me-better-world"
                                   onChange={e => {
                                       const value = e.currentTarget.value
                                       setPost(prev => ({
                                           ...prev,
                                           slug: value
                                       }))
                                   }}
                                   required/>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={() => setShowSlugForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <Modal show={showDateForm} size="md" popup onClose={() => setShowDateForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">更改显示日期</h3>
                    <div>
                        <Datepicker inline weekStart={1}
                                    value={typeof post.createdAt === 'string' ? new Date(post.createdAt) : post.createdAt}
                                    lang="zh-CN"
                                    onChange={d => {
                                        const date = d ?? new Date()
                                        setPost(prev => ({
                                            ...prev,
                                            createdAt: date
                                        }))
                                    }}/>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={() => setShowDateForm(false)}>确认</Button>
            </ModalFooter>
        </Modal>

        <LockBrokenPrompt show={showLockBroken} returnUri="/studio"/>
        <MediaPicker open={showMediaLibrary} onClose={() => setShowMediaLibrary(false)} allowUnpick={false}
                     onPick={image => {
                         setPost(prev => ({
                             ...prev,
                             coverImageDraft: image!,
                             coverImageDraftId: image!.id
                         }))
            setShowMediaLibrary(false)
        }}/>

        <Tabs aria-label="文章编辑器选项卡" variant="default" ref={tabsRef}
              onActiveTabChange={(tab) => setActiveTab(tab)}>
            <TabItem active title="内容" icon={HiNewspaper}>
                <div className="w-full flex gap-8">
                    <div className="w-2/3 2xl:w-3/4">
                        <SimpleMarkdownEditor value={markdownContent} onChange={(content: string) => {
                            setMarkdownContent(content)
                            if (inEnglish) {
                                setPost(prev => ({
                                    ...prev,
                                    contentDraftEN: content
                                }))
                            } else {
                                setPost(prev => ({
                                    ...prev,
                                    contentDraftZH: content
                                }))
                            }
                        }}/>
                    </div>
                    <div className="w-1/3 2xl:w-1/4">
                        <div className="flex mb-3 gap-3">
                            <Button pill color="blue"
                                    disabled={loading || !user.roles.includes(Role.writer)}
                                    onClick={save}>保存更改</Button>
                            <Button pill color="alternative" onClick={switchLanguage}>
                                <If condition={inEnglish}>
                                    切换到中文
                                </If>
                                <If condition={!inEnglish}>
                                    切换到英文
                                </If>
                            </Button>
                        </div>

                        <p className="font-bold text-xl flex items-center gap-3">
                            {post.titleDraftZH}
                            <button className="p-2 !h-8 !w-8 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="编辑标题"
                                    onClick={() => setShowTitleForm(true)}>
                                <HiPencil className="text-white text-xs"/>
                            </button>
                        </p>
                        <p className="text-sm secondary mb-3">{post.titleDraftEN}</p>

                        <p className="font-bold secondary text-sm">链接位置</p>
                        <p className="mb-3 flex items-center gap-3">
                            {post.slug}
                            <button className="p-1 !h-6 !w-6 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="编辑链接位置"
                                    onClick={() => setShowSlugForm(true)}>
                                <HiPencil className="text-white text-xs"/>
                            </button>
                        </p>

                        <p className="font-bold secondary text-sm">类别</p>
                        <p className="mb-3 flex items-center gap-3">
                            {post.categoryZH} / {post.categoryEN}
                            <button className="p-1 !h-6 !w-6 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="编辑类别"
                                    onClick={() => setShowCategoryForm(true)}>
                                <HiPencil className="text-white text-xs"/>
                            </button>
                        </p>

                        <p className="font-bold secondary text-sm">短内容</p>
                        <div className="mb-3 flex items-center gap-3">
                            <button className="p-1 !h-6 !w-6 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="编辑短内容"
                                    onClick={() => setShowShortContentForm(true)}>
                                <HiPencil className="text-white text-xs"/>
                            </button>
                        </div>

                        <p className="font-bold secondary text-sm">状态</p>
                        <p className="mb-3">
                            <If condition={post.contentPublishedEN === post.contentDraftEN && post.contentPublishedZH === post.contentDraftZH}>
                                已发布
                            </If>

                            <If condition={post.contentPublishedEN == null && post.contentPublishedZH == null}>
                                草稿
                            </If>

                            <If condition={(post.contentPublishedEN !== post.contentDraftEN || post.contentPublishedZH !== post.contentDraftZH) &&
                                post.contentPublishedEN != null && post.contentPublishedZH != null}>
                                有更新未发布
                            </If>
                        </p>

                        <p className="font-bold secondary text-sm">显示日期</p>
                        <p className="mb-3 flex items-center gap-3">
                            {(typeof post.createdAt === 'string' ? new Date(post.createdAt) : post.createdAt).toDateString()}
                            <button className="p-1 !h-6 !w-6 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="编辑显示日期"
                                    onClick={() => setShowDateForm(true)}>
                                <HiPencil className="text-white text-xs"/>
                            </button>
                        </p>

                        <p className="font-bold secondary text-sm">最新更改时间</p>
                        <p className="mb-3">{post.updatedAt.toLocaleString()}</p>

                        <p className="font-bold secondary text-sm">封面</p>
                        <If condition={post.coverImageDraft != null}>
                            <button onClick={() => setShowMediaLibrary(true)} className="cursor-pointer">
                                <img className="mt-1 mb-3 h-24" alt={post.coverImageDraft?.altText}
                                     src={`${uploadPrefix}/${post.coverImageDraft?.sha1}_thumb.webp`}/>
                            </button>
                        </If>
                        <If condition={post.coverImageDraft == null}>
                            <Button pill color="blue" className="mt-1 mb-3"
                                    onClick={() => setShowMediaLibrary(true)}>设置封面</Button>
                        </If>

                        <p className="font-bold secondary text-sm">创建用户</p>
                        <p className="mb-3">{post.creator.name}</p>

                        <div className="flex gap-3">
                            <If condition={post.contentPublishedEN != null || post.contentPublishedZH != null}>
                                <Button disabled={loadingAdditional || !user.roles.includes(Role.editor)} pill
                                        color="red" onClick={async () => {
                                    if (!unpublishConfirm) {
                                        setUnpublishConfirm(true)
                                        return
                                    }
                                    setLoadingAdditional(true)
                                    await unpublishContentEntity(post.id)
                                    setLoadingAdditional(false)
                                    await refresh()
                                    router.refresh()
                                }}>
                                    {unpublishConfirm ? '确认撤回?' : '撤回发布'}
                                </Button>
                            </If>
                            <Button disabled={loadingAdditional || !user.roles.includes(Role.editor)} pill color="red"
                                    onClick={async () => {
                                if (!deleteConfirm) {
                                    setDeleteConfirm(true)
                                    return
                                }
                                setLoadingAdditional(true)
                                await deleteContentEntity(post.id)
                                setLoadingAdditional(false)
                                router.push('/studio')
                            }}>{deleteConfirm ? '确认删除?' : '删除'}</Button>
                        </div>
                    </div>
                </div>
            </TabItem>
            <TabItem title="预览" icon={HiSearch}>
                <Button pill color="alternative" className="mb-5" onClick={switchLanguage}>
                    <If condition={inEnglish}>
                        切换到中文
                    </If>
                    <If condition={!inEnglish}>
                        切换到英文
                    </If>
                </Button>
                <If condition={post.coverImageDraft != null}>
                    <img className="mb-5 w-full h-64 object-cover" alt={post.coverImageDraft?.altText}
                         src={`${uploadPrefix}/${post.coverImageDraft?.sha1}.webp`}/>
                </If>
                <article>
                    <h1>{inEnglish ? post.titleDraftEN : post.titleDraftZH}</h1>
                    <Markdown>{previewContent}</Markdown>
                </article>
            </TabItem>
            <TabItem title="审核与发布" icon={HiCloudUpload}>
                <ApprovalProcess entityType={init.type} entityId={post.id} entity={post} doAlign={async () => {
                    await alignContentEntity(post.id)
                    await refresh()
                }}/>
            </TabItem>
        </Tabs>
    </>
}

'use client'

import {
    Button,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Pagination,
    TabItem,
    Tabs,
    TabsRef,
    TextInput
} from 'flowbite-react'
import { HiArrowUpTray, HiPhoto } from 'react-icons/hi2'
import { useCallback, useEffect, useRef, useState, memo } from 'react'
import { Image, Role, User } from '@/generated/prisma/browser'
import { createImage, deleteImage, getImages, getUploadServePath } from '@/app/studio/media/media-actions'
import If from '@/app/lib/If'
import UploadAreaClient from '@/app/studio/media/upload/UploadAreaClient'
import { Paginated } from '@/app/lib/data-types'
import { getMyUser } from '@/app/login/login-actions'

function formatSize(kb: number): string {
    if (kb < 1024) {
        return `${kb} KB`
    } else {
        return `${(kb / 1024).toFixed(2)} MB`
    }
}

const ImageItem = memo(({ image, isSelected, uploadServePath, onClick }: {
    image: Image
    isSelected: boolean
    uploadServePath: string
    onClick: (image: Image) => void
}) => (
    <button key={image.sha1} className={`w-full h-full rounded ${isSelected ? 'ring-4 ring-blue-500' : ''}`}
            onClick={() => onClick(image)}>
        <img className="w-full aspect-square object-cover"
             alt={`图片: ${image.name}`}
             src={`${uploadServePath}/${image.sha1}_thumb.webp`}
             loading="lazy"
             decoding="async"/>
    </button>
))

export default function MediaLibrary({ init, pickMode, allowUnpick, onPick }: {
    init: Paginated<Image>,
    pickMode?: boolean,
    allowUnpick?: boolean,
    onPick?: (image: Image | null) => void
}) {
    const [ user, setUser ] = useState<User>()
    const [ page, setPage ] = useState<Paginated<Image>>(init)
    const [ loading, setLoading ] = useState(false)
    const [ selectedImage, setSelectedImage ] = useState<Image | null>(null)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ uploadServePath, setUploadServePath ] = useState<string>('')
    const [ showUploadForm, setShowUploadForm ] = useState(false)
    const [ imageName, setImageName ] = useState('')
    const [ imageAlt, setImageAlt ] = useState('')
    const [ imageHash, setImageHash ] = useState('')
    const [ currentPage, setCurrentPage ] = useState(0)

    const tabsRef = useRef<TabsRef>(null)

    const handleImageClick = useCallback((image: Image) => {
        setDeleteConfirm(false)
        setSelectedImage(prev => prev?.id === image.id ? null : image)
    }, [])

    useEffect(() => {
        (async () => {
            setUser((await getMyUser())!)
            setUploadServePath(await getUploadServePath())
        })()
    }, [])

    useEffect(() => {
        setPage(init)
        setCurrentPage(init.page)
    }, [ init ])

    useEffect(() => {
        if (currentPage === page.page) return

        let cancelled = false
        const loadPage = async () => {
            const nextPage = await getImages(currentPage)
            if (!cancelled) {
                setPage(nextPage)
            }
        }
        void loadPage()
        return () => {
            cancelled = true
        }
    }, [ currentPage, page.page ])

    const canRenderImages = uploadServePath !== ''

    return <>
        <Modal show={showUploadForm} size="md" popup onClose={() => setShowUploadForm(false)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">设置图片信息</h3>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="name">名称</Label>
                        </div>
                        <TextInput id="name" value={imageName}
                                   onChange={e => setImageName(e.currentTarget.value)}
                                   required/>
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="alt">解释文字</Label>
                        </div>
                        <TextInput id="alt" value={imageAlt} placeholder="简单说明图片内容，由屏幕阅读器读出..."
                                   onChange={e => setImageAlt(e.currentTarget.value)}
                                   required/>
                    </div>

                    <If condition={canRenderImages && imageHash !== ''}>
                        <img width={500} height={200} src={uploadServePath + '/' + imageHash + '.webp'} alt="已上传文件"
                             className="rounded-xl w-full lg:max-w-sm object-cover mb-3"/>
                    </If>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={loading} onClick={async () => {
                    if (!imageName || !imageAlt) return
                    setLoading(true)
                    const createdImage = await createImage({
                        name: imageName,
                        altText: imageAlt,
                        sha1: imageHash
                    })
                    setSelectedImage(createdImage)
                    setLoading(false)
                    setCurrentPage(0)
                    setPage(await getImages(0))
                    setShowUploadForm(false)
                    tabsRef.current?.setActiveTab(0)
                }}>确认</Button>
                <Button pill color="alternative" disabled={loading} onClick={() => setShowUploadForm(false)}>
                    取消
                </Button>
            </ModalFooter>
        </Modal>

        <div className="p-8">
            <Tabs aria-label="媒体库选项卡" variant="default" ref={tabsRef}>
                <TabItem active title="图片" icon={HiPhoto}>
                    <If condition={page.pages < 1}>
                        <div className="flex flex-col justify-center items-center">
                            <img src="/assets/reading-light.png" alt="" className="h-48 mb-3"/>
                            <p className="mb-3">暂时没有图片</p>
                            <If condition={user?.roles.includes(Role.writer)}>
                                <Button pill color="blue" onClick={() => tabsRef.current?.setActiveTab(1)}>上传</Button>
                            </If>
                            <If condition={allowUnpick}>
                                <Button pill disabled={loading} color="alternative" className="mt-3" onClick={() => {
                                    if (onPick != null) {
                                        onPick(null)
                                    }
                                }}>取消选取</Button>
                            </If>
                        </div>
                    </If>
                    <If condition={page.pages > 0}>
                        <div className="flex gap-4">
                            <div className="w-2/3">
                                <div className="grid grid-cols-6 gap-4 mb-3">
                                    {page.items.map(image =>
                                        <If key={image.sha1} condition={canRenderImages}>
                                            <ImageItem
                                                image={image}
                                                isSelected={selectedImage?.id === image.id}
                                                uploadServePath={uploadServePath}
                                                onClick={handleImageClick}
                                            />
                                        </If>
                                    )}
                                </div>
                                <Pagination currentPage={currentPage + 1} onPageChange={p => setCurrentPage(p - 1)}
                                            totalPages={page.pages}/>
                                <If condition={allowUnpick}>
                                    <Button pill disabled={loading} color="alternative" className="mt-3"
                                            onClick={() => {
                                                if (onPick != null) {
                                                    onPick(null)
                                                }
                                            }}>取消选取</Button>
                                </If>
                            </div>

                            <div className="w-1/3">
                                <If condition={selectedImage != null}>
                                    <div>
                                        <p className="font-bold mb-3 text-xl secondary">图片详情</p>
                                        <div className="flex gap-3 mb-3 items-center">
                                            <If condition={canRenderImages}>
                                                <a target="_blank" href={`${uploadServePath}/${selectedImage?.sha1}.webp`}>
                                                    <img className="h-24" alt={`图片: ${selectedImage?.name}`}
                                                         src={`${uploadServePath}/${selectedImage?.sha1}_thumb.webp`}/>
                                                </a>
                                            </If>
                                            <div>
                                                <p className="font-bold">{selectedImage?.name}</p>
                                                <p className="secondary">{selectedImage?.width} × {selectedImage?.height}</p>
                                                <p className="secondary">{formatSize(selectedImage?.sizeKB ?? 0)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="font-bold secondary text-sm">解释性文字</p>
                                    <p className="mb-3">{selectedImage?.altText}</p>

                                    <If condition={pickMode}>
                                        <div className="flex gap-3 mb-3">
                                            <Button pill disabled={loading} color="blue" onClick={() => {
                                                if (onPick != null) {
                                                    onPick(selectedImage!)
                                                }
                                            }}>选取</Button>
                                        </div>
                                    </If>
                                    <Button pill disabled={loading || !user?.roles.includes(Role.writer)} color="red"
                                            onClick={async () => {
                                                if (deleteConfirm && selectedImage != null) {
                                                    setLoading(true)
                                                    await deleteImage(selectedImage.id)
                                                    setLoading(false)
                                                    setSelectedImage(null)
                                                    setPage(await getImages(currentPage))
                                                } else {
                                                    setDeleteConfirm(true)
                                                }
                                            }}>{deleteConfirm ? '确认删除?' : '删除图片'}</Button>
                                </If>
                            </div>
                        </div>
                    </If>
                </TabItem>
                <TabItem title="上传" icon={HiArrowUpTray}>
                    <div className="flex flex-col justify-center items-center">
                        <div className="mb-3">
                            <UploadAreaClient uploadPrefix={uploadServePath} onDone={hash => {
                                setImageHash(hash)
                                setImageName('')
                                setImageAlt('')
                                setShowUploadForm(true)
                            }}/>
                        </div>

                        <p>上传超过 1 MB 的图片会严重降低访问速度。</p>
                    </div>
                </TabItem>
            </Tabs>
        </div>
    </>
}

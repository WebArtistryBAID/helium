'use client'

import {
    Button,
    Pagination,
    TabItem,
    Tabs,
    TabsRef
} from 'flowbite-react'
import { HiArrowUpTray, HiPhoto } from 'react-icons/hi2'
import { useEffect, useRef, useState } from 'react'
import { Image, Role, User } from '@/generated/prisma/browser'
import { deleteImage, getImages } from '@/app/studio/media/media-actions'
import type { ImagePage } from '@/app/studio/media/media-actions'
import If from '@/app/lib/If'
import UploadAreaClient from '@/app/studio/media/upload/UploadAreaClient'
import { getMyUser } from '@/app/login/login-actions'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'

function formatSize(kb: number): string {
    if (kb < 1024) {
        return `${kb} KB`
    } else {
        return `${(kb / 1024).toFixed(2)} MB`
    }
}

export default function MediaLibrary({ init, pickMode, allowUnpick, onPick }: {
    init: ImagePage,
    pickMode?: boolean,
    allowUnpick?: boolean,
    onPick?: (image: Image | null) => void
}) {
    const [ user, setUser ] = useState<User>()
    const [ page, setPage ] = useState<ImagePage>(init)
    const [ loading, setLoading ] = useState(false)
    const [ selectedImage, setSelectedImage ] = useState<Image | null>(null)
    const [ deleteConfirm, setDeleteConfirm ] = useState(false)
    const [ currentPage, setCurrentPage ] = useState(0)
    const {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    const tabsRef = useRef<TabsRef>(null)
    const canWrite = user?.roles.includes(Role.writer) ?? false

    useEffect(() => {
        (async () => {
            setUser((await getMyUser())!)
        })()
    }, [])

    useEffect(() => {
        (async () => {
            if (page.page !== currentPage) {
                setPage(await getImages(currentPage))
            }
        })()
    }, [ currentPage, page.page ])

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>

        <div className="p-8">
            <Tabs aria-label="媒体库选项卡" variant="default" ref={tabsRef}>
                <TabItem active title="图片" icon={HiPhoto}>
                    <If condition={page.pages < 1}>
                        <div className="flex flex-col justify-center items-center">
                            <img src="/assets/reading-light.png" alt="" className="h-48 mb-3"/>
                            <p className="mb-3">暂时没有图片</p>
                            <If condition={canWrite}>
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
                                        <button type="button" key={image.sha1}
                                                aria-label={`${selectedImage?.id === image.id ? '取消选择' : '选择'}图片: ${image.altText || image.name}`}
                                                aria-pressed={selectedImage?.id === image.id}
                                                className={`w-full h-full rounded
                                     ${selectedImage?.id === image.id ? 'ring-4 ring-blue-500' : ''}`}
                                                onClick={() => {
                                                    setDeleteConfirm(false)
                                                    if (selectedImage?.id === image.id) {
                                                        setSelectedImage(null)
                                                    } else {
                                                        setSelectedImage(image)
                                                    }
                                                }}>
                                            <img className="w-full aspect-square object-cover"
                                                 width={300}
                                                 height={200}
                                                 decoding="async"
                                                 alt={`图片: ${image.name}`}
                                                 src={`${page.uploadServePath}/${image.sha1}_thumb.webp`}/>
                                        </button>
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
                                            <a target="_blank" rel="noreferrer"
                                               aria-label={`在新窗口查看原图: ${selectedImage?.altText || selectedImage?.name}`}
                                               href={`${page.uploadServePath}/${selectedImage?.sha1}.webp`}>
                                                <img className="h-24" alt={`图片: ${selectedImage?.name}`}
                                                     src={`${page.uploadServePath}/${selectedImage?.sha1}_thumb.webp`}/>
                                            </a>
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
                                    <If condition={canWrite}>
                                        <Button pill disabled={loading} color="red"
                                                onClick={async () => {
                                                    if (!canWrite) {
                                                        showPermissionDenied()
                                                        return
                                                    }
                                                    if (deleteConfirm && selectedImage != null) {
                                                        setLoading(true)
                                                        try {
                                                            await deleteImage(selectedImage.id)
                                                            setSelectedImage(null)
                                                            setPage(await getImages(currentPage))
                                                        } catch (error) {
                                                            if (!handlePermissionError(error)) {
                                                                console.error('Failed to delete image:', error)
                                                            }
                                                        } finally {
                                                            setLoading(false)
                                                        }
                                                    } else {
                                                        setDeleteConfirm(true)
                                                    }
                                                }}>{deleteConfirm ? '确认删除?' : '删除图片'}</Button>
                                    </If>
                                </If>
                            </div>
                        </div>
                    </If>
                </TabItem>
                {canWrite ? (
                    <TabItem title="上传" icon={HiArrowUpTray}>
                        <UploadAreaClient uploadPrefix={page.uploadServePath} onAdded={async image => {
                            setSelectedImage(image)
                            setCurrentPage(0)
                            setPage(await getImages(0))
                        }}/>
                </TabItem>
                ) : null}
            </Tabs>
        </div>
    </>
}

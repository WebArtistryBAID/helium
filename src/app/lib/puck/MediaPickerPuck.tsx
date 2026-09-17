'use client'

import { useEffect, useState } from 'react'
import MediaPicker from '@/app/studio/media/MediaPicker'
import If from '@/app/lib/If'
import { Button } from 'flowbite-react'
import { getImage, getUploadServePath, type MediaType } from '@/app/studio/media/media-actions'
import { Image } from '@/generated/prisma/browser'
import { HiPhoto, HiVideoCamera } from 'react-icons/hi2'

export default function MediaPickerPuck({ name, onChange, value, allowedMediaTypes }:
                                        {
                                            name: string,
                                            onChange: (value: string | null) => void,
                                            value: string | null,
                                            allowedMediaTypes: MediaType[]
                                        }) {
    const [ open, setOpen ] = useState(false)
    const [ foundImage, setFoundImage ] = useState<Image | null>()
    const [ uploadPrefix, setUploadPrefix ] = useState('')
    const mediaLabel = allowedMediaTypes.length === 1
        ? allowedMediaTypes[0] === 'video' ? '视频' : '图片'
        : '媒体'

    useEffect(() => {
        ;(async () => {
            setUploadPrefix(await getUploadServePath())
        })().catch(error => {
            console.error('Failed to load upload path', error)
        })
    }, [])

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (value != null) {
                try {
                    const image = await getImage(parseInt(value))
                    if (!cancelled) setFoundImage(image)
                } catch {
                }
            } else {
                setFoundImage(null)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [ value ])

    return <>
        <MediaPicker open={open} onClose={() => setOpen(false)} allowUnpick={true}
                     allowedMediaTypes={allowedMediaTypes} onPick={image => {
            onChange(image == null ? null : image.id.toString())
            setOpen(false)
        }}/>

        <div className="flex items-center mb-3 gap-1 pl-1">
            {allowedMediaTypes.length === 1 && allowedMediaTypes[0] === 'video'
                ? <HiVideoCamera className="h-4 text-gray-400"/>
                : <HiPhoto className="h-4 text-gray-400"/>}
            <label className="text-sm text-gray-700">{name}</label>
        </div>

        <If condition={value == null}>
            <Button pill color="blue" onClick={() => setOpen(true)}>选择{mediaLabel}</Button>
        </If>
        <If condition={value != null}>
            <button type="button" aria-label={`更换媒体: ${foundImage?.altText || foundImage?.name || '当前媒体'}`}
                    onClick={() => setOpen(true)} className="cursor-pointer">
                {foundImage?.mediaType === 'video'
                    ? <img className="mt-1 mb-3 h-24 rounded-xl bg-black object-cover"
                           alt={foundImage.altText || foundImage.name}
                           src={`${uploadPrefix}/${foundImage.sha1}_thumb.webp`}/>
                    : <img className="mt-1 mb-3 h-24" alt={foundImage?.altText ?? ''}
                           src={`${uploadPrefix}/${foundImage?.sha1}_thumb.webp`}/>}
            </button>
        </If>
    </>
}

'use client'

import { useEffect, useState } from 'react'
import MediaPicker from '@/app/studio/media/MediaPicker'
import If from '@/app/lib/If'
import { Button } from 'flowbite-react'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { Image } from '@/generated/prisma/browser'
import { HiPhoto } from 'react-icons/hi2'

export default function MediaPickerPuck({ name, onChange, value }:
                                        {
                                            name: string,
                                            onChange: (value: string | null) => void,
                                            value: string | null
                                        }) {
    const [ open, setOpen ] = useState(false)
    const [ foundImage, setFoundImage ] = useState<Image | null>()
    const [ uploadPrefix, setUploadPrefix ] = useState('')

    useEffect(() => {
        (async () => {
            setUploadPrefix(await getUploadServePath())
        })()
    }, [])

    useEffect(() => {
        (async () => {
            if (value != null) {
                try {
                    setFoundImage(await getImage(parseInt(value)))
                } catch {
                }
            }
        })()
    }, [ value ])

    return <>
        <MediaPicker open={open} onClose={() => setOpen(false)} allowUnpick={true} onPick={image => {
            onChange(image == null ? null : image.id.toString())
            setOpen(false)
        }}/>

        <div className="flex items-center mb-3 gap-1 pl-1">
            <HiPhoto className="h-4 text-gray-400"/>
            <label className="text-sm text-gray-700">{name}</label>
        </div>

        <If condition={value == null}>
            <Button pill color="blue" onClick={() => setOpen(true)}>选择图片</Button>
        </If>
        <If condition={value != null}>
            <button type="button" aria-label={`更换图片：${foundImage?.altText || foundImage?.name || '当前图片'}`}
                    onClick={() => setOpen(true)} className="cursor-pointer">
                <img className="mt-1 mb-3 h-24" alt={foundImage?.altText ?? ''}
                     src={`${uploadPrefix}/${foundImage?.sha1}_thumb.webp`}/>
            </button>
        </If>
    </>
}

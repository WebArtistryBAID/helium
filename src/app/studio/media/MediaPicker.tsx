'use client'
import { useEffect, useState } from 'react'
import { Modal, ModalBody, ModalHeader } from 'flowbite-react'
import MediaLibrary from '@/app/studio/media/MediaLibrary'
import type { Image } from '@/generated/prisma/browser'
import { getMedia } from '@/app/studio/media/media-actions'
import type { ImagePage, MediaType } from '@/app/studio/media/media-actions'

const IMAGE_MEDIA_TYPES: MediaType[] = [ 'image' ]

type Props = {
    open: boolean
    onClose: () => void
    allowUnpick: boolean,
    allowedMediaTypes?: MediaType[],
    onPick: (image: Image | null) => void
}

export default function MediaPicker({
                                        open, onClose, allowUnpick, allowedMediaTypes = IMAGE_MEDIA_TYPES, onPick
                                    }: Props) {
    const [ content, setContent ] = useState<ImagePage>({
        items: [],
        page: 0,
        pages: 0,
        uploadServePath: ''
    })

    useEffect(() => {
        if (!open) return;
        let cancelled = false
        ;(async () => {
            const next = await getMedia(0, [ allowedMediaTypes[0] ])
            if (!cancelled) setContent(next)
        })().catch(error => {
            if (!cancelled) console.error('Failed to load images', error)
        })
        return () => {
            cancelled = true
        }
    }, [ allowedMediaTypes, open ])

    return (
        <Modal show={open} size="5xl" onClose={onClose}>
            <ModalHeader className="absolute right-4 top-4 z-50 border-0 p-0"/>
            <ModalBody className="min-h-0 overflow-y-auto p-0">
                <MediaLibrary
                    // Force reload when reopening
                    key={content.items.length ? `page-${content.page}-count-${content.items.length}` : 'empty'}
                    init={content}
                    pickMode={true}
                    allowedMediaTypes={allowedMediaTypes}
                    allowUnpick={allowUnpick}
                    onPick={img => {
                        onPick(img)
                    }}
                />
            </ModalBody>
        </Modal>
    )
}

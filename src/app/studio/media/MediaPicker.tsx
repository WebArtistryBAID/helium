'use client'
import { useEffect, useState } from 'react'
import { Modal, ModalHeader } from 'flowbite-react'
import MediaLibrary from '@/app/studio/media/MediaLibrary'
import type { Paginated } from '@/app/lib/data-types'
import type { Image } from '@/generated/prisma/browser'
import { getImages } from '@/app/studio/media/media-actions'

type Props = {
    open: boolean
    onClose: () => void
    allowUnpick: boolean,
    onPick: (image: Image | null) => void
}

export default function MediaPicker({ open, onClose, allowUnpick, onPick }: Props) {
    const [ content, setContent ] = useState<Paginated<Image>>({ items: [], page: 0, pages: 0 })

    useEffect(() => {
        if (!open) return

        let cancelled = false
        const loadContent = async () => {
            const nextContent = await getImages(0)
            if (!cancelled) {
                setContent(nextContent)
            }
        }
        void loadContent()
        return () => {
            cancelled = true
        }
    }, [ open ])

    return (
        <Modal show={open} size="5xl" onClose={onClose} className="relative">
            <ModalHeader className="border-none absolute z-50 right-0"/>
            <MediaLibrary
                init={content}
                pickMode={true}
                allowUnpick={allowUnpick}
                onPick={img => {
                    onPick(img)
                }}
            />
        </Modal>
    )
}

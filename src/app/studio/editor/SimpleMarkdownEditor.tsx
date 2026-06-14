'use client'

import { useState, useCallback, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import { Image } from '@/generated/prisma/browser'
import { Modal, ModalHeader } from 'flowbite-react'
import MediaLibrary from '@/app/studio/media/MediaLibrary'
import { getImages } from '@/app/studio/media/media-actions'
import type { ImagePage } from '@/app/studio/media/media-actions'

export default function SimpleMarkdownEditor({
                                                 value: controlled,
                                                 onChange,
                                                 placeholder = 'Write Markdown…',
                                                 className = '',
                                                 readOnly = false,
                                                 autoFocus = false
                                                 // eslint-disable-next-line
                                             }: any) {
    const [ uncontrolled, setUncontrolled ] = useState('')
    const [ showMediaLibrary, setShowMediaLibrary ] = useState(false)
    const [ mediaLibraryContent, setMediaLibraryContent ] = useState<ImagePage>({
        items: [],
        page: 0,
        pages: 0,
        uploadServePath: ''
    })

    useEffect(() => {
        (async () => {
            setMediaLibraryContent(await getImages(0))
        })()
    }, [])

    const value = controlled !== undefined ? controlled : uncontrolled

    const handleChange = useCallback(
        (val: string | undefined) => {
            const code = val ?? ''
            if (onChange) onChange(code)
            else setUncontrolled(code)
        },
        [ onChange ]
    )

    return <>
        <Modal show={showMediaLibrary} size="5xl" onClose={() => setShowMediaLibrary(false)} className="relative">
            <ModalHeader className="border-none absolute z-50 right-0"/>
            <MediaLibrary init={mediaLibraryContent} pickMode={true} onPick={image => {
                if (image == null) return
                setShowMediaLibrary(false)
                handleChange(`${value}\n[IMAGE: ${image.id}]\n`)
            }}/>
        </Modal>

        <div className={className} data-color-mode="light">
            <MDEditor
                value={value}
                onChange={handleChange}
                preview="edit"
                height={480}
                visibleDragbar={false}
                textareaProps={{
                    placeholder,
                    readOnly,
                    autoFocus,
                }}
            />
            <div className="px-4 py-2 text-xs text-gray-500 flex">
                <p className="flex-grow mr-auto">{value.length} 字符 · Markdown · 支持粘贴</p>
                {!readOnly && <button type="button" className="text-blue-600 hover:underline"
                                      onClick={() => setShowMediaLibrary(true)}>插入图片</button>}
            </div>
        </div>
    </>
}

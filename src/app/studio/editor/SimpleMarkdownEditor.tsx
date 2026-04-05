'use client'

import { useCallback, useEffect, useState } from 'react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-markdown'
import 'prismjs/themes/prism.css'
import { Paginated } from '@/app/lib/data-types'
import { Image } from '@/generated/prisma/browser'
import { Modal, ModalHeader } from 'flowbite-react'
import MediaLibrary from '@/app/studio/media/MediaLibrary'
import { getImages } from '@/app/studio/media/media-actions'

export default function SimpleMarkdownEditor({
                                                 value: controlled,
                                                 onChange,
                                                 placeholder = 'Write Markdown…',
                                                 className = '',
                                                 editorClassName = '',
                                                 readOnly = false,
                                                 autoFocus = false
                                                 // eslint-disable-next-line
                                             }: any) {
    const [ uncontrolled, setUncontrolled ] = useState('')
    const [ showMediaLibrary, setShowMediaLibrary ] = useState(false)
    const [ mediaLibraryContent, setMediaLibraryContent ] = useState<Paginated<Image>>({ items: [], page: 0, pages: 0 })

    // Get media library data
    useEffect(() => {
        (async () => {
            setMediaLibraryContent(await getImages(0))
        })()
    }, [])

    const value = controlled !== undefined ? controlled : uncontrolled

    const highlight = useCallback((code: string) => {
        return Prism.highlight(code, Prism.languages.markdown, 'markdown')
    }, [])

    const handleChange = useCallback(
        (code: string) => {
            if (onChange) onChange(code)
            else setUncontrolled(code)
        },
        [ onChange ]
    )

    const handleKeyDown = useCallback((ee: unknown) => {
        if (readOnly) return
        const e = ee as KeyboardEvent

        // Tab for two spaces
        if (e.key === 'Tab') {
            e.preventDefault()
            const el = e.target
            if (!(el instanceof HTMLTextAreaElement)) return
            const start = el.selectionStart
            const end = el.selectionEnd
            const insert = '  '
            const next = value.slice(0, start) + insert + value.slice(end)
            handleChange(next)
            // Restore caret after the inserted spaces
            requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + insert.length
            })
        }

        // Cmd/Ctrl + / to quote
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
            e.preventDefault()
            const el = e.target
            if (!(el instanceof HTMLTextAreaElement)) return
            const start = el.selectionStart
            const end = el.selectionEnd
            const lines = value.substring(start, end).split('\n')
            const allQuoted = lines.every((ln: string) => ln.startsWith('> '))
            const toggled = lines
                .map((ln: string) => (allQuoted ? ln.replace(/^>\s?/u, '') : '> ' + ln))
                .join('\n')
            const before = value.slice(0, start)
            const after = value.slice(end)
            const next = before + toggled + after
            handleChange(next)
            requestAnimationFrame(() => {
                // Roughly keep selection spanning the same text block
                el.selectionStart = start
                el.selectionEnd = start + toggled.length
            })
        }
    }, [ handleChange, value, readOnly ])

    const container =
        'rounded-2xl shadow p-0 border border-gray-200 overflow-hidden  bg-white ' +
        className
    const editorBox =
        'font-mono text-sm leading-6 outline-none p-4 whitespace-pre-wrap ' +
        'caret-black selection:bg-black/10 focus:outline-none ' +
        editorClassName

    return <>
        <Modal show={showMediaLibrary} size="5xl" onClose={() => setShowMediaLibrary(false)} className="relative">
            <ModalHeader className="border-none absolute z-50 right-0"/>
            <MediaLibrary init={mediaLibraryContent} pickMode={true} onPick={image => {
                setShowMediaLibrary(false)
                if (image != null) {
                    handleChange(`${value}\n[IMAGE: ${image.id}]\n`)
                }
            }}/>
        </Modal>

        <div className={container} style={{ height: '32rem' }}>
            <Editor
                value={value}
                onValueChange={handleChange}
                highlight={highlight}
                padding={16}
                tabSize={2}
                readOnly={readOnly}
                textareaId="markdown-code-editor"
                textareaClassName={editorBox}
                placeholder={placeholder}
                autoFocus={autoFocus}
                onKeyDown={handleKeyDown}
                preClassName="language-markdown"
                style={{ height: '30rem', overflowY: 'auto' }}
            />
            <div className="px-4 py-2 text-xs text-gray-500 flex">
                <p className="flex-grow mr-auto">{value.length} 字符 · Markdown</p>
                {!readOnly && <button className="text-blue-600 hover:underline"
                                      onClick={() => setShowMediaLibrary(true)}>插入图片</button>}
            </div>
        </div>
    </>
}

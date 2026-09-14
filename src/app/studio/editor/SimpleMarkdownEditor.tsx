'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-markdown'
import 'prismjs/themes/prism.css'
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
                                                 editorClassName = '',
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
    const editorId = useId()
    const insertionRange = useRef({ start: 0, end: 0 })
    const pendingCaret = useRef<number | null>(null)

    useEffect(() => {
        if (showMediaLibrary || pendingCaret.current === null) return
        const frame = requestAnimationFrame(() => {
            const textarea = document.getElementById(editorId)
            if (textarea instanceof HTMLTextAreaElement && pendingCaret.current !== null) {
                textarea.focus({ preventScroll: true })
                textarea.setSelectionRange(pendingCaret.current, pendingCaret.current)
                pendingCaret.current = null
            }
        })
        return () => cancelAnimationFrame(frame)
    }, [showMediaLibrary, editorId])

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
        'rounded-2xl shadow p-0 border border-gray-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 ' +
        className
    const editorBox =
        'font-mono text-sm leading-6 p-4 whitespace-pre-wrap ' +
        'caret-black selection:bg-black/10 ' +
        editorClassName

    return <>
        <Modal show={showMediaLibrary} size="5xl" onClose={() => setShowMediaLibrary(false)} className="relative">
            <ModalHeader className="border-none absolute z-50 right-0"/>
            <MediaLibrary init={mediaLibraryContent} pickMode={true} onPick={image => {
                if (image == null || readOnly) {
                    return
                }
                const start = Math.min(insertionRange.current.start, value.length)
                const end = Math.min(insertionRange.current.end, value.length)
                const insert = `\n[IMAGE: ${image.id}]\n`
                handleChange(value.slice(0, start) + insert + value.slice(end))
                pendingCaret.current = start + insert.length
                setShowMediaLibrary(false)
            }}/>
        </Modal>

        <div className={`flex h-[32rem] flex-col ${container}`}>
            <label className="sr-only" htmlFor={editorId}>Markdown 正文编辑器</label>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <Editor
                    value={value}
                    onValueChange={handleChange}
                    highlight={highlight}
                    padding={16}
                    tabSize={2}
                    readOnly={readOnly}
                    textareaId={editorId}
                    className={editorBox}
                    textareaClassName="caret-black selection:bg-black/10 focus:outline-none focus:ring-0"
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    onKeyDown={handleKeyDown}
                    preClassName="language-markdown"
                    style={{ minHeight: '100%' }}
                />
            </div>
            <div className="shrink-0 px-4 py-2 text-xs text-gray-500 flex">
                <p className="flex-grow mr-auto">{value.length} 字符 · Markdown</p>
                {!readOnly && <button type="button" className="text-blue-600 hover:underline"
                                      onClick={() => {
                                          const textarea = document.getElementById(editorId)
                                          if (textarea instanceof HTMLTextAreaElement) {
                                              insertionRange.current = { start: textarea.selectionStart, end: textarea.selectionEnd }
                                          }
                                          setShowMediaLibrary(true)
                                      }}>插入图片</button>}
            </div>
        </div>
    </>
}

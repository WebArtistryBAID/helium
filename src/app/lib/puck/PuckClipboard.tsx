'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createUsePuck, IconButton, resolveAllData, useGetPuck } from '@puckeditor/core'
import { HiOutlineClipboard, HiOutlineSquare2Stack } from 'react-icons/hi2'
import { copyComponent, isComponentClipboard, pasteComponent, COMPONENT_CLIPBOARD_FORMAT } from './component-clipboard'
import { PUCK_CONFIG } from './puck-config'

const ClipboardContext = createContext<{ copy: () => void; paste: () => void; canWrite: boolean; notice: string | null } | null>(null)
const usePuckSelector = createUsePuck()

export function PuckClipboardButtons() {
    const clipboard = useContext(ClipboardContext)
    const selected = usePuckSelector(state => state.selectedItem)
    const anchorRef = useRef<HTMLSpanElement | null>(null)
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
    useEffect(() => {
        if (!clipboard?.notice || !anchorRef.current) return
        const bounds = anchorRef.current.getBoundingClientRect()
        setPosition({ top: bounds.bottom + 8, left: Math.max(8, bounds.left) })
    }, [clipboard?.notice])
    if (!clipboard) return null
    return <>
        <IconButton title="复制组件 (Ctrl/Cmd+C)" disabled={!selected} onClick={clipboard.copy}>
            <HiOutlineSquare2Stack className="size-7" aria-hidden="true"/>
        </IconButton>
        <span ref={anchorRef} className="inline-flex">
        <IconButton title="粘贴组件 (Ctrl/Cmd+V)" disabled={!clipboard.canWrite} onClick={clipboard.paste}>
            <HiOutlineClipboard className="size-6" aria-hidden="true"/>
        </IconButton>
        </span>
        {clipboard.notice && position && createPortal(
            <div role="tooltip" className="fixed z-[9999] max-w-72 rounded-xl bg-gray-900 px-3 py-2 text-sm text-white shadow-lg"
                 style={position}>{clipboard.notice}</div>, document.body
        )}
    </>
}

export function PuckClipboardProvider({ children, canWrite }: { children: ReactNode; canWrite: boolean }) {
    const getPuck = useGetPuck()
    const [notice, setNotice] = useState<string | null>(null)
    const revealCleanup = useRef<(() => void) | null>(null)
    useEffect(() => {
        if (!notice) return
        const timer = window.setTimeout(() => setNotice(null), 6000)
        return () => window.clearTimeout(timer)
    }, [notice])
    useEffect(() => () => revealCleanup.current?.(), [])
    const reveal = (id: string) => {
        revealCleanup.current?.()
        const editor = document.querySelector('.page-editor')
        if (!editor) return
        const documents = [document, ...Array.from(editor.querySelectorAll('iframe')).flatMap(frame => frame.contentDocument ? [frame.contentDocument] : [])]
        let frame = 0
        let attempts = 0
        const find = () => {
            for (const doc of documents) {
                const element = doc.querySelector<HTMLElement>(`[data-puck-component="${CSS.escape(id)}"]`)
                if (element) {
                    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
                    return
                }
            }
            if (++attempts < 120) frame = window.requestAnimationFrame(find)
        }
        frame = window.requestAnimationFrame(find)
        revealCleanup.current = () => window.cancelAnimationFrame(frame)
    }
    const applyPaste = async (value: string) => {
        if (!canWrite) return
        try {
            const selectedId = getPuck().selectedItem?.props.id
            // Validate and refresh copied content before recording a single insertion.
            const validated = pasteComponent(value, { root: { props: {} }, content: [], zones: {} })
            const resolved = await resolveAllData(validated.data, PUCK_CONFIG)
            const refreshed = JSON.stringify({ format: COMPONENT_CLIPBOARD_FORMAT, component: resolved.content[0], zones: resolved.zones ?? {} })
            const api = getPuck()
            const selector = selectedId ? api.getSelectorForId(selectedId) : undefined
            const pasted = pasteComponent(refreshed, api.appState.data, selector)
            api.dispatch({ type: 'setData', data: pasted.data, recordHistory: true })
            const inserted = getPuck().getSelectorForId(pasted.id)
            if (inserted) api.dispatch({ type: 'setUi', ui: { itemSelector: inserted } })
            reveal(pasted.id)
            setNotice(null)
        } catch (cause) {
            setNotice(cause instanceof Error ? cause.message : '无法粘贴组件。')
        }
    }
    const selectedText = () => {
        const api = getPuck()
        return api.selectedItem ? copyComponent(api.appState.data, api.selectedItem) : null
    }
    const copy = async () => {
        const value = selectedText()
        if (!value) return
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
            else {
                const input = document.createElement('textarea')
                input.value = value
                input.style.position = 'fixed'
                input.style.opacity = '0'
                document.body.appendChild(input)
                const focused = document.activeElement as HTMLElement | null
                try {
                    input.select()
                    if (!document.execCommand('copy')) throw new Error('请使用 Ctrl/Cmd+C 复制组件。')
                } finally {
                    input.remove()
                    focused?.focus()
                }
            }
        } catch {
            setNotice('请使用 Command+C 或 Ctrl+C 复制组件。')
        }
    }
    const paste = async () => {
        if (!canWrite) return
        try {
            if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable')
            await applyPaste(await navigator.clipboard.readText())
        } catch {
            setNotice('浏览器限制了剪贴板访问，请使用 Command+V 或 Ctrl+V 粘贴。')
        }
    }

    useEffect(() => {
        const editor = document.querySelector('.page-editor')
        if (!editor) return
        const documents = new Set<Document>()
        const frames = new Set<HTMLIFrameElement>()
        const editable = (event: ClipboardEvent) => {
            const target = event.target as HTMLElement | null
            return Boolean(target?.closest?.('input, textarea, [contenteditable="true"], [role="textbox"]'))
        }
        const onCopy = (event: ClipboardEvent) => {
            if (editable(event) || !event.clipboardData) return
            const doc = event.target as Node | null
            if (doc?.ownerDocument?.getSelection()?.toString()) return
            const value = selectedText()
            if (!value) return
            event.clipboardData.setData('text/plain', value)
            event.preventDefault()
        }
        const onPaste = (event: ClipboardEvent) => {
            if (!canWrite) return
            const value = event.clipboardData?.getData('text/plain') ?? ''
            if (!isComponentClipboard(value)) return
            // Component bundles take precedence even while an inline text field has focus.
            event.preventDefault()
            event.stopPropagation()
            void applyPaste(value)
        }
        const attach = (doc: Document) => {
            if (documents.has(doc)) return
            documents.add(doc)
            doc.addEventListener('copy', onCopy)
            doc.addEventListener('paste', onPaste, true)
        }
        const refresh = () => {
            editor.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => {
                if (!frames.has(frame)) {
                    frames.add(frame)
                    frame.addEventListener('load', refresh)
                }
                if (frame.contentDocument) attach(frame.contentDocument)
            })
        }
        attach(document)
        refresh()
        const observer = new MutationObserver(refresh)
        observer.observe(editor, { childList: true, subtree: true })
        return () => {
            observer.disconnect()
            frames.forEach(frame => frame.removeEventListener('load', refresh))
            documents.forEach(doc => {
                doc.removeEventListener('copy', onCopy)
                doc.removeEventListener('paste', onPaste, true)
            })
        }
    }, [ canWrite, getPuck ])

    return <ClipboardContext.Provider value={{ copy, paste, canWrite, notice }}>
        {children}
    </ClipboardContext.Provider>
}

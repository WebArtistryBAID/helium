'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createUsePuck, useGetPuck } from '@puckeditor/core'
import { Button, Modal, ModalBody, ModalHeader, Textarea } from 'flowbite-react'
import { copyComponent, pasteComponent, COMPONENT_CLIPBOARD_FORMAT } from './component-clipboard'

const ClipboardContext = createContext<{ copy: () => void; paste: () => void; canWrite: boolean } | null>(null)
const usePuckSelector = createUsePuck()

export function PuckClipboardButtons() {
    const clipboard = useContext(ClipboardContext)
    const selected = usePuckSelector(state => state.selectedItem)
    if (!clipboard) return null
    return <>
        <Button pill size="xs" color="alternative" className="cursor-pointer" disabled={!selected}
                onClick={clipboard.copy}>复制</Button>
        <Button pill size="xs" color="alternative" className="cursor-pointer" disabled={!clipboard.canWrite}
                onClick={clipboard.paste}>粘贴</Button>
    </>
}

export function PuckClipboardProvider({ children, canWrite }: { children: ReactNode; canWrite: boolean }) {
    const getPuck = useGetPuck()
    const [ error, setError ] = useState<string | null>(null)
    const [ manualPaste, setManualPaste ] = useState(false)
    const [ text, setText ] = useState('')
    const applyPaste = (value: string) => {
        if (!canWrite) return
        try {
            const api = getPuck()
            const selector = api.selectedItem ? api.getSelectorForId(api.selectedItem.props.id) : undefined
            const pasted = pasteComponent(value, api.appState.data, selector)
            api.dispatch({ type: 'setData', data: pasted.data })
            const inserted = getPuck().getSelectorForId(pasted.id)
            if (inserted) api.dispatch({ type: 'setUi', ui: { itemSelector: inserted } })
            pasted.ids.forEach(id => {
                void Promise.resolve(getPuck().resolveDataById(id, 'force')).catch(cause => {
                    console.error('Failed to resolve pasted Puck component:', { componentId: id }, cause)
                    setError('组件已粘贴，预览内容加载失败。')
                })
            })
            setManualPaste(false)
            setText('')
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : '无法粘贴组件。')
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
            setError('请使用 Ctrl/Cmd+C 复制组件。')
        }
    }
    const paste = async () => {
        if (!canWrite) return
        try {
            if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable')
            applyPaste(await navigator.clipboard.readText())
        } catch {
            setManualPaste(true)
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
            if (editable(event) || !canWrite) return
            const value = event.clipboardData?.getData('text/plain') ?? ''
            if (!value.includes(COMPONENT_CLIPBOARD_FORMAT)) return
            event.preventDefault()
            applyPaste(value)
        }
        const attach = (doc: Document) => {
            if (documents.has(doc)) return
            documents.add(doc)
            doc.addEventListener('copy', onCopy)
            doc.addEventListener('paste', onPaste)
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
                doc.removeEventListener('paste', onPaste)
            })
        }
    }, [ canWrite, getPuck ])

    return <ClipboardContext.Provider value={{ copy, paste, canWrite }}>
        {children}
        <Modal show={manualPaste || error != null} onClose={() => {
            setManualPaste(false)
            setError(null)
        }}>
            <ModalHeader>{error ? '组件剪贴板' : '粘贴组件'}</ModalHeader>
            <ModalBody>
                {error ? <p>{error}</p> :
                    <Textarea rows={5} value={text} onChange={event => setText(event.target.value)}
                              placeholder="使用 Ctrl/Cmd+V 粘贴已复制的组件"/>}
                <div className="mt-6 flex gap-3">
                    {manualPaste && !error &&
                        <Button pill className="cursor-pointer" onClick={() => applyPaste(text)}>粘贴</Button>}
                    <Button pill color="alternative" className="cursor-pointer" onClick={() => {
                        setManualPaste(false)
                        setError(null)
                    }}>关闭</Button>
                </div>
            </ModalBody>
        </Modal>
    </ClipboardContext.Provider>
}

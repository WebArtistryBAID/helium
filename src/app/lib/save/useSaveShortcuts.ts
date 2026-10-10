'use client'

import { useLayoutEffect, useRef } from 'react'

export function useSaveShortcut(enabled: boolean, onSave: () => void) {
    const onSaveRef = useRef(onSave)
    useLayoutEffect(() => {
        onSaveRef.current = onSave
    }, [ onSave ])

    useLayoutEffect(() => {
        if (!enabled) return
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.code === 'KeyS' || e.key.toLowerCase() === 's')) {
                e.preventDefault()
                // Handle the original event before editable fields or editor shortcuts stop it.
                e.stopPropagation()
                if (!e.repeat) onSaveRef.current()
            }
        }
        const documents = new Map<Document, () => void>()
        let active = true
        const refresh = () => {
            if (!active) return
            const current = new Set<Document>()
            const collect = (doc: Document) => {
                if (current.has(doc)) return
                current.add(doc)
                for (const frame of doc.querySelectorAll('iframe')) {
                    try {
                        // Keyboard events stay in their browsing context. Listen inside same-origin previews.
                        if (frame.contentDocument) collect(frame.contentDocument)
                    } catch {
                        // Cross-origin embeds are outside the editor's keyboard context.
                    }
                }
            }
            collect(document)
            for (const [ doc, cleanup ] of documents) {
                if (!current.has(doc)) {
                    cleanup()
                    documents.delete(doc)
                }
            }
            for (const doc of current) {
                if (documents.has(doc) || !doc.defaultView) continue
                const view = doc.defaultView
                const onLoad = (event: Event) => {
                    if ((event.target as Element | null)?.tagName === 'IFRAME') refresh()
                }
                const observer = new MutationObserver(records => {
                    const hasFrame = (node: Node) => node.nodeType === 1 &&
                        ((node as Element).tagName === 'IFRAME' || (node as Element).querySelector('iframe'))
                    if (records.some(record => [ ...record.addedNodes, ...record.removedNodes ].some(hasFrame))) refresh()
                })
                view.addEventListener('keydown', handler, { capture: true, passive: false })
                doc.addEventListener('load', onLoad, true)
                observer.observe(doc, { childList: true, subtree: true })
                documents.set(doc, () => {
                    observer.disconnect()
                    doc.removeEventListener('load', onLoad, true)
                    try {
                        view.removeEventListener('keydown', handler, true)
                    } catch {
                        // The frame may have navigated to another origin before cleanup.
                    }
                })
            }
        }
        refresh()
        return () => {
            active = false
            documents.forEach(cleanup => cleanup())
            documents.clear()
        }
    }, [ enabled ])
}

'use client'

import { type ReactNode, useLayoutEffect } from 'react'

/** Host modal scroll locks must never become the preview document's scroll policy. */
export default function PuckPreviewFrame({ children, document }: { children: ReactNode; document: Document }) {
    useLayoutEffect(() => {
        const style = document.createElement('style')
        style.textContent = `
            html { height: 100%; overflow-y: scroll !important; }
            body {
                position: static !important;
                overflow: visible !important;
                height: auto !important;
                min-height: 100%;
                width: auto !important;
                top: auto !important;
                left: auto !important;
            }
        `
        document.head.appendChild(style)
        return () => style.remove()
    }, [ document ])

    return children
}

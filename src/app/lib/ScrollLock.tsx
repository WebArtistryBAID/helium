'use client'

import { useEffect } from 'react'

export default function ScrollLock() {
    useEffect(() => {
        const html = document.documentElement
        const body = document.body

        const prevHtmlOverscroll = html.style.overscrollBehavior
        const prevBodyOverscroll = body.style.overscrollBehavior

        html.style.overscrollBehaviorY = 'none'
        body.style.overscrollBehaviorY = 'none'

        return () => {
            html.style.overscrollBehavior = prevHtmlOverscroll
            body.style.overscrollBehavior = prevBodyOverscroll
        }
    }, [])

    return null
}

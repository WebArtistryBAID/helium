'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function FrontendScrollRestoration() {
    // Some stupid people (in my opinion) really wants the user to go to the TOP of
    // the previous page, instead of what their PREVIOUS position ACTUALLY was,
    // when they tap on the browser "back" button.
    // It doesn't make ANY fucking sense in my opinion, but... whatever.
    // I've restricted this change to only users with Chinese as their language.

    const pathname = usePathname()
    const pendingRestoration = useRef(false)

    useEffect(() => {
        const language = navigator.languages?.[0] || navigator.language
        if (!/^zh(?:-|$)/i.test(language)) return

        const previousRestoration = window.history.scrollRestoration
        window.history.scrollRestoration = 'manual'
        let frame = 0

        const scrollToTop = () => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        }
        const onPopState = () => {
            pendingRestoration.current = true
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(scrollToTop)
        }
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) scrollToTop()
        }

        window.addEventListener('popstate', onPopState)
        window.addEventListener('pageshow', onPageShow)
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('popstate', onPopState)
            window.removeEventListener('pageshow', onPageShow)
            window.history.scrollRestoration = previousRestoration
        }
    }, [])

    useEffect(() => {
        if (!pendingRestoration.current) return
        pendingRestoration.current = false
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, [ pathname ])

    return null
}

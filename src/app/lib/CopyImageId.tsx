'use client'

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

async function copyId(id: string) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(id)
            return
        }
    } catch {
        // Internal HTTP sites and denied Clipboard API permissions use the fallback.
    }
    const field = document.createElement('textarea')
    const focused = document.activeElement as HTMLElement | null
    field.value = id
    field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
    document.body.appendChild(field)
    try {
        field.select()
        if (!document.execCommand('copy')) throw new Error('Clipboard unavailable')
    } finally {
        field.remove()
        focused?.focus({ preventScroll: true })
    }
}

export default function CopyImageId({ children, imageIds = {}, locale = 'en' }: {
    children: ReactNode
    imageIds?: Record<string, number>
    locale?: string
}) {
    const lastTap = useRef<{ image: HTMLElement; time: number } | null>(null)
    const navigation = useRef<ReturnType<typeof setTimeout> | null>(null)
    const dismiss = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [ notice, setNotice ] = useState('')
    useEffect(() => () => {
        if (navigation.current) clearTimeout(navigation.current)
        if (dismiss.current) clearTimeout(dismiss.current)
    }, [])

    function click(event: MouseEvent<HTMLDivElement>) {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
        const target = event.target as Element
        let image: HTMLElement | null = target.closest('img')
        let source = (image as HTMLImageElement | null)?.src ?? ''
        // Some Puck components display their media as CSS backgrounds.
        if (!image && !target.closest('a, button, input, textarea, select')) {
            let candidate: HTMLElement | null = target as HTMLElement
            while (candidate && candidate !== event.currentTarget) {
                const background = candidate.style?.backgroundImage ?? ''
                if (background.includes('url(')) {
                    image = candidate
                    source = background.replace(/^url\(["']?|["']?\)$/g, '')
                    break
                }
                candidate = candidate.parentElement
            }
        }
        if (!image) return
        const hash = source.match(/\/([a-f0-9]{40})(?:_thumb)?\.[^/?]+(?:[?#]|$)/i)?.[1]
        const id = image.dataset.imageId ?? (hash ? imageIds[hash] : undefined)
        if (!id) return
        const now = Date.now()
        const doubleTap = lastTap.current?.image === image && now - lastTap.current.time < 350
        lastTap.current = doubleTap ? null : { image, time: now }
        const link = image.closest('a')
        if (link || doubleTap) {
            event.preventDefault()
            event.stopPropagation()
        }
        if (navigation.current) clearTimeout(navigation.current)
        if (doubleTap) {
            void copyId(String(id)).then(() => {
                setNotice(locale === 'zh' ? `已复制图片 ID: ${id}` : `Copied image ID: ${id}`)
            }).catch(() => {
                setNotice(locale === 'zh' ? '复制失败，请检查浏览器剪贴板权限。' : 'Copy failed. Check browser clipboard permissions.')
            })
            if (dismiss.current) clearTimeout(dismiss.current)
            dismiss.current = setTimeout(() => setNotice(''), 2500)
        } else if (link) {
            // Give a second tap time to arrive before following an image link.
            navigation.current = setTimeout(() => {
                if (link.target && link.target !== '_self') window.open(link.href, link.target, 'noopener')
                else window.location.assign(link.href)
            }, 350)
        }
    }

    return <div style={{ display: 'contents' }} onClickCapture={click}>
        {children}
        {notice && <div role="status"
                        className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-3xl bg-gray-900 px-5 py-3 text-sm text-white shadow-lg">{notice}</div>}
    </div>
}

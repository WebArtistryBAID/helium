import { useEffect, useState } from 'react'
import type { Image } from '@/generated/prisma/browser'
import { getImage } from '@/app/studio/media/media-actions'

export function useImagePlaceholders(opts: {
    markdown: string | undefined,
    uploadPrefix: string,
}) {
    const { markdown = '', uploadPrefix } = opts
    const [ previewContent, setPreviewContent ] = useState('')
    const [ cachedImages, setCachedImages ] = useState<Map<number, Image>>(new Map())

    const extractImageIds = (md: string): number[] => {
        const ids = new Set<number>()
        const re = /\[IMAGE:\s*(\d+)\s*\]/g
        let m: RegExpExecArray | null
        while ((m = re.exec(md)) !== null) ids.add(Number(m[1]))
        return Array.from(ids)
    }
    const escapeAlt = (s: string) => (s ?? '').replace(/]/g, '\\]')

    useEffect(() => {
        (async () => {
            const ids = extractImageIds(markdown)
            if (ids.length === 0) {
                setPreviewContent(markdown)
                return
            }

            // fill cache
            const working = new Map(cachedImages)
            const missing = ids.filter(id => !working.has(id))
            if (missing.length) {
                const fetched = await Promise.all(missing.map(id => getImage(id)))
                for (const img of fetched) if (img) working.set(img.id, img)
                if (missing.length) setCachedImages(working)
            }

            // replace placeholders
            const replaced = markdown.replace(/\[IMAGE:\s*(\d+)\s*\]/g, (_, idStr: string) => {
                const id = Number(idStr)
                const img = working.get(id)
                if (!img) return _
                const alt = escapeAlt(img.altText ?? '')
                return `![${alt}](${uploadPrefix}/${img.sha1}.webp)`
            })
            setPreviewContent(replaced)
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ markdown, uploadPrefix ])

    return { previewContent, cachedImages }
}

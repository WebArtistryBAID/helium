import Markdown from 'react-markdown'
import { PlateStatic } from 'platejs/static'
import { createHeliumPlateStaticEditor } from '@/app/lib/plate/plate-static-config'
import { isPlateValue, type HeliumPlateValue } from '@/app/lib/plate/plate-types'
import { rejectAllPlateSuggestions } from '@/app/lib/plate/plate-suggestions'

type ContentBlock =
    | { type: 'markdown', content: string }
    | { type: 'images', images: { id: string, alt: string, src: string }[] }

export default function ContentEntityBody({ content, images, uploadPrefix }: {
    content: string
    images: { id: number; altText: string | null; height: number; sha1: string; width: number }[]
    uploadPrefix: string
}) {
    try {
        const parsed: unknown = JSON.parse(content)
        if (isPlateValue(parsed)) {
            const imageMap = new Map(images.map(image => [ image.id, image ]))
            const value = rejectAllPlateSuggestions(structuredClone(parsed) as HeliumPlateValue)
            const hydrateImages = (node: unknown) => {
                if (node == null || typeof node !== 'object') return
                const record = node as Record<string, unknown>
                if (record.type === 'img' && typeof record.imageId === 'number') {
                    const image = imageMap.get(record.imageId)
                    if (image != null) {
                        record.url = `${uploadPrefix}/${image.sha1}.webp`
                        record.alt = image.altText ?? ''
                        record.imageWidth = image.width
                        record.imageHeight = image.height
                    }
                }
                if (Array.isArray(record.children)) record.children.forEach(hydrateImages)
            }
            value.forEach(hydrateImages)
            const editor = createHeliumPlateStaticEditor(value)
            return <PlateStatic editor={editor} className="flex flex-wrap content-start"/>
        }
    } catch {
        // Legacy Markdown is rendered below.
    }

    const base = content
    const matches = Array.from(base.matchAll(/\[IMAGE:\s*(\d+)\s*\]/g))
    const imageMap = new Map(images.map(image => [String(image.id), image]))
    const contentBlocks: ContentBlock[] = []
    let cursor = 0
    let pendingImages: ContentBlock & { type: 'images' } | null = null

    const flushImages = () => {
        if (pendingImages?.images.length) contentBlocks.push(pendingImages)
        pendingImages = null
    }

    for (const match of matches) {
        const textBefore = base.slice(cursor, match.index)
        if (textBefore.trim()) {
            flushImages()
            contentBlocks.push({ type: 'markdown', content: textBefore })
        }

        const image = imageMap.get(match[1])
        if (image) {
            pendingImages ??= { type: 'images', images: [] }
            pendingImages.images.push({
                id: match[1],
                alt: image.altText ?? '',
                src: `${uploadPrefix}/${image.sha1}.webp`
            })
        }
        cursor = (match.index ?? 0) + match[0].length
    }

    const trailingContent = base.slice(cursor)
    flushImages()
    if (trailingContent.trim()) {
        contentBlocks.push({ type: 'markdown', content: trailingContent })
    }

    return <>
        {contentBlocks.map((block, index) => block.type === 'markdown'
            ? <Markdown key={`markdown-${index}`}>{block.content}</Markdown>
            : <div key={`images-${index}`}
                   className={`content-entity-gallery ${block.images.length === 1 ? 'content-entity-gallery-single' : ''}`}>
                {block.images.map((image, imageIndex) =>
                    <img key={`${image.id}-${imageIndex}`} src={image.src} alt={image.alt} loading="lazy"/>
                )}
            </div>
        )}
    </>
}

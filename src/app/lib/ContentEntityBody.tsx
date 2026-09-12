import Markdown from 'react-markdown'

type ContentBlock =
    | { type: 'markdown', content: string }
    | { type: 'images', images: { id: string, alt: string, src: string }[] }

export default function ContentEntityBody({ content, images, uploadPrefix }: {
    content: string
    images: { id: number; altText: string | null; sha1: string }[]
    uploadPrefix: string
}) {
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

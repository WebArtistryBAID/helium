import { KEYS, type TElement } from 'platejs'
import { deserializeMd } from '@platejs/markdown'
import { createHeliumPlateStaticEditor } from '@/app/lib/plate/plate-static-config'
import { EMPTY_PLATE_VALUE, isPlateValue, type HeliumPlateValue } from '@/app/lib/plate/plate-types'

function convertImagePlaceholder(node: TElement): TElement {
    const children = node.children.map(child => {
        if ('children' in child) return convertImagePlaceholder(child as TElement)
        return child
    })
    const text = children.length === 1 && 'text' in children[0] ? children[0].text : null
    const match = node.type === KEYS.p && typeof text === 'string'
        ? text.match(/^\s*\[IMAGE:\s*(\d+)\s*]\s*$/)
        : null
    const mediaId = node.type === KEYS.img && typeof node.url === 'string'
        ? node.url.match(/^helium-media:\/\/(\d+)$/)?.[1]
        : null

    if (match || mediaId) {
        return {
            type: KEYS.img,
            imageId: Number(match?.[1] ?? mediaId),
            url: '',
            children: [ { text: '' } ]
        }
    }
    return { ...node, children }
}

export function deserializeMarkdownToPlate(markdown: string): HeliumPlateValue {
    if (markdown.trim().length === 0) return structuredClone(EMPTY_PLATE_VALUE)

    const editor = createHeliumPlateStaticEditor()
    const value = deserializeMd(editor, markdown).map(node => {
        if ('children' in node) return convertImagePlaceholder(node as TElement)
        return node
    })
    if (!isPlateValue(value)) throw new Error('Markdown 无法转换为 Plate JSON')
    return value
}

import { KEYS, type TElement, type TText, type Value } from 'platejs'

export type HeliumPlateText = TText & {
    backgroundColor?: string
    bold?: boolean
    code?: boolean
    color?: string
    comment?: boolean
    fontSize?: string
    highlight?: boolean
    italic?: boolean
    strikethrough?: boolean
    subscript?: boolean
    superscript?: boolean
    underline?: boolean
} & Partial<Record<`comment_${string}`, boolean>>

export type HeliumPlateElement = TElement & {
    id?: string
    imageId?: number
    type: string
    url?: string
}

export type HeliumPlateValue = Value & HeliumPlateElement[]

export const EMPTY_PLATE_VALUE: HeliumPlateValue = [
    { type: KEYS.p, children: [ { text: '' } ] }
]

function isPlateNode(value: unknown): boolean {
    if (value == null || typeof value !== 'object') return false
    const node = value as Record<string, unknown>
    if (typeof node.text === 'string') return true
    return typeof node.type === 'string' && Array.isArray(node.children) && node.children.every(isPlateNode)
}

export function isPlateValue(value: unknown): value is HeliumPlateValue {
    return Array.isArray(value) && value.length > 0 && value.every(isPlateNode)
}

export function parsePlateValue(value: string | HeliumPlateValue): HeliumPlateValue {
    if (typeof value !== 'string') return isPlateValue(value) ? value : structuredClone(EMPTY_PLATE_VALUE)

    try {
        const parsed: unknown = JSON.parse(value)
        return isPlateValue(parsed) ? parsed : structuredClone(EMPTY_PLATE_VALUE)
    } catch {
        return structuredClone(EMPTY_PLATE_VALUE)
    }
}

export function serializePlateValue(value: HeliumPlateValue): string {
    return JSON.stringify(value)
}

export function isSerializedPlateValue(value: string): boolean {
    try {
        return isPlateValue(JSON.parse(value))
    } catch {
        return false
    }
}

export function hasPlateSuggestions(value: string | HeliumPlateValue): boolean {
    let parsed: unknown = value
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value)
        } catch {
            return false
        }
    }

    function visit(node: unknown): boolean {
        if (node == null || typeof node !== 'object') return false
        if (Array.isArray(node)) return node.some(visit)

        const record = node as Record<string, unknown>
        if (Object.keys(record).some(key => key.startsWith(`${KEYS.suggestion}_`))) return true
        return Array.isArray(record.children) && record.children.some(visit)
    }

    return visit(parsed)
}

export function extractContentImageIds(content: string): number[] {
    const ids = new Set<number>()
    for (const match of content.matchAll(/\[IMAGE:\s*(\d+)\s*]/g)) ids.add(Number(match[1]))

    try {
        const visit = (node: unknown) => {
            if (node == null || typeof node !== 'object') return
            const record = node as Record<string, unknown>
            if (record.type === KEYS.img && typeof record.imageId === 'number') ids.add(record.imageId)
            if (Array.isArray(record.children)) record.children.forEach(visit)
        }
        const parsed: unknown = JSON.parse(content)
        if (Array.isArray(parsed)) parsed.forEach(visit)
    } catch {
        // Legacy Markdown was handled by the placeholder expression above.
    }

    return Array.from(ids)
}

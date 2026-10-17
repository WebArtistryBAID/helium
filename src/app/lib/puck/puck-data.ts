import type { Data } from '@puckeditor/core'

function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function emptyPuckData(title = ''): Data {
    return {
        content: [],
        root: { props: { title } },
        zones: {}
    }
}

export function isPuckData(value: unknown): value is Data {
    if (!isRecord(value) || !Array.isArray(value.content) || !isRecord(value.root) || !isRecord(value.zones)) {
        return false
    }
    return isRecord(value.root.props)
}

export function getPuckShortContent(data: Data): string | undefined {
    const value = (data.root.props as Record<string, unknown> | undefined)?.shortContent
    return typeof value === 'string' ? value : undefined
}

export function parsePuckData(content: string, fallbackTitle = '', draftShortContent?: string | null): Data {
    try {
        const parsed: unknown = JSON.parse(content)
        if (isPuckData(parsed)) {
            if (draftShortContent !== undefined && getPuckShortContent(parsed) === undefined) {
                Object.assign(parsed.root.props!, { shortContent: draftShortContent ?? '' })
            }
            return parsed
        }
    } catch (error) {
        console.error('Unable to parse Puck content:', error)
    }
    const data = emptyPuckData(fallbackTitle)
    if (draftShortContent !== undefined) Object.assign(data.root.props!, { shortContent: draftShortContent ?? '' })
    return data
}

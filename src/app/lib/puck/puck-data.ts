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

export function parsePuckData(content: string, fallbackTitle = ''): Data {
    try {
        const parsed: unknown = JSON.parse(content)
        if (isPuckData(parsed)) return parsed
    } catch (error) {
        console.error('Unable to parse Puck content:', error)
    }
    return emptyPuckData(fallbackTitle)
}

/** Index resolved media without sending unrelated page data to the client. */
export function collectImageIds(value: unknown): Record<string, number> {
    const ids: Record<string, number> = {}

    function visit(node: unknown) {
        if (!node || typeof node !== 'object') return
        const record = node as Record<string, unknown>
        if (typeof record.id === 'number' && typeof record.sha1 === 'string' && record.mediaType !== 'video') {
            ids[record.sha1] = record.id
        }
        Object.values(record).forEach(visit)
    }

    visit(value)
    return ids
}


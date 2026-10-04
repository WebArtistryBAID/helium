/** Attach expectations only for supplied scalar changes. */
export function withExpectedFields<T extends { id: number }>(data: T, previous: object) {
    const original = previous as Record<string, unknown>
    return {
        ...data, expectedFields: Object.fromEntries(Object.entries(data)
            .filter(([ key, value ]) => key !== 'id' && value !== undefined && !key.startsWith('contentDraft'))
            .map(([ key ]) => [ key, original[key] ]))
    }
}

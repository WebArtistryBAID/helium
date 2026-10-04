type PuckComponent = {
    type?: unknown
    props?: {
        id?: unknown
        [key: string]: unknown
    }
}

export function collectPuckComponentIds(value: unknown): Set<string> {
    const ids = new Set<string>()
    const visited = new Set<object>()

    function visit(current: unknown) {
        if (current == null || typeof current !== 'object' || visited.has(current)) return
        visited.add(current)

        if (Array.isArray(current)) {
            current.forEach(visit)
            return
        }

        const possibleComponent = current as PuckComponent
        if (typeof possibleComponent.type === 'string' && typeof possibleComponent.props?.id === 'string') {
            ids.add(possibleComponent.props.id)
        }

        Object.values(current).forEach(visit)
    }

    visit(value)
    return ids
}


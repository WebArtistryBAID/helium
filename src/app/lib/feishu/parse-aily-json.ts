function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseAilyJson(raw: string): Record<string, unknown> {
    let source = raw.trim()
    for (let depth = 0; depth < 3; depth++) {
        let value: unknown
        try { value = JSON.parse(source) } catch { break }
        if (isObject(value)) return value
        if (typeof value !== 'string') throw new Error('Invalid JSON')
        source = value.trim()
    }

    const candidates: Record<string, unknown>[] = []
    for (let start = 0; start < source.length; start++) {
        if (source[start] !== '{' && source[start] !== '[') continue
        const stack: string[] = []
        let quoted = false
        let escaped = false
        let end = start
        for (; end < source.length; end++) {
            const char = source[end]
            if (quoted) {
                if (escaped) escaped = false
                else if (char === '\\') escaped = true
                else if (char === '"') quoted = false
                continue
            }
            if (char === '"') quoted = true
            else if (char === '{' || char === '[') stack.push(char)
            else if (char === '}' || char === ']') {
                const expected = char === '}' ? '{' : '['
                if (stack.pop() !== expected) throw new Error('Mismatched brackets')
                if (stack.length === 0) {
                    try {
                        const value: unknown = JSON.parse(source.slice(start, end + 1))
                        if (isObject(value)) candidates.push(value)
                    } catch {
                    }
                    break
                }
            }
        }
        start = end
    }
    if (candidates.length > 1) throw new Error('Multiple JSON objects')
    if (candidates.length === 0) throw new Error('Lack of valid JSON object')
    return candidates[0]
}

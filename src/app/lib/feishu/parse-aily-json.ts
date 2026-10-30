function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// I really hate it, but Feishu Aily often returns malformed JSON, NO MATTER how I instruct it,
// and Feishu Aily doesn't offer a structured output option, so I can only be really lenient here
function repairStrings(source: string, offsets?: number[]): string {
    let result = ''
    let quoted = false
    let escaped = false
    for (let index = 0; index < source.length; index++) {
        const char = source[index]
        const previousLength = result.length
        if (!quoted) {
            if (char === '"') quoted = true
            result += char
        } else if (escaped) {
            result += char
            escaped = false
        } else if (char === '\\') {
            result += char
            escaped = true
        } else if (char === '"') {
            const rest = source.slice(index + 1)
            const closes = /^\s*(?::|[}\]]|$)/.test(rest)
                || /^\s*,\s*(?:"(?:[^"\\]|\\.)*"\s*:|[}\]])/.test(rest)
            result += closes ? char : '\\"'
            if (closes) quoted = false
        } else {
            result += char === '\n' ? '\\n' : char === '\r' ? '\\r' : char === '\t' ? '\\t' : char
        }
        if (offsets) {
            for (let added = previousLength; added < result.length; added++) offsets[added] = index
        }
    }
    return result
}

function decode(source: string): unknown {
    try {
        return JSON.parse(source)
    } catch (error) {
        try {
            return JSON.parse(repairStrings(source))
        } catch {
            throw error
        }
    }
}

export function parseAilyJson(raw: string): Record<string, unknown> {
    return parseResponse(raw, 0)
}

function parseResponse(raw: string, depth: number): Record<string, unknown> {
    if (depth >= 10) throw new Error('AI JSON response exceeds the maximum nesting depth')
    const source = raw.trim()
    let value: unknown
    try {
        value = decode(source)
    } catch {
    }
    if (typeof value === 'string') return parseResponse(value, depth + 1)
    if (isObject(value)) {
        // Aily sometimes wraps the entire response in a string
        if (Object.keys(value).length === 1 && typeof value.content === 'string') {
            return parseResponse(value.content, depth + 1)
        }
        return value
    }

    const candidates: Record<string, unknown>[] = []
    for (let start = 0; start < source.length; start++) {
        if (source[start] !== '{') continue
        let matchedEnd: number | undefined
        const offsets: number[] = []
        const original = source.slice(start)
        for (const extracted of [ original, repairStrings(original, offsets) ]) {
            const stack: string[] = []
            let quoted = false
            let escaped = false
            for (let end = 0; end < extracted.length; end++) {
                const char = extracted[end]
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
                    if (stack.pop() !== expected) break
                    if (stack.length === 0) {
                        try {
                            const candidate: unknown = JSON.parse(extracted.slice(0, end + 1))
                            if (isObject(candidate)) {
                                candidates.push(candidate)
                                matchedEnd = start + (extracted === original ? end : offsets[end])
                            }
                        } catch { /* Continue with recovery or the next opening brace. */
                        }
                        break
                    }
                }
            }
            if (matchedEnd !== undefined) break
        }
        if (matchedEnd !== undefined) start = matchedEnd
    }
    if (candidates.length > 1) throw new Error('Multiple JSON objects in AI response')
    if (candidates.length === 0) throw new Error('AI response contains malformed or incomplete JSON')
    return parseResponse(JSON.stringify(candidates[0]), depth + 1)
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Some Aily responses put literal quotation marks or line breaks in JSON strings.
// A closing quote must be followed by a JSON separator, key/value colon, or EOF.
function repairStrings(source: string): string {
    let result = ''
    let quoted = false
    let escaped = false
    for (let index = 0; index < source.length; index++) {
        const char = source[index]
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
    } catch { /* Look for fenced JSON or JSON surrounded by prose below. */
    }
    if (typeof value === 'string') return parseResponse(value, depth + 1)
    if (isObject(value)) {
        // Aily sometimes wraps the entire response in a content string.
        if (Object.keys(value).length === 1 && typeof value.content === 'string') {
            return parseResponse(value.content, depth + 1)
        }
        return value
    }

    const candidates: Record<string, unknown>[] = []
    // Repair only after strict decoding failed, so valid article text stays intact.
    for (const extracted of [ source, repairStrings(source) ]) {
        for (let start = 0; start < extracted.length; start++) {
            if (extracted[start] !== '{' && extracted[start] !== '[') continue
            const stack: string[] = []
            let quoted = false
            let escaped = false
            let end = start
            for (; end < extracted.length; end++) {
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
                    if (stack.pop() !== expected) throw new Error('Mismatched brackets in AI JSON response')
                    if (stack.length === 0) {
                        try {
                            const candidate: unknown = JSON.parse(extracted.slice(start, end + 1))
                            if (isObject(candidate)) candidates.push(candidate)
                        } catch { /* Keep looking for a complete object. */
                        }
                        break
                    }
                }
            }
            start = end
        }
        if (candidates.length > 0) break
    }
    if (candidates.length > 1) throw new Error('Multiple JSON objects in AI response')
    if (candidates.length === 0) throw new Error('AI response contains malformed or incomplete JSON')
    return parseResponse(JSON.stringify(candidates[0]), depth + 1)
}

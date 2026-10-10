import type { WeChatDebugEntry } from '@/app/studio/editor/entity-types'

export type SyncDebugLogger = (event: string, details?: unknown) => void

const MAX_LOG_ENTRIES = 250
const MAX_ENTRY_LENGTH = 16_000
const MAX_LOG_LENGTH = 1_000_000
const SECRET_KEY = /^(?:authorization|(?:set-)?cookie|password|.*secret|.*token)$/i

function redactText(value: string): string {
    let text = value
    for (const secret of [ process.env.FEISHU_AI_CLIENT_SECRET, process.env.FEISHU_APP_SECRET ]) {
        if (secret) text = text.split(secret).join('[REDACTED]')
    }
    return text.replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [REDACTED]')
        .replace(/(\b(?:[\w-]*token|[\w-]*secret|password|authorization|(?:set-)?cookie)["']?\s*[:=]\s*)(["'])(.*?)\2/gi, '$1$2[REDACTED]$2')
        .replace(/([?&](?:[\w-]*token|[\w-]*secret|password)=)[^&\s"'<>]+/gi, '$1[REDACTED]')
}

function formatDetails(details: unknown): string {
    const seen = new WeakSet<object>()
    return JSON.stringify(details, (key, value) => {
        if (SECRET_KEY.test(key)) return '[REDACTED]'
        if (typeof value === 'string') return redactText(value)
        if (typeof value === 'bigint') return value.toString()
        if (value && typeof value === 'object') {
            if (seen.has(value)) return '[Circular]'
            seen.add(value)
        }
        if (value instanceof Error) return {
            name: value.name, message: value.message, stack: value.stack, cause: value.cause,
            errors: value instanceof AggregateError ? value.errors : undefined
        }
        return value
    }, 2) ?? ''
}

export function createWeChatDebugLogger(task: {
    id: string
    status: string
    debug: boolean
    logs: WeChatDebugEntry[]
}): SyncDebugLogger {
    return (event, details) => {
        if (!task.debug) return
        const text = formatDetails(details)
        const entry: WeChatDebugEntry = {
            timestamp: Date.now(), stage: task.status, event,
            details: text.length > MAX_ENTRY_LENGTH
                ? `${text.slice(0, MAX_ENTRY_LENGTH)}\n[界面日志已截断，完整内容见服务器日志。]`
                : text
        }
        console.debug(`[WeChat ${task.id}] ${new Date(entry.timestamp).toISOString()} [${entry.stage}] ${event}\n${text}`)
        task.logs.push(entry)
        let length = task.logs.reduce((total, item) => total + item.details.length, 0)
        while (task.logs.length > MAX_LOG_ENTRIES || length > MAX_LOG_LENGTH) {
            length -= task.logs.shift()!.details.length
        }
    }
}

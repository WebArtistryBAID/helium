import type { ComponentConfig } from '@puckeditor/core'

type Resolver = NonNullable<ComponentConfig['resolveData']>
type PendingResolution = {
    args: Parameters<Resolver>
    version: number
    promise?: Promise<Awaited<ReturnType<Resolver>>>
}

export function coalesceResolver(resolve: Resolver): Resolver {
    const pending = new Map<string, PendingResolution>()
    return (...args) => {
        const id = args[0].props.id ?? 'root'
        const entry = pending.get(id)
        if (entry) {
            entry.args = args
            entry.version++
            return entry.promise!
        }
        const next: PendingResolution = { args, version: 0 }
        pending.set(id, next)
        next.promise = (async () => {
            try {
                let result: Awaited<ReturnType<Resolver>>
                let version: number
                do {
                    version = next.version
                    const current = next.args
                    result = await resolve(...current)
                } while (version !== next.version)
                // Puck merges results into the input captured before awaiting. Include
                // the latest raw props so an earlier caller cannot replay older typing.
                return { ...result, props: { ...next.args[0].props, ...result.props } }
            } finally {
                pending.delete(id)
            }
        })()
        return next.promise
    }
}


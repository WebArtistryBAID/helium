import type { Config } from '@puckeditor/core'
import { clearPuckResources } from './resolve-resources'

import { coalesceResolver } from './coalesce-resolver'

export function createEditorConfig(config: Config): Config {
    clearPuckResources()
    return {
        ...config,
        components: Object.fromEntries(Object.entries(config.components).map(([ name, component ]) => [ name, {
            ...component,
            ...(component.resolveData ? { resolveData: coalesceResolver(component.resolveData) } : {})
        } ]))
    }
}

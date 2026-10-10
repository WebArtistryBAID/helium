import type { ComponentData, Data } from '@puckeditor/core'
import { createClientId } from '@/app/lib/client-id'
import { PUCK_COMPONENT_TYPES } from './puck-component-types'

export const COMPONENT_CLIPBOARD_FORMAT = 'helium-puck-component-v1'

type Bundle = { format: string; component: ComponentData; zones: Record<string, ComponentData[]> }

export function isComponentClipboard(text: string): boolean {
    try {
        const value = JSON.parse(text)
        return value?.format === COMPONENT_CLIPBOARD_FORMAT
    } catch {
        return false
    }
}

function visitComponents(value: unknown, visit: (component: ComponentData) => void) {
    if (Array.isArray(value)) value.forEach(child => visitComponents(child, visit))
    else if (value && typeof value === 'object') {
        if (Object.keys(value).some(key => [ '__proto__', 'prototype', 'constructor' ].includes(key))) {
            throw new Error('组件内容包含无效属性。')
        }
        const component = value as ComponentData
        if (typeof component.type === 'string' && typeof component.props?.id === 'string') visit(component)
        Object.values(value).forEach(child => visitComponents(child, visit))
    }
}

export function copyComponent(data: Data, component: ComponentData): string {
    const zones: Record<string, ComponentData[]> = {}
    const collect = (item: ComponentData) => {
        for (const [ key, children ] of Object.entries(data.zones ?? {})) {
            if (!key.startsWith(`${item.props.id}:`) || Object.hasOwn(zones, key)) continue
            zones[key] = children
            visitComponents(children, collect)
        }
    }
    visitComponents(component, collect)
    return JSON.stringify({ format: COMPONENT_CLIPBOARD_FORMAT, component, zones })
}

export function pasteComponent(text: string, data: Data, selector?: { zone: string; index: number }) {
    const bundle = JSON.parse(text) as Bundle
    if (bundle?.format !== COMPONENT_CLIPBOARD_FORMAT || !bundle.component || !bundle.zones || Array.isArray(bundle.zones)) {
        throw new Error('请先复制一个 Puck 组件。')
    }
    const ids = new Map<string, string>()
    const validate = (component: ComponentData) => {
        if (!PUCK_COMPONENT_TYPES.includes(component.type as typeof PUCK_COMPONENT_TYPES[number]) || !component.props.id || ids.has(component.props.id)) {
            throw new Error('组件类型或组件 ID 无效。')
        }
        ids.set(component.props.id, `${component.type}-${createClientId()}`)
    }
    visitComponents(bundle.component, validate)
    Object.values(bundle.zones).forEach(children => {
        if (!Array.isArray(children)) throw new Error('组件内容无效。')
        visitComponents(children, validate)
    })
    if (!ids.has(bundle.component.props?.id)) throw new Error('组件内容无效。')
    visitComponents(bundle.component, component => {
        component.props.id = ids.get(component.props.id)!
    })
    Object.values(bundle.zones).forEach(children => visitComponents(children, component => {
        component.props.id = ids.get(component.props.id)!
    }))
    const next = structuredClone(data)
    next.zones ??= {}
    for (const [ key, children ] of Object.entries(bundle.zones)) {
        const separator = key.indexOf(':')
        const parent = ids.get(key.slice(0, separator))
        if (!parent) throw new Error('组件容器无效。')
        next.zones[`${parent}${key.slice(separator)}`] = children
    }
    let destination = next.content
    if (selector && selector.zone !== 'root:default-zone') {
        destination = next.zones[selector.zone]
        if (!destination) {
            const separator = selector.zone.indexOf(':')
            const parentId = selector.zone.slice(0, separator)
            const prop = selector.zone.slice(separator + 1)
            visitComponents(next, component => {
                if (component.props.id === parentId && Array.isArray(component.props[prop])) destination = component.props[prop]
            })
        }
        if (!destination) throw new Error('请选择粘贴位置。')
    }
    destination.splice(selector ? selector.index + 1 : destination.length, 0, bundle.component)
    return { data: next, ids: [ ...ids.values() ], id: bundle.component.props.id }
}

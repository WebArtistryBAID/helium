import type { Data } from '@puckeditor/core'
import * as Y from 'yjs'

export const PUCK_YJS_DATA_KEY = 'data'
const COMPONENT_COLLECTION = '__puckComponentCollection'
const COMPONENT_ITEMS = 'items'
const COMPONENT_ORDER = 'order'

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
    return value != null && typeof value === 'object' && !Array.isArray(value)
}

function componentId(value: unknown): string | null {
    if (!isRecord(value) || !isRecord(value.props)) return null
    return typeof value.props.id === 'string' ? value.props.id : null
}

function isComponentArray(value: unknown): value is JsonRecord[] {
    return Array.isArray(value) && value.length > 0 && value.every(item => componentId(item) != null)
}

function isComponentCollection(value: unknown): value is Y.Map<unknown> {
    return value instanceof Y.Map && value.get(COMPONENT_COLLECTION) === true
}

function componentCollectionToY(values: JsonRecord[]): Y.Map<unknown> {
    const collection = new Y.Map<unknown>()
    const order = new Y.Array<string>()
    const items = new Y.Map<unknown>()
    order.insert(0, values.map(value => componentId(value)!))
    for (const value of values) items.set(componentId(value)!, toYValue(value))
    collection.set(COMPONENT_COLLECTION, true)
    collection.set(COMPONENT_ORDER, order)
    collection.set(COMPONENT_ITEMS, items)
    return collection
}

function toYValue(value: unknown): unknown {
    if (typeof value === 'string') {
        const text = new Y.Text()
        text.insert(0, value)
        return text
    }
    if (isComponentArray(value)) return componentCollectionToY(value)
    if (Array.isArray(value)) {
        const array = new Y.Array<unknown>()
        array.insert(0, value.map(toYValue))
        return array
    }
    if (isRecord(value)) {
        const map = new Y.Map<unknown>()
        for (const [ key, child ] of Object.entries(value)) map.set(key, toYValue(child))
        return map
    }
    return value ?? null
}

function fromYValue(value: unknown): unknown {
    if (value instanceof Y.Text) return value.toString()
    if (value instanceof Y.Array) return value.toArray().map(fromYValue)
    if (isComponentCollection(value)) {
        const order = value.get(COMPONENT_ORDER) as Y.Array<string>
        const items = value.get(COMPONENT_ITEMS) as Y.Map<unknown>
        return order.toArray().flatMap(id => items.has(id) ? [ fromYValue(items.get(id)) ] : [])
    }
    if (value instanceof Y.Map) {
        return Object.fromEntries(Array.from(value.entries(), ([ key, child ]) => [ key, fromYValue(child) ]))
    }
    return value
}

function reconcileText(text: Y.Text, value: string) {
    const current = text.toString()
    if (current === value) return

    let prefix = 0
    while (prefix < current.length && prefix < value.length && current[prefix] === value[prefix]) prefix++
    let suffix = 0
    while (suffix < current.length - prefix && suffix < value.length - prefix &&
    current[current.length - 1 - suffix] === value[value.length - 1 - suffix]) suffix++

    const removeCount = current.length - prefix - suffix
    if (removeCount > 0) text.delete(prefix, removeCount)
    const inserted = value.slice(prefix, value.length - suffix)
    if (inserted.length > 0) text.insert(prefix, inserted)
}

function reconcileOrder(target: Y.Array<string>, values: string[]) {
    const current = target.toArray()
    let prefix = 0
    while (prefix < current.length && prefix < values.length && current[prefix] === values[prefix]) prefix++
    let suffix = 0
    while (suffix < current.length - prefix && suffix < values.length - prefix &&
    current[current.length - 1 - suffix] === values[values.length - 1 - suffix]) suffix++
    const removeCount = current.length - prefix - suffix
    if (removeCount > 0) target.delete(prefix, removeCount)
    const inserted = values.slice(prefix, values.length - suffix)
    if (inserted.length > 0) target.insert(prefix, inserted)
}

function reconcileComponentCollection(target: Y.Map<unknown>, values: JsonRecord[]) {
    const order = target.get(COMPONENT_ORDER) as Y.Array<string>
    const items = target.get(COMPONENT_ITEMS) as Y.Map<unknown>
    const ids = values.map(value => componentId(value)!)
    for (const id of Array.from(items.keys())) {
        if (!ids.includes(id)) items.delete(id)
    }
    for (const value of values) {
        const id = componentId(value)!
        const current = items.get(id)
        if (current === undefined || !reconcileYValue(current, value)) items.set(id, toYValue(value))
    }
    reconcileOrder(order, ids)
}

function reconcileArray(target: Y.Array<unknown>, values: unknown[]) {
    const current = target.toArray()
    if (current.length !== values.length) {
        let prefix = 0
        while (prefix < current.length && prefix < values.length &&
        JSON.stringify(fromYValue(current[prefix])) === JSON.stringify(values[prefix])) prefix++
        let suffix = 0
        while (suffix < current.length - prefix && suffix < values.length - prefix &&
        JSON.stringify(fromYValue(current[current.length - 1 - suffix])) ===
        JSON.stringify(values[values.length - 1 - suffix])) suffix++
        const removeCount = current.length - prefix - suffix
        if (removeCount > 0) target.delete(prefix, removeCount)
        const inserted = values.slice(prefix, values.length - suffix)
        if (inserted.length > 0) target.insert(prefix, inserted.map(toYValue))
    }

    for (let index = 0; index < values.length; index++) {
        const currentValue = target.get(index)
        if (!reconcileYValue(currentValue, values[index])) {
            target.delete(index, 1)
            target.insert(index, [ toYValue(values[index]) ])
        }
    }
}

function reconcileMap(target: Y.Map<unknown>, value: JsonRecord) {
    for (const key of Array.from(target.keys())) {
        if (!(key in value)) target.delete(key)
    }
    for (const [ key, child ] of Object.entries(value)) {
        const current = target.get(key)
        if (current === undefined || !reconcileYValue(current, child)) target.set(key, toYValue(child))
    }
}

function reconcileYValue(current: unknown, value: unknown): boolean {
    if (current instanceof Y.Text && typeof value === 'string') {
        reconcileText(current, value)
        return true
    }
    if (current instanceof Y.Array && isComponentArray(value)) return false
    if (current instanceof Y.Array && Array.isArray(value)) {
        reconcileArray(current, value)
        return true
    }
    if (isComponentCollection(current) && Array.isArray(value) && value.every(item => componentId(item) != null)) {
        reconcileComponentCollection(current, value as JsonRecord[])
        return true
    }
    if (current instanceof Y.Map && isRecord(value)) {
        reconcileMap(current, value)
        return true
    }
    return Object.is(current, value ?? null)
}

export function initializePuckYjsDocument(document: Y.Doc, data: Data) {
    const root = document.getMap<unknown>(PUCK_YJS_DATA_KEY)
    document.transact(() => reconcileMap(root, data as unknown as JsonRecord), 'puck-initialize')
}

export function updatePuckYjsDocument(document: Y.Doc, data: Data, origin: unknown) {
    const root = document.getMap<unknown>(PUCK_YJS_DATA_KEY)
    document.transact(() => reconcileMap(root, data as unknown as JsonRecord), origin)
}

export function readPuckYjsDocument(document: Y.Doc): Data {
    return fromYValue(document.getMap(PUCK_YJS_DATA_KEY)) as Data
}

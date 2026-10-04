import { PUCK_COMPONENT_TYPES } from '../src/app/lib/puck/puck-component-types.ts'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import * as Y from 'yjs'
import { slateNodesToInsertDelta, yTextToSlateElement } from '@slate-yjs/core'

export const revisionOf = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const record = value => value != null && typeof value === 'object' && !Array.isArray(value)
const idOf = (node, editor) => editor === 'plate' ? node?.id : node?.props?.id
const unsafe = key => [ '__proto__', 'prototype', 'constructor' ].includes(key)
const fail = (code, message, current) => {
    throw Object.assign(new Error(message), { code, current })
}

/** Find stable IDs within editor collections; each ID must occur exactly once. */
function collections(data, editor) {
    const result = []
    if (editor === 'plate') {
        const visit = (items, parentId) => {
            result.push({ items, parentId })
            for (const node of items) if (Array.isArray(node.children)) visit(node.children, node.id ?? null)
        }
        visit(data, null)
    } else {
        result.push({ items: data.content, parentId: null })
        for (const [ zone, items ] of Object.entries(data.zones)) result.push({ items, parentId: zone })
        const visit = component => {
            if (component.type === 'ContainerConfig' && Array.isArray(component.props?.children)) {
                const items = component.props.children
                result.push({ items, parentId: `@slot:${component.props.id}:children` })
                items.forEach(visit)
            }
        }
        for (const items of [ data.content, ...Object.values(data.zones) ]) items.forEach(visit)
    }
    return result
}

function locate(data, editor, id) {
    if (editor === 'puck' && id === '$root') return { node: data.root, items: null, index: null }

    const matches = collections(data, editor).flatMap(collection => collection.items.flatMap((node, index) =>
        idOf(node, editor) === id ? [ { ...collection, node, index } ] : []))
    if (matches.length !== 1) fail('conflict', 'The target ID must identify exactly one current node.')
    return matches[0]
}

function parent(data, editor, id) {
    // null always identifies the document root. Nested Plate parents require stable IDs.
    if (editor === 'plate' && id != null) {
        const target = locate(data, editor, id)
        if (!Array.isArray(target.node.children)) fail('invalid_input', 'Parent must be an element.')
        return target.node.children
    }
    const matches = collections(data, editor).filter(collection => collection.parentId === id)
    if (!matches.length) fail('conflict', 'The destination collection has changed.')
    return matches[0].items
}

function position(items, editor, beforeId) {
    if (beforeId == null) return items.length
    const index = items.findIndex(node => idOf(node, editor) === beforeId)
    if (index < 0) fail('conflict', 'The insertion anchor has changed.')
    return index
}

export function validateEditorDocument(data, editor) {
    const safe = value => {
        if (value == null || typeof value !== 'object') return
        for (const [ key, child ] of Object.entries(value)) {
            if (unsafe(key)) fail('invalid_input', 'Unsafe JSON property.')
            safe(child)
        }
    }
    safe(data)
    const ids = new Set()
    const node = value => {
        if (!record(value)) fail('invalid_input', 'Editor nodes must be objects.')
        for (const key of Object.keys(value)) if (unsafe(key)) fail('invalid_input', 'Unsafe property path.')
        if (editor === 'plate') {
            if (typeof value.text === 'string') return
            if (typeof value.type !== 'string' || !Array.isArray(value.children) || !value.children.length) {
                fail('invalid_input', 'Plate elements require a type and child nodes.')
            }
            value.children.forEach(node)
        } else {
            if (!PUCK_COMPONENT_TYPES.includes(value.type)) {
                fail('invalid_input', `Unsupported Puck component type: ${String(value.type)}.`)
            }
            if (!record(value.props) || typeof value.props.id !== 'string' || value.props.id === '$root') {
                fail('invalid_input', 'Puck components require a stable props.id.')
            }
        }
        if (editor === 'puck' && value.type === 'ContainerConfig' && value.props.children != null) {
            if (!Array.isArray(value.props.children)) fail('invalid_input', 'Container slot must contain components.')
            value.props.children.forEach(node)
        }
        const id = idOf(value, editor)
        if (id != null) {
            if (typeof id !== 'string' || !id.length || ids.has(id)) fail('invalid_input', 'Editor IDs must be unique.')
            ids.add(id)
        }
    }
    if (editor === 'plate') {
        if (!Array.isArray(data) || !data.length) fail('invalid_input', 'Plate requires at least one block.')
        for (const block of data) {
            if (typeof block?.type !== 'string') fail('invalid_input', 'Plate root items must be elements.')
            node(block)
        }
    } else {
        if (!record(data) || !Array.isArray(data.content) || !record(data.root?.props) || (data.root.props.title != null && typeof data.root.props.title !== 'string') || !record(data.zones)) {
            fail('invalid_input', 'Invalid Puck document.')
        }
        data.content.forEach(node)
        for (const items of Object.values(data.zones)) {
            if (!Array.isArray(items)) fail('invalid_input', 'Puck zones must contain component arrays.')
            items.forEach(node)
        }
    }
}

export function planEditorCommands(current, editor, commands) {
    const data = structuredClone(current)
    validateEditorDocument(data, editor)
    for (const command of commands) {
        let target
        if ('targetId' in command) target = locate(data, editor, command.targetId)
        if (command.operation === 'set_property') {
            let object = target.node
            const path = command.path
            if (!path.length || path.some(unsafe) || path.includes('id') || path.includes('type')) {
                fail('invalid_input', 'Identity and component type changes require replacement.')
            }
            for (const key of path.slice(0, -1)) {
                if (!record(object) && !Array.isArray(object)) fail('invalid_input', 'Property parent is missing.')
                if (!Object.hasOwn(object, key)) fail('invalid_input', 'Property parent is missing.')
                object = object[key]
            }
            const key = path.at(-1)
            if (!record(object) && !Array.isArray(object)) fail('invalid_input', 'Property parent is missing.')
            if (!isDeepStrictEqual(Object.hasOwn(object, key) ? object[key] : null, command.expected)) fail('conflict', 'The property has changed.', object[key] ?? null)
            object[key] = structuredClone(command.value)
        } else {
            if (target?.items === null) fail('invalid_input', 'Puck root supports property edits.')
            if (target && !isDeepStrictEqual(target.node, command.expected)) fail('conflict', 'The target node has changed.', target.node)
            if (command.operation === 'replace') {
                if (idOf(command.value, editor) !== command.targetId) fail('invalid_input', 'Replacement must preserve its stable ID.')
                target.items[target.index] = structuredClone(command.value)
            } else if (command.operation === 'remove') target.items.splice(target.index, 1)
            else {
                const items = parent(data, editor, command.parentId)
                if (revisionOf(items) !== command.expectedParentRevision) fail('conflict', 'The destination collection has changed.', items)
                if (command.operation === 'move') {
                    if (command.beforeId === command.targetId) fail('invalid_input', 'A move requires a different anchor.')
                    const containsParent = node => (idOf(node, editor) === command.parentId ||
                            (editor === 'puck' && command.parentId === `@slot:${idOf(node, editor)}:children`)) ||
                        (Array.isArray(node.children) && node.children.some(containsParent)) ||
                        (Array.isArray(node.props?.children) && node.props.children.some(containsParent))
                    if (command.parentId && containsParent(target.node)) fail('invalid_input', 'Move would create a cycle.')
                    target.items.splice(target.index, 1)
                }
                items.splice(position(items, editor, command.beforeId), 0,
                    structuredClone(command.operation === 'move' ? target.node : command.value))
            }
        }
        validateEditorDocument(data, editor)
    }
    return data
}

export function readPlateDocument(document) {
    return yTextToSlateElement(document.get('content', Y.XmlText)).children
}

/** Preserve every unchanged top-level Yjs block, including its cursor anchors. */
export function applyPlateDocument(document, value) {
    const root = document.get('content', Y.XmlText)
    const current = readPlateDocument(document)
    const working = [ ...current ]
    for (let index = 0; index < value.length; index++) {
        const desired = value[index]
        if (isDeepStrictEqual(working[index], desired)) continue
        if (desired.id != null && working[index]?.id === desired.id) {
            root.delete(index, 1)
            working.splice(index, 1)
        } else {
            const later = working.findIndex((node, position) => position > index &&
                (desired.id != null ? node.id === desired.id : isDeepStrictEqual(node, desired)))
            if (later >= 0) {
                root.delete(later, 1)
                working.splice(later, 1)
            }
        }
        root.applyDelta([ { retain: index }, ...slateNodesToInsertDelta([ desired ]) ])
        working.splice(index, 0, desired)
    }
    if (working.length > value.length) root.delete(value.length, working.length - value.length)
}

export function describeEditorDocument(data, editor) {
    return {
        document: data, revision: revisionOf(data), ...(editor === 'puck' ? { rootTargetId: '$root' } : {}),
        collections: collections(data, editor).filter(({ parentId }, index) => index === 0 || parentId != null)
            .map(({ parentId, items }) => ({
                parentId,
                revision: revisionOf(items),
                targetIds: items.map(node => idOf(node, editor) ?? null)
            }))
    }
}

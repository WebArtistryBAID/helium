'use client'

import { useLayoutEffect, useRef } from 'react'
import { createUsePuck } from '@puckeditor/core'

const usePuckSelector = createUsePuck()

type StableInlineTextProps = {
    componentId: string
    disableLineBreaks?: boolean
    isReadOnly: boolean
    propPath: string
    value: string
}

function setValueAtPath(source: Record<string, unknown>, path: string, nextValue: string): Record<string, unknown> {
    const parts = path.replace(/\[(\d+)]/g, '.$1').split('.')

    function update(current: unknown, index: number): unknown {
        const key = parts[index]!
        const container = Array.isArray(current) ? [ ...current ] : { ...(current as Record<string, unknown> ?? {}) }

        if (index === parts.length - 1) {
            container[key as never] = nextValue as never
            return container
        }

        const nextKey = parts[index + 1]!
        const child = (current as Record<string, unknown> | undefined)?.[key]
            ?? (Number.isInteger(Number(nextKey)) ? [] : {})
        container[key as never] = update(child, index + 1) as never
        return container
    }

    return update(source, 0) as Record<string, unknown>
}

export default function StableInlineText({
                                             componentId,
                                             disableLineBreaks = false,
                                             isReadOnly,
                                             propPath,
                                             value
                                         }: StableInlineTextProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const isComposing = useRef(false)
    const dispatch = usePuckSelector(state => state.dispatch)
    const getItemById = usePuckSelector(state => state.getItemById)
    const getSelectorForId = usePuckSelector(state => state.getSelectorForId)

    // Do not rewrite an active editable node. Replacing its children resets the browser selection,
    // which is especially noticeable when an older asynchronous update arrives after a keystroke.
    useLayoutEffect(() => {
        const element = ref.current
        // The canvas lives in an iframe; the host document's active element is the iframe.
        if (element != null && element.ownerDocument.activeElement !== element && element.innerText !== value) {
            element.replaceChildren(value)
        }
    }, [ value ])

    function commit(nextValue: string) {
        if (isReadOnly) return
        if (disableLineBreaks) nextValue = nextValue.replaceAll(/\n/gm, '')
        const item = getItemById(componentId)
        if (item == null) return

        const props = setValueAtPath(item.props as Record<string, unknown>, propPath, nextValue) as typeof item.props

        if (componentId === 'root') {
            dispatch({
                type: 'replaceRoot',
                root: {
                    ...item,
                    props
                }
            })
            return
        }

        const selector = getSelectorForId(componentId)
        if (selector?.zone == null) return

        dispatch({
            type: 'replace',
            data: {
                ...item,
                props
            },
            destinationIndex: selector.index,
            destinationZone: selector.zone
        })
    }

    function selectComponent() {
        dispatch({ type: 'setUi', ui: { itemSelector: getSelectorForId(componentId) ?? null } })
    }

    return <span
        ref={ref}
        contentEditable={isReadOnly ? false : 'plaintext-only'}
        data-puck-overlay-portal="true"
        role={isReadOnly ? undefined : 'textbox'}
        aria-multiline={!disableLineBreaks}
        style={{
            display: 'inline-block',
            minWidth: '1ch',
            minHeight: '1em',
            whiteSpace: 'pre-wrap',
            textDecoration: 'inherit',
            cursor: isReadOnly ? undefined : 'text',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            caretColor: 'auto'
        }}
        suppressContentEditableWarning
        onClickCapture={event => {
            event.stopPropagation()
            selectComponent()
        }}
        onFocus={selectComponent}
        onCompositionStart={() => {
            isComposing.current = true
        }}
        onCompositionEnd={event => {
            isComposing.current = false
            commit(event.currentTarget.innerText)
        }}
        onInput={event => {
            event.stopPropagation()
            if (!isComposing.current) commit(event.currentTarget.innerText)
        }}
        onKeyDown={event => {
            event.stopPropagation()
            if (isReadOnly || (disableLineBreaks && event.key === 'Enter')) event.preventDefault()
        }}
        onKeyUp={event => event.stopPropagation()}
        onMouseOverCapture={event => event.stopPropagation()}
        onPointerDownCapture={event => {
            // Preserve the browser's caret placement while keeping the first click out of DnD.
            if (!isReadOnly) event.stopPropagation()
        }}
    />
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { usePuck } from '@measured/puck'

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
    const [ isHovering, setIsHovering ] = useState(false)
    const [ isFocused, setIsFocused ] = useState(false)
    const { dispatch, getItemById, getSelectorForId } = usePuck()

    // Do not rewrite an active editable node. Replacing its children resets the browser selection,
    // which is especially noticeable when an older asynchronous update arrives after a keystroke.
    useEffect(() => {
        if (ref.current != null && document.activeElement !== ref.current && ref.current.innerText !== value) {
            ref.current.replaceChildren(value)
        }
    }, [ value ])

    function commit(nextValue: string) {
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

    return <span
        ref={ref}
        contentEditable={!isReadOnly && (isHovering || isFocused) ? 'plaintext-only' : false}
        data-puck-overlay-portal="true"
        suppressContentEditableWarning
        onBlur={() => setIsFocused(false)}
        onClick={event => {
            event.preventDefault()
            event.stopPropagation()
        }}
        onClickCapture={event => {
            event.preventDefault()
            event.stopPropagation()
            dispatch({ type: 'setUi', ui: { itemSelector: getSelectorForId(componentId) ?? null } })
        }}
        onFocus={() => setIsFocused(true)}
        onInput={event => {
            let nextValue = event.currentTarget.innerText
            if (disableLineBreaks) nextValue = nextValue.replaceAll(/\n/gm, '')
            commit(nextValue)
        }}
        onKeyDown={event => {
            event.stopPropagation()
            if (isReadOnly || (disableLineBreaks && event.key === 'Enter')) event.preventDefault()
        }}
        onKeyUp={event => event.stopPropagation()}
        onMouseOutCapture={() => setIsHovering(false)}
        onMouseOverCapture={event => {
            event.stopPropagation()
            setIsHovering(true)
        }}
        onPointerDownCapture={event => {
            if (isFocused) event.stopPropagation()
        }}
    />
}

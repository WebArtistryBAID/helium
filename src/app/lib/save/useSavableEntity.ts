'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SaveFn<T> = (draft: T) => Promise<T>
type RefreshFn<T> = () => Promise<T>
type EqualsFn<T> = (a: T, b: T) => boolean

export type UseSavableEntityOptions<T> = {
    initial: T
    saveFn: SaveFn<T>
    refreshFn: RefreshFn<T>
    compareKeys?: string[]
    equals?: EqualsFn<T>
}

export type UseSavableEntityReturn<T> = {
    draft: T
    setDraft: React.Dispatch<React.SetStateAction<T>>
    previous: T
    setPrevious: React.Dispatch<React.SetStateAction<T>>
    hasChanges: boolean
    loading: boolean
    save: () => Promise<void>
    refresh: () => Promise<void>
}

function getByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

function isDate(x: any): x is Date {
    return x instanceof Date
}

function eqVal(a: any, b: any): boolean {
    if (isDate(a) || isDate(b)) {
        const ax = isDate(a) ? a.getTime() : a
        const bx = isDate(b) ? b.getTime() : b
        return ax === bx
    }
    if (a === b) return true
    try {
        return JSON.stringify(a) === JSON.stringify(b)
    } catch {
        return a === b
    }
}

function compareByKeys<T>(a: T, b: T, keys: string[]): boolean {
    for (const k of keys) {
        if (!eqVal(getByPath(a as any, k), getByPath(b as any, k))) return false
    }
    return true
}

function deepClone<T>(v: T): T {
    return structuredClone(v)
}

export function useSavableEntity<T>(opts: UseSavableEntityOptions<T>): UseSavableEntityReturn<T> {
    const { initial, saveFn, refreshFn, compareKeys, equals } = opts

    const [ draft, setDraft ] = useState<T>(deepClone(initial))
    const [ previous, setPrevious ] = useState<T>(deepClone(initial))
    const [ loading, setLoading ] = useState(false)

    const saveFnRef = useRef(saveFn)
    const refreshFnRef = useRef(refreshFn)
    useEffect(() => {
        saveFnRef.current = saveFn
    }, [ saveFn ])
    useEffect(() => {
        refreshFnRef.current = refreshFn
    }, [ refreshFn ])

    useEffect(() => {
        // When the upstream provides a new initial object (e.g., refetched),
        // re-seed both draft and previous to that snapshot.
        setDraft(deepClone(initial))
        setPrevious(deepClone(initial))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ initial ])

    const hasChanges = useMemo(() => {
        if (equals) return !equals(previous, draft)
        if (compareKeys && compareKeys.length > 0) return !compareByKeys(previous, draft, compareKeys)
        try {
            return JSON.stringify(previous) !== JSON.stringify(draft)
        } catch {
            return previous !== draft
        }
    }, [ draft, previous, equals, compareKeys ])

    const mountedRef = useRef(true)
    useEffect(() => () => {
        mountedRef.current = false
    }, [])

    const save = useCallback(async () => {
        if (loading) return
        setLoading(true)
        try {
            const updated = await saveFnRef.current(draft)
            if (!mountedRef.current) return
            setDraft(updated)
            setPrevious(deepClone(updated))
        } finally {
            if (mountedRef.current) setLoading(false)
        }
    }, [ loading ])

    const refresh = useCallback(async () => {
        if (loading) return
        setLoading(true)
        try {
            const fresh = await refreshFnRef.current()
            if (!mountedRef.current) return
            setDraft(fresh)
            setPrevious(deepClone(fresh))
        } finally {
            if (mountedRef.current) setLoading(false)
        }
    }, [ loading ])

    return { draft, setDraft, previous, setPrevious, hasChanges, loading, save, refresh }
}

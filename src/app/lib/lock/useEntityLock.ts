'use client'

import { useEffect, useRef, useState } from 'react'
import { EntityType } from '@/generated/prisma/browser'
import { acquireLock, isLockAlive, releaseLock } from '@/app/lib/lock/lock-actions'

type UseEntityLockOpts = {
    entityType: EntityType
    entityId: number
    userId: number
    initialToken: string
    /** Whether there are unsaved changes (to show browser "leave?" prompt) */
    hasChanges?: boolean
    onLockLost?: () => void
    keepAliveIntervalMs?: number
    renewIntervalMs?: number
}

export function useEntityLock({
                                  entityType,
                                  entityId,
                                  userId,
                                  initialToken,
                                  hasChanges = false,
                                  onLockLost,
                                  keepAliveIntervalMs = 10_000,
                                  renewIntervalMs = 55_000
                              }: UseEntityLockOpts) {
    const [ token, setToken ] = useState(initialToken)
    const [ lockBroken, setLockBroken ] = useState(false)

    // Track latest values without re-wiring timers
    const refs = useRef({
        entityType,
        entityId,
        userId,
        token,
        hasChanges,
        onLockLost
    })
    refs.current = { ...refs.current, token, hasChanges, onLockLost }

    // Check-alive loop
    useEffect(() => {
        let cancelled = false

        const tick = async () => {
            const alive = await isLockAlive({
                entityType: refs.current.entityType,
                entityId: refs.current.entityId,
                userId: refs.current.userId
            })
            if (!alive && !cancelled) {
                setLockBroken(true)
                refs.current.onLockLost?.()
                if (timer) clearInterval(timer)
            }
        }

        // initial kick + interval
        tick().catch(() => {/* ignore */
        })
        const timer = setInterval(() => void tick(), keepAliveIntervalMs)

        return () => {
            cancelled = true
            if (timer) clearInterval(timer)
        }
    }, [ entityType, entityId, userId, keepAliveIntervalMs ])

    // Renew-lock loop
    useEffect(() => {
        let cancelled = false

        const tick = async () => {
            const newLock = await acquireLock({
                entityType: refs.current.entityType,
                entityId: refs.current.entityId,
                userId: refs.current.userId,
                currentToken: refs.current.token
            })
            if (!newLock && !cancelled) {
                setLockBroken(true)
                refs.current.onLockLost?.()
                if (timer) clearInterval(timer)
                return
            }
            if (!cancelled) setToken(newLock!.token)
        }

        // first renew after interval to avoid hammering on mount
        const timer = setInterval(() => void tick(), renewIntervalMs)

        return () => {
            cancelled = true
            if (timer) clearInterval(timer)
        }
    }, [ entityType, entityId, userId, renewIntervalMs ])

    // Fast release on tab/browser close (production only to avoid StrictMode dup)
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return

        const handleBeforeUnload = (e: Event) => {
            const { entityType, entityId, userId, token, hasChanges } = refs.current
            try {
                navigator.sendBeacon(
                    '/lib/lock/unlock',
                    JSON.stringify({ entityType, entityId, userId, token })
                )
            } catch { /* ignore */
            }
            // Trigger native prompt only when there are unsaved changes
            if (hasChanges && e instanceof BeforeUnloadEvent) {
                e.preventDefault()
            }
        }

        // beforeunload for “close tab/window”; pagehide for iOS Safari SPA nav
        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('pagehide', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('pagehide', handleBeforeUnload)
        }
    }, [])

    // Server-side release when component actually unmounts (prod only)
    useEffect(() => {
        return () => {
            if (process.env.NODE_ENV === 'production') {
                const { entityType, entityId, userId, token } = refs.current
                void releaseLock({ entityType, entityId, userId, token })
            }
        }
    }, [ entityType, entityId, userId ])

    return {
        token,                 // current lock token
        lockBroken,            // true if someone else took the lock
        acknowledgeLockBreak: () => setLockBroken(false) // optional helper
    }
}

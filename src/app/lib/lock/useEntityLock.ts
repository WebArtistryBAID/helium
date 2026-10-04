'use client'

import { useEffect, useRef } from 'react'
import { EntityType } from '@/generated/prisma/browser'
import { releaseLock, renewLock } from '@/app/lib/lock/lock-actions'

const HEARTBEAT_INTERVAL_MS = 15_000
const RETRY_INTERVAL_MS = 5_000
const pendingReleases = new Map<string, ReturnType<typeof setTimeout>>()

type UseEntityLockOpts = {
    entityType: EntityType
    entityId: number
    token: string
    hasChanges?: boolean
    onLockLost: () => void
}

function lockSessionKey(entityType: EntityType, entityId: number, token: string) {
    return `${entityType}:${entityId}:${token}`
}

export function useEntityLock({
                                  entityType,
                                  entityId,
                                  token,
                                  hasChanges = false,
                                  onLockLost
                              }: UseEntityLockOpts) {
    const latest = useRef({ hasChanges, onLockLost })
    latest.current = { hasChanges, onLockLost }

    useEffect(() => {
        const sessionKey = lockSessionKey(entityType, entityId, token)
        const pendingRelease = pendingReleases.get(sessionKey)
        if (pendingRelease) {
            clearTimeout(pendingRelease)
            pendingReleases.delete(sessionKey)
        }

        let stopped = false
        let running = false
        let lost = false
        let timer: ReturnType<typeof setTimeout> | undefined

        const schedule = (delay: number) => {
            if (!stopped && !lost) {
                timer = setTimeout(() => void heartbeat(), delay)
            }
        }

        const heartbeat = async () => {
            if (stopped || lost || running) return
            running = true

            try {
                const stillOwned = await renewLock({ entityType, entityId, token })
                if (stopped) return

                if (!stillOwned) {
                    lost = true
                    latest.current.onLockLost()
                    return
                }
                schedule(HEARTBEAT_INTERVAL_MS)
            } catch {
                // Connectivity problems are retried; only a token mismatch means takeover.
                schedule(RETRY_INTERVAL_MS)
            } finally {
                running = false
            }
        }

        const heartbeatNow = () => {
            if (timer) clearTimeout(timer)
            void heartbeat()
        }

        void heartbeat()
        window.addEventListener('focus', heartbeatNow)
        window.addEventListener('online', heartbeatNow)
        window.addEventListener('pageshow', heartbeatNow)
        document.addEventListener('visibilitychange', heartbeatNow)

        return () => {
            stopped = true
            if (timer) clearTimeout(timer)
            window.removeEventListener('focus', heartbeatNow)
            window.removeEventListener('online', heartbeatNow)
            window.removeEventListener('pageshow', heartbeatNow)
            document.removeEventListener('visibilitychange', heartbeatNow)

            const releaseTimer = setTimeout(() => {
                pendingReleases.delete(sessionKey)
                void releaseLock({ entityType, entityId, token })
            }, 1_000)
            pendingReleases.set(sessionKey, releaseTimer)
        }
    }, [ entityType, entityId, token ])

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!latest.current.hasChanges) return
            event.preventDefault()
            event.returnValue = ''
        }

        // Refresh reuses the token in the URL. An unload release can arrive after
        // the new page renews it, so full-page exits rely on the server lock TTL.
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [ entityType, entityId, token ])
}

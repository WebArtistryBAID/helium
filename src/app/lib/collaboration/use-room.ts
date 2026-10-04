'use client'
import { useEffect, useState } from 'react'

/** Separate local databases retain edits from an earlier generation for recovery. */
export function useCollaborationRoom(entityId: number | undefined, language: string | undefined, kind: 'plate' | 'puck', enabled: boolean) {
    const [ resolved, setResolved ] = useState<{ key: string; room: string } | null>(null)
    const key = `${entityId}:${language}:${kind}`
    useEffect(() => {
        if (!enabled || entityId == null || language == null) return
        let disposed = false
        const refresh = async () => {
            try {
                const query = new URLSearchParams({ entityId: String(entityId), language, kind })
                const response = await fetch(`/api/collaboration/token?${query}`, { cache: 'no-store' })
                if (!response.ok) return
                const data = await response.json() as { room: string }
                if (!disposed) setResolved(current => current?.key === key && current.room === data.room ? current : {
                    key,
                    room: data.room
                })
            } catch { /* Existing local documents remain available during disconnection. */
            }
        }
        void refresh()
        const timer = setInterval(() => void refresh(), 5000)
        return () => {
            disposed = true
            clearInterval(timer)
        }
    }, [ enabled, entityId, language, kind, key ])
    return enabled && resolved?.key === key ? resolved.room : null
}

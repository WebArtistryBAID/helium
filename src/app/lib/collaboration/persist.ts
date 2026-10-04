'use client'

import { createClientId } from '@/app/lib/client-id'

import type { HocuspocusProvider } from '@hocuspocus/provider'

/** WebSocket delivery precedes this request; only a committed save receives an acknowledgement. */
export function persistCollaborationDocument(provider: HocuspocusProvider): Promise<void> {
    return new Promise((resolve, reject) => {
        const requestId = createClientId()
        const finish = (error?: Error) => {
            clearTimeout(timer)
            provider.off('stateless', onStateless)
            provider.off('disconnect', onDisconnect)
            error ? reject(error) : resolve()
        }
        const onStateless = ({ payload }: { payload: string }) => {
            let response
            try {
                response = JSON.parse(payload)
            } catch {
                return
            }
            if (response.requestId !== requestId) return
            if (response.type === 'persisted') finish()
            if (response.type === 'persistence-error') finish(new Error('Collaborative content could not be saved'))
        }
        const onDisconnect = () => finish(new Error('Collaboration disconnected during save'))
        const timer = setTimeout(() => finish(new Error('Collaborative save timed out')), 15_000)
        provider.on('stateless', onStateless)
        provider.on('disconnect', onDisconnect)
        if (!provider.isSynced) {
            finish(new Error('Collaboration must finish syncing before saving'))
            return
        }
        try {
            provider.sendStateless(JSON.stringify({ type: 'persist', requestId }))
        } catch (error) {
            finish(error instanceof Error ? error : new Error('Collaborative save failed'))
        }
    })
}

export function waitForCollaborationSync(provider: HocuspocusProvider): Promise<void> {
    if (provider.isSynced) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const finish = (error?: Error) => {
            clearTimeout(timer)
            provider.off('synced', onSynced)
            provider.off('authenticationFailed', onFailure)
            error ? reject(error) : resolve()
        }
        const onSynced = ({ state }: { state: boolean }) => {
            if (state) finish()
        }
        const onFailure = () => finish(new Error('Collaboration authorization failed'))
        const timer = setTimeout(() => finish(new Error('Collaboration sync timed out')), 15_000)
        provider.on('synced', onSynced)
        provider.on('authenticationFailed', onFailure)
        if (provider.isSynced) finish()
    })
}

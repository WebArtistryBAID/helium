'use client'

import { HocuspocusProvider } from '@hocuspocus/provider'
import { slateNodesToInsertDelta } from '@slate-yjs/core'
import * as Y from 'yjs'
import { deserializeMarkdownToPlate } from '@/app/lib/plate/plate-markdown'
import { isPlateValue, type HeliumPlateValue } from '@/app/lib/plate/plate-types'

function plateValueFromContent(content: string): HeliumPlateValue {
    try {
        const parsed: unknown = JSON.parse(content)
        if (isPlateValue(parsed)) return parsed
    } catch {
        // Legacy Markdown content is converted below.
    }
    return deserializeMarkdownToPlate(content)
}

export async function replacePlateCollaborationDocument({ content, entityId, language }: {
    content: string
    entityId: number
    language: 'en' | 'zh'
}): Promise<void> {
    const url = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL
    if (url == null || url.length === 0) return

    const document = new Y.Doc()
    const room = `content-entity:${entityId}:${language}`
    let resolveSynced: () => void = () => undefined
    let rejectSynced: (error: Error) => void = () => undefined
    let resolvePersisted: () => void = () => undefined
    const synced = new Promise<void>((resolve, reject) => {
        resolveSynced = resolve
        rejectSynced = reject
    })
    const persisted = new Promise<void>(resolve => {
        resolvePersisted = resolve
    })
    const provider = new HocuspocusProvider({
        name: room,
        url,
        document,
        token: async () => {
            const query = new URLSearchParams({ entityId: String(entityId), language })
            const response = await fetch(`/api/collaboration/token?${query}`)
            if (!response.ok) throw new Error('Unable to authorize Plate collaboration')
            const result = await response.json() as { token?: string }
            if (result.token == null) throw new Error('Plate collaboration token is missing')
            return result.token
        },
        onSynced: () => resolveSynced(),
        onAuthenticationFailed: () => rejectSynced(new Error('Plate collaboration authorization failed')),
        onUnsyncedChanges: ({ number }) => {
            if (number === 0) resolvePersisted()
        }
    })

    try {
        await synced
        const sharedRoot = document.get('content', Y.XmlText)
        const value = plateValueFromContent(content)
        document.transact(() => {
            sharedRoot.delete(0, sharedRoot.length)
            sharedRoot.applyDelta(slateNodesToInsertDelta(value))
        }, 'plate-replace-document')
        if (!provider.hasUnsyncedChanges) resolvePersisted()
        await Promise.race([
            persisted,
            new Promise<never>((_, reject) => window.setTimeout(
                () => reject(new Error('Timed out while saving collaborative Plate content')),
                10_000
            ))
        ])
    } finally {
        provider.destroy()
        document.destroy()
    }
}

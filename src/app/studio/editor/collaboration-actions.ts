'use server'
import { randomUUID } from 'node:crypto'
import { getStudioActor } from '@/app/lib/services/studio-actor'
import { operateEditorDocument } from '@/app/lib/services/mcp-editor'

export async function replaceStudioDocument(entityId: number, language: 'en' | 'zh', editor: 'plate' | 'puck', document: unknown) {
    const actor = await getStudioActor()
    const current = await operateEditorDocument(actor, 'read', { entityId, language, editor })
    if (!current.ok) return current
    const data = current.data as { generation: number; revision: string }
    return operateEditorDocument(actor, 'replace', {
        entityId, language, editor, document,
        generation: data.generation, expectedRevision: data.revision, idempotencyKey: randomUUID()
    })
}

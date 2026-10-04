'use client'

import { replaceStudioDocument } from '@/app/studio/editor/collaboration-actions'
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

    const result = await replaceStudioDocument(entityId, language, 'plate', plateValueFromContent(content))
    if (!result.ok) throw new Error('Collaborative Plate replacement could not complete')
}

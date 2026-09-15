import 'server-only'

import { CommentAnchorType, ContentLanguage } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { collectPuckComponentIds } from '@/app/lib/puck/puck-component-ids'

function idsFromSerializedPuckData(content: string): Set<string> | null {
    try {
        return collectPuckComponentIds(JSON.parse(content))
    } catch {
        return null
    }
}

export async function reconcilePuckCommentThreads(entityId: number, contentEN: string, contentZH: string) {
    const idsByLanguage = {
        [ContentLanguage.en]: idsFromSerializedPuckData(contentEN),
        [ContentLanguage.zh]: idsFromSerializedPuckData(contentZH)
    }

    for (const language of [ ContentLanguage.en, ContentLanguage.zh ]) {
        const ids = idsByLanguage[language]
        if (ids == null) continue
        const componentIds = [ ...ids ]
        await prisma.commentThread.deleteMany({
            where: {
                entityId,
                language,
                anchorType: CommentAnchorType.component,
                ...(componentIds.length > 0
                    ? { componentId: { notIn: componentIds } }
                    : {})
            }
        })
    }
}

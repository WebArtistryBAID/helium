import 'server-only'

import { CommentAnchorType, ContentLanguage, Prisma } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { collectPuckComponentIds } from '@/app/lib/puck/puck-component-ids'

function idsFromSerializedPuckData(content: string): Set<string> | null {
    try {
        return collectPuckComponentIds(JSON.parse(content))
    } catch {
        return null
    }
}

export async function reconcilePuckCommentThreads(entityId: number, contentEN: string, contentZH: string,
                                                  database: Pick<Prisma.TransactionClient, 'commentThread'> = prisma) {
    const idsByLanguage = {
        [ContentLanguage.en]: idsFromSerializedPuckData(contentEN),
        [ContentLanguage.zh]: idsFromSerializedPuckData(contentZH)
    }

    for (const language of [ ContentLanguage.en, ContentLanguage.zh ]) {
        const ids = idsByLanguage[language]
        if (ids == null) continue
        const componentIds = [ ...ids ]
        await database.commentThread.deleteMany({
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

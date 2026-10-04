import { createHash } from 'node:crypto'

const FIELDS = [ 'id', 'collaborationGeneration', 'type', 'slug', 'categoryEN', 'categoryZH', 'createdAt', 'updatedAt',
    'titleDraftEN', 'titleDraftZH', 'contentDraftEN', 'contentDraftZH',
    'shortContentDraftEN', 'shortContentDraftZH', 'coverImageDraftId', 'transparentNavbarDraft',
    'titlePublishedEN', 'titlePublishedZH', 'contentPublishedEN', 'contentPublishedZH',
    'shortContentPublishedEN', 'shortContentPublishedZH', 'coverImagePublishedId', 'transparentNavbarPublished'
] as const

export function entityRevision(entity: object): string {
    const record = entity as Record<string, unknown>
    return createHash('sha256').update(JSON.stringify(FIELDS.map(field => record[field] ?? null))).digest('hex')
}

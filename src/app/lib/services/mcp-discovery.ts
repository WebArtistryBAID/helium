import 'server-only'

import { EntityType, type Prisma, Role } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireActorUser } from '@/app/lib/services/actor'
import { getContentEntity } from '@/app/lib/services/entities'
import { meetsThresholds } from '@/app/lib/services/approvals'
import { searchEntitiesSchema, type OperationActor } from '@/app/lib/mcp/contracts'
import { entityRevision } from '@/app/lib/mcp/entity-revision'
import { getContentEntityURI, SIMPLIFIED_CONTENT_ENTITY_SELECT } from '@/app/lib/data-types'
import { WEBSITE_METADATA_SLUG } from '@/app/lib/metadata/website-metadata-types'

export function entityLinks(entity: { id: number; type: EntityType; slug: string; createdAt: Date | string }) {
    const origin = (process.env.HOST ?? '').replace(/\/+$/, '')
    const metadata = entity.slug === WEBSITE_METADATA_SLUG
    const editor = metadata ? '/studio/metadata' : entity.type === EntityType.page
        ? `/studio/pages/${entity.id}/editor` : `/studio/editor/${entity.id}#editor`
    const approval = metadata ? '/studio/metadata#approval' : entity.type === EntityType.page
        ? `/studio/pages/${entity.id}/approval` : `/studio/editor/${entity.id}#approval`
    const published = metadata ? '/' : entity.type === EntityType.page
        ? `/${entity.slug.replace(/^\/+/, '')}` : getContentEntityURI(entity.createdAt, entity.slug)
    return { editor: origin + editor, approval: origin + approval, published: origin + published }
}

export async function searchEntities(actor: OperationActor, input: unknown) {
    await requireActorUser(actor, Role.writer)
    const { type, query, page, state } = searchEntitiesSchema.parse(input)
    const text = query?.trim()
    const where: Prisma.ContentEntityWhereInput = {
        linkOnly: false, type, NOT: { slug: WEBSITE_METADATA_SLUG },
        ...(state === 'published' ? { contentPublishedEN: { not: null } } :
            state === 'unpublished' ? { contentPublishedEN: null } : {}),
        ...(text ? {
            OR: [
                { titleDraftEN: { contains: text, mode: 'insensitive' } },
                { titleDraftZH: { contains: text, mode: 'insensitive' } },
                { slug: { contains: text, mode: 'insensitive' } },
                { contentDraftEN: { contains: text, mode: 'insensitive' } },
                { contentDraftZH: { contains: text, mode: 'insensitive' } }
            ]
        } : {})
    }
    const [ count, items ] = await prisma.$transaction([
        prisma.contentEntity.count({ where }),
        prisma.contentEntity.findMany({
            where, orderBy: [ { updatedAt: 'desc' }, { id: 'desc' } ],
            skip: page * 24, take: 24, select: SIMPLIFIED_CONTENT_ENTITY_SELECT
        })
    ], { isolationLevel: 'RepeatableRead' })
    return {
        items: items.map(entity => ({ ...entity, links: entityLinks(entity) })),
        page, pages: Math.ceil(count / 24), total: count
    }
}

export async function fetchEntity(actor: OperationActor, entityId: number) {
    const entity = await getContentEntity(actor, entityId)
    if (!entity) return null
    return {
        entity, revision: entityRevision(entity),
        editor: entity.slug === WEBSITE_METADATA_SLUG ? 'metadata' : entity.type === EntityType.page ? 'puck' : 'plate',
        persistence: 'saved_snapshot', links: entityLinks(entity)
    }
}

export async function getPublicationStatus(actor: OperationActor, entityId: number) {
    const entity = await getContentEntity(actor, entityId)
    if (!entity) return null
    return {
        entityId, ...(await meetsThresholds(actor, { entityType: entity.type, entityId })),
        revision: entityRevision(entity), links: entityLinks(entity)
    }
}

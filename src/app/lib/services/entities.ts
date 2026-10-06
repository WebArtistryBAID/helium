import 'server-only'

import type { ContentSort } from '@/app/lib/content-sort'
import type { Prisma } from '@/generated/prisma/client'

import type { OperationActor } from '@/app/lib/mcp/contracts'
import { requireActorUser } from '@/app/lib/services/actor'

import { EntityType, Role, UserAuditLogType } from '@/generated/prisma/client'
import {
    getContentEntityURI,
    HYDRATED_CONTENT_ENTITY_SELECT,
    HydratedContentEntity,
    Paginated,
    PUBLIC_CONTENT_ENTITY_SELECT,
    PublicContentEntity,
    SIMPLIFIED_CONTENT_ENTITY_SELECT,
    SimplifiedContentEntity
} from '@/app/lib/data-types'

import { AlignEntityResponse } from '@/app/studio/editor/entity-types'
import { getThresholds } from '@/app/lib/services/approvals'
import { prisma } from '@/app/lib/prisma'
import { resolveAllData } from '@puckeditor/core'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { WEBSITE_METADATA_SLUG } from '@/app/lib/metadata/website-metadata-types'
import { reconcilePuckCommentThreads } from '@/app/lib/puck/puck-comment-storage'
import { publishDraft } from '@/app/lib/services/publication'
import { isSerializedPlateValue, serializePlateValue } from '@/app/lib/plate/plate-types'
import { deserializeMarkdownToPlate } from '@/app/lib/plate/plate-markdown'
import { parsePuckData } from '@/app/lib/puck/puck-data'

const PAGE_SIZE = 24

function contentOrderBy(sort: ContentSort): Prisma.ContentEntityOrderByWithRelationInput[] {
    switch (sort) {
        case 'title-en-asc':
            return [ { titlePublishedEN: 'asc' }, { id: 'asc' } ]
        case 'title-en-desc':
            return [ { titlePublishedEN: 'desc' }, { id: 'asc' } ]
        case 'title-zh-asc':
            return [ { titlePublishedZH: 'asc' }, { id: 'asc' } ]
        case 'title-zh-desc':
            return [ { titlePublishedZH: 'desc' }, { id: 'asc' } ]
        case 'oldest':
            return [ { createdAt: 'asc' }, { id: 'asc' } ]
        default:
            return [ { createdAt: 'desc' }, { id: 'asc' } ]
    }
}

const AUTOMATIC_SLUG_SECTION_LIMIT = 8

function createAutomaticSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .split('-')
        .slice(0, AUTOMATIC_SLUG_SECTION_LIMIT)
        .join('-')
}

export async function getRecentEntities(actor: OperationActor, type: EntityType): Promise<SimplifiedContentEntity[]> {
    await requireActorUser(actor, Role.writer)
    return prisma.contentEntity.findMany({
        where: { linkOnly: false, type, NOT: { slug: WEBSITE_METADATA_SLUG } },
        orderBy: { updatedAt: 'desc' },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT,
        take: 3
    })
}

export async function getMyPendingApprovals(actor: OperationActor): Promise<SimplifiedContentEntity[]> {
    const user = await requireActorUser(actor, Role.writer)
    const entityTypes = Object.values(EntityType) as EntityType[]
    const thresholdsByType = new Map<EntityType, Record<string, number>>()
    for (const t of entityTypes) {
        const th = await getThresholds(actor, t)
        thresholdsByType.set(t, th as unknown as Record<string, number>)
    }
    const rows: Array<{ id: number; type: EntityType; editor_count: number; admin_count: number }>
        = await prisma.$queryRaw`
        WITH counts AS (SELECT ce.id,
                               ce."type"                                            AS type,
                               SUM(CASE WHEN a."role" = 'editor' THEN 1 ELSE 0 END) AS editor_count,
                               SUM(CASE WHEN a."role" = 'admin' THEN 1 ELSE 0 END)  AS admin_count
                        FROM "ContentEntity" ce
                                 LEFT JOIN "Approval" a ON a."entityId" = ce.id
                        WHERE ce."linkOnly" = false
                        GROUP BY ce.id, ce."type")
        SELECT id, type, editor_count, admin_count
        FROM counts
        ORDER BY id DESC LIMIT 500;`

    const getReq = (type: EntityType, role: Role) => {
        const th = thresholdsByType.get(type) ?? {}
        return Number(th[role] ?? 0)
    }

    let ids: number[] = []

    if (user.roles.includes(Role.admin)) {
        ids = rows
            .filter(r => {
                const editorReq = getReq(r.type, Role.editor)
                const adminReq = getReq(r.type, Role.admin)
                return r.editor_count >= editorReq && r.admin_count < adminReq
            })
            .map(r => r.id)
    } else if (user.roles.includes(Role.editor)) {
        ids = rows
            .filter(r => {
                const editorReq = getReq(r.type, Role.editor)
                return r.editor_count < editorReq
            })
            .map(r => r.id)
    } else {
        return []
    }

    const websiteMetadata = await prisma.contentEntity.findUnique({
        where: { slug: WEBSITE_METADATA_SLUG },
        select: {
            id: true,
            titlePublishedEN: true,
            titlePublishedZH: true,
            titleDraftEN: true,
            titleDraftZH: true,
            contentPublishedEN: true,
            contentPublishedZH: true,
            contentDraftEN: true,
            contentDraftZH: true
        }
    })
    if (websiteMetadata &&
        websiteMetadata.titlePublishedEN === websiteMetadata.titleDraftEN &&
        websiteMetadata.titlePublishedZH === websiteMetadata.titleDraftZH &&
        websiteMetadata.contentPublishedEN === websiteMetadata.contentDraftEN &&
        websiteMetadata.contentPublishedZH === websiteMetadata.contentDraftZH) {
        ids = ids.filter(id => id !== websiteMetadata.id)
    }

    if (ids.length === 0) return []

    const limited = ids.slice(0, 24)
    return prisma.contentEntity.findMany({
        where: { linkOnly: false, id: { in: limited } },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT,
        orderBy: { updatedAt: 'desc' }
    })
}

export async function getAllPublishedCourses(): Promise<SimplifiedContentEntity[]> {
    return prisma.contentEntity.findMany({
        where: {
            linkOnly: false,
            type: EntityType.course,
            NOT: { slug: WEBSITE_METADATA_SLUG },
            contentPublishedEN: { not: null }
        },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
}

let lastRefresh = 0

export async function refreshPageData(): Promise<void> {
    if (Date.now() - lastRefresh < 3600 * 1000) {
        return
    }
    const pages = await prisma.contentEntity.findMany({
        where: {
            type: EntityType.page,
            NOT: { slug: WEBSITE_METADATA_SLUG }
        }
    })
    for (const page of pages) {
        const data = {
            contentDraftEN: JSON.stringify(await resolveAllData(parsePuckData(page.contentDraftEN, page.titleDraftEN), PUCK_CONFIG)),
            contentDraftZH: JSON.stringify(await resolveAllData(parsePuckData(page.contentDraftZH, page.titleDraftZH), PUCK_CONFIG)),
            contentPublishedEN: page.contentPublishedEN == null ? null : JSON.stringify(await resolveAllData(
                parsePuckData(page.contentPublishedEN, page.titlePublishedEN ?? ''), PUCK_CONFIG)),
            contentPublishedZH: page.contentPublishedZH == null ? null : JSON.stringify(await resolveAllData(
                parsePuckData(page.contentPublishedZH, page.titlePublishedZH ?? ''), PUCK_CONFIG))
        }
        if (Object.entries(data).every(([ field, value ]) => page[field as keyof typeof data] === value)) continue
        // A background refresh is not an edit: keep updatedAt (and thus the entity revision) unless
        // resolved data actually changed, and skip pages saved by an editor since they were read.
        await prisma.contentEntity.updateMany({
            where: { id: page.id, updatedAt: page.updatedAt },
            data: { ...data, updatedAt: page.updatedAt }
        })
    }
    lastRefresh = Date.now()
}

export async function getContentEntityBySlug(slug: string): Promise<PublicContentEntity | null> {
    if (slug === WEBSITE_METADATA_SLUG) return null
    return prisma.contentEntity.findFirst({
        where: {
            slug,
            contentPublishedEN: { not: null }
        },
        select: PUBLIC_CONTENT_ENTITY_SELECT
    })
}

// Used by component selections; direct public routes use getContentEntityBySlug.
export async function getPublishedContentEntity(id: number): Promise<PublicContentEntity | null> {
    return prisma.contentEntity.findFirst({
        where: {
            linkOnly: false,
            id,
            NOT: { slug: WEBSITE_METADATA_SLUG },
            contentPublishedEN: { not: null }
        },
        select: PUBLIC_CONTENT_ENTITY_SELECT
    })
}

export async function getPublishedProjectsByCategory(page: number, category: string, sort: ContentSort = 'title-en-asc'): Promise<Paginated<SimplifiedContentEntity>> {
    const pages = Math.ceil(await prisma.contentEntity.count({
        where: {
            linkOnly: false,
            type: EntityType.project,
            contentPublishedEN: { not: null },
            OR: [
                { categoryEN: category },
                { categoryZH: category }
            ]
        }
    }) / PAGE_SIZE)
    const posts = await prisma.contentEntity.findMany({
        where: {
            linkOnly: false,
            type: EntityType.project,
            contentPublishedEN: { not: null },
            OR: [
                { categoryEN: category },
                { categoryZH: category }
            ]
        },
        orderBy: contentOrderBy(sort),
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
    return {
        items: posts,
        page,
        pages
    }
}

export async function getPublishedProjectsByCategoriesForInit(sort: ContentSort = 'title-en-asc'): Promise<{
    categoryEN: string,
    categoryZH: string,
    projects: Paginated<SimplifiedContentEntity>
}[]> {
    const categories = await prisma.contentEntity.findMany({
        where: {
            linkOnly: false,
            type: EntityType.project,
            contentPublishedEN: { not: null },
            categoryEN: { not: null },
            categoryZH: { not: null }
        },
        distinct: [ 'categoryEN' ],
        select: {
            categoryEN: true,
            categoryZH: true
        }
    })
    const result: { categoryEN: string; categoryZH: string; projects: Paginated<SimplifiedContentEntity> }[] = []
    for (const cat of categories) {
        result.push({
            categoryEN: cat.categoryEN!,
            categoryZH: cat.categoryZH!,
            projects: await getPublishedProjectsByCategory(0, cat.categoryEN!, sort)
        })
    }
    return result
}

export async function getAllPublishedContentEntities(): Promise<SimplifiedContentEntity[]> {
    return prisma.contentEntity.findMany({
        where: {
            linkOnly: false,
            NOT: { slug: WEBSITE_METADATA_SLUG },
            contentPublishedEN: { not: null }
        },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
}

export async function getPublishedContentEntities(page: number, type: EntityType, query: string | undefined = undefined, category: string | undefined = undefined, pageSize = PAGE_SIZE, sort: ContentSort = 'newest'): Promise<Paginated<SimplifiedContentEntity>> {
    const effectivePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))
    const pages = Math.ceil(await prisma.contentEntity.count({
        where: {
            linkOnly: false,
            type,
            NOT: { slug: WEBSITE_METADATA_SLUG },
            contentPublishedEN: { not: null },
            categoryEN: category == null ? undefined : category,
            OR: query == null ? undefined : [
                { titlePublishedEN: { contains: query, mode: 'insensitive' } },
                { titlePublishedZH: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } }
            ]
        }
    }) / effectivePageSize)
    const posts = await prisma.contentEntity.findMany({
        where: {
            linkOnly: false,
            type,
            NOT: { slug: WEBSITE_METADATA_SLUG },
            contentPublishedEN: { not: null },
            categoryEN: category == null ? undefined : category,
            OR: query == null ? undefined : [
                { titlePublishedEN: { contains: query, mode: 'insensitive' } },
                { titlePublishedZH: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } }
            ]
        },
        orderBy: contentOrderBy(sort),
        skip: page * effectivePageSize,
        take: effectivePageSize,
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
    return {
        items: posts,
        page,
        pages
    }
}

export async function getContentEntities(actor: OperationActor, page: number, type: EntityType, query: string | undefined = undefined): Promise<Paginated<SimplifiedContentEntity>> {
    await requireActorUser(actor, Role.writer)
    if (query != null) {
        const q = query.trim()
        const maybeId = Number(q)
        const idParam = Number.isFinite(maybeId) ? maybeId : null
        const limit = PAGE_SIZE
        const offset = page * PAGE_SIZE

        const rows: Array<{ id: number; rank: number | null; total: number }>
            = await prisma.$queryRaw`
            WITH t AS (SELECT ce.id,
                              setweight(to_tsvector('simple', coalesce(ce."titleDraftEN", '')), 'A') ||
                              setweight(to_tsvector('simple', coalesce(ce."titleDraftZH", '')), 'A') ||
                              setweight(to_tsvector('simple', coalesce(ce."contentDraftEN", '')), 'B') ||
                              setweight(to_tsvector('simple', coalesce(ce."contentDraftZH", '')), 'B') AS doc
                       FROM "ContentEntity" ce
                       WHERE ce."linkOnly" = false
                         AND ce."type" = ${type}::"EntityType"
                         AND ce."slug" <> ${WEBSITE_METADATA_SLUG}), m AS (
            SELECT ce.id, ts_rank_cd(t.doc, websearch_to_tsquery('simple', ${q})) AS rank
            FROM "ContentEntity" ce
                JOIN t
            ON t.id = ce.id
                LEFT JOIN "User" u ON u.id = ce."creatorId"
            WHERE ce."linkOnly" = false
              AND ce."type" = ${type}::"EntityType"
              AND ce."slug" <> ${WEBSITE_METADATA_SLUG}
              AND (
                t.doc @@ websearch_to_tsquery('simple'
                , ${q})
               OR ce."titleDraftEN" ILIKE '%' || ${q} || '%'
               OR ce."titleDraftZH" ILIKE '%' || ${q} || '%'
               OR ce."slug" ILIKE '%' || ${q} || '%'
               OR (${idParam}:: int IS NOT NULL
              AND ce.id = ${idParam}:: int)
               OR (u."name" ILIKE '%' || ${q} || '%')
                ))
            SELECT id, rank, COUNT(*) OVER() AS total
            FROM m
            ORDER BY rank DESC NULLS LAST, id DESC
                LIMIT ${limit}:: int
            OFFSET ${offset}::int;`

        const total = rows.length > 0 ? Number(rows[0].total) : 0
        const pages = Math.ceil(total / PAGE_SIZE)
        const ids = rows.map(r => r.id)

        const itemsRaw = ids.length === 0 ? [] : await prisma.contentEntity.findMany({
            where: { linkOnly: false, id: { in: ids } },
            select: SIMPLIFIED_CONTENT_ENTITY_SELECT
        })
        const rankMap = new Map(ids.map((id, i) => [ id, i ]))
        const items = itemsRaw.sort((a, b) => (rankMap.get(a.id)! - rankMap.get(b.id)!))

        return { items, page, pages }
    }
    // No-query
    const pages = Math.ceil(await prisma.contentEntity.count({
        where: {
            linkOnly: false,
            type,
            NOT: { slug: WEBSITE_METADATA_SLUG }
        }
    }) / PAGE_SIZE)
    const posts = await prisma.contentEntity.findMany({
        where: {
            linkOnly: false,
            type,
            NOT: { slug: WEBSITE_METADATA_SLUG }
        },
        orderBy: { createdAt: 'desc' },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
    return {
        items: posts,
        page,
        pages
    }
}

/**
 * Converts legacy Markdown content to Plate JSON before the rich text editor opens it.
 * The collaboration server cannot parse Markdown and would seed the document with the raw text as a single
 * paragraph, which autosave then persisted. A published version identical to the draft is converted too, so the
 * entity is not reported as having unpublished changes. This is a format migration, not an edit.
 */
export async function convertLegacyMarkdownContent(actor: OperationActor, id: number): Promise<void> {
    await requireActorUser(actor, Role.writer)
    const entity = await prisma.contentEntity.findUnique({ where: { id } })
    if (entity == null || entity.type === EntityType.page || entity.slug === WEBSITE_METADATA_SLUG) return
    const data: Partial<Record<'contentDraftEN' | 'contentDraftZH' | 'contentPublishedEN' | 'contentPublishedZH', string>> = {}
    for (const language of [ 'EN', 'ZH' ] as const) {
        const draft = entity[`contentDraft${language}`]
        if (isSerializedPlateValue(draft)) continue
        const converted = serializePlateValue(deserializeMarkdownToPlate(draft))
        data[`contentDraft${language}`] = converted
        if (entity[`contentPublished${language}`] === draft) data[`contentPublished${language}`] = converted
    }
    if (Object.keys(data).length === 0) return
    await prisma.contentEntity.updateMany({
        where: { id, updatedAt: entity.updatedAt },
        data: { ...data, updatedAt: entity.updatedAt }
    })
}

export async function getContentEntity(actor: OperationActor, id: number): Promise<HydratedContentEntity | null> {
    await requireActorUser(actor, Role.writer)
    return prisma.contentEntity.findUnique({
        where: { id },
        select: HYDRATED_CONTENT_ENTITY_SELECT
    })
}

export async function unpublishContentEntity(actor: OperationActor, id: number): Promise<void> {
    const user = await requireActorUser(actor, Role.editor)
    const post = await prisma.contentEntity.findUnique({ where: { id } })
    if (post == null) {
        return
    }
    if (post.slug === WEBSITE_METADATA_SLUG) {
        throw new Error('Website metadata must be managed from website settings')
    }

    await prisma.$transaction(async tx => {
        await tx.contentEntity.update({
            where: { id },
            data: {
                titlePublishedEN: null,
                titlePublishedZH: null,
                coverImagePublishedId: null,
                shortContentPublishedEN: null,
                shortContentPublishedZH: null,
                contentPublishedEN: null,
                contentPublishedZH: null,
                transparentNavbarPublished: null
            }
        })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.unpublishEntity,
                userId: user.id,
                values: [ post.id.toString(), post.titleDraftEN ]
            }
        })
    })
}

export async function restoreContentEntityDraftFromPublished(actor: OperationActor, id: number): Promise<HydratedContentEntity> {
    const user = await requireActorUser(actor, Role.writer)
    const current = await prisma.contentEntity.findUnique({ where: { id } })
    if (current == null) {
        throw new Error('Content entity not found')
    }
    if (current.titlePublishedEN == null || current.titlePublishedZH == null ||
        current.contentPublishedEN == null || current.contentPublishedZH == null) {
        throw new Error('Content entity has no complete published version')
    }
    const publishedTitleEN = current.titlePublishedEN
    const publishedTitleZH = current.titlePublishedZH
    const publishedShortContentEN = current.shortContentPublishedEN
    const publishedShortContentZH = current.shortContentPublishedZH
    const publishedContentEN = current.contentPublishedEN
    const publishedContentZH = current.contentPublishedZH

    const restored = await prisma.$transaction(async tx => {
        const epochs = await tx.$queryRaw<{
            generation: number
        }[]>`SELECT nextval('"CollaborationGenerationSequence"')::integer AS generation`
        const updated = await tx.contentEntity.update({
            where: { id },
            data: {
                collaborationGeneration: epochs[0].generation,
                titleDraftEN: publishedTitleEN,
                titleDraftZH: publishedTitleZH,
                shortContentDraftEN: publishedShortContentEN,
                shortContentDraftZH: publishedShortContentZH,
                contentDraftEN: publishedContentEN,
                contentDraftZH: publishedContentZH,
                coverImageDraftId: current.coverImagePublishedId,
                transparentNavbarDraft: current.transparentNavbarPublished ?? false
            },
            select: HYDRATED_CONTENT_ENTITY_SELECT
        })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.writerEditEntity,
                userId: user.id,
                values: [ updated.id.toString(), updated.titleDraftEN ]
            }
        })
        await tx.yjsDocument.deleteMany({ where: { entityId: id } })
        await tx.approval.deleteMany({ where: { entityId: id } })
        if (current.type === EntityType.page) {
            await reconcilePuckCommentThreads(id, updated.contentDraftEN, updated.contentDraftZH, tx)
        }
        return updated as HydratedContentEntity
    })
    return restored
}

// Align draft content with published content (in effect, publishing or overriding existing publish)
export async function alignContentEntity(actor: OperationActor, id: number): Promise<AlignEntityResponse> {
    return (await publishDraft(actor, id)).status as AlignEntityResponse
}

export async function deleteContentEntity(actor: OperationActor, id: number): Promise<void> {
    const user = await requireActorUser(actor, Role.editor)
    const current = await prisma.contentEntity.findUnique({ where: { id }, select: { slug: true } })
    if (current?.slug === WEBSITE_METADATA_SLUG) {
        throw new Error('Website metadata cannot be deleted')
    }
    await prisma.$transaction(async tx => {
        const post = await tx.contentEntity.delete({ where: { id } })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.deleteEntity,
                userId: user.id,
                values: [ post.id.toString(), post.titleDraftEN ]
            }
        })
    })
}

// = CREATING AND EDITING
export async function createContentEntity(actor: OperationActor, type: EntityType, titleEN: string, titleZH: string): Promise<SimplifiedContentEntity> {
    const user = await requireActorUser(actor, Role.writer)
    return prisma.$transaction(async tx => {
        const post = await tx.contentEntity.create({
            data: {
                type,
                titleDraftEN: titleEN,
                titleDraftZH: titleZH,
                slug: createAutomaticSlug(titleEN),
                contentDraftEN: type === EntityType.page ? JSON.stringify({
                    content: [],
                    root: { props: { title: titleEN } },
                    zones: {}
                }) : '',
                contentDraftZH: type === EntityType.page ? JSON.stringify({
                    content: [],
                    root: { props: { title: titleZH } },
                    zones: {}
                }) : '',
                contentPublishedEN: null,
                contentPublishedZH: null,
                creatorId: user.id
            },
            select: SIMPLIFIED_CONTENT_ENTITY_SELECT
        })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.writerCreateEntity,
                userId: user.id,
                values: [ post.id.toString(), titleEN ]
            }
        })
        return post
    })
}

export async function updateContentEntity(actor: OperationActor, data: {
    id: number
    slug: string | undefined
    categoryEN: string | null | undefined,
    categoryZH: string | null | undefined,
    createdAt: Date | string | undefined
    titleDraftEN: string | undefined
    titleDraftZH: string | undefined
    shortContentDraftEN: string | null | undefined
    shortContentDraftZH: string | null | undefined
    contentDraftEN: string | undefined
    contentDraftZH: string | undefined
    coverImageDraftId: number | null | undefined
    transparentNavbarDraft: boolean | undefined
    expectedFields?: Record<string, unknown>
}): Promise<HydratedContentEntity> {
    const user = await requireActorUser(actor, Role.writer)
    const current = await prisma.contentEntity.findUnique({
        where: { id: data.id },
        select: { slug: true, type: true }
    })
    if (current?.slug === WEBSITE_METADATA_SLUG) {
        throw new Error('Website metadata must be managed from website settings')
    }
    // Content-only collaborative saves already committed through Hocuspocus.
    if (Object.entries(data).every(([ key, value ]) => key === 'id' || key === 'expectedFields' || value === undefined)) {
        const entity = await prisma.contentEntity.findUnique({
            where: { id: data.id }, select: HYDRATED_CONTENT_ENTITY_SELECT
        })
        if (!entity) throw new Error('Content entity does not exist')
        return entity
    }
    const normalizeContent = (content: string | undefined): string | undefined => {
        if (content == null || current?.type === EntityType.page || isSerializedPlateValue(content)) return content
        return serializePlateValue(deserializeMarkdownToPlate(content))
    }
    const contentDraftEN = normalizeContent(data.contentDraftEN)
    const contentDraftZH = normalizeContent(data.contentDraftZH)
    return prisma.$transaction(async tx => {
        if (data.expectedFields) {
            await tx.$queryRaw`SELECT "id" FROM "ContentEntity" WHERE "id" = ${data.id} FOR UPDATE`
            const latest = await tx.contentEntity.findUnique({ where: { id: data.id } })
            const normalize = (value: unknown) => value instanceof Date ? value.toISOString() : value
            for (const [ key, expected ] of Object.entries(data.expectedFields)) {
                if (key === 'id' || key.startsWith('contentDraft')) continue
                if (normalize((latest as unknown as Record<string, unknown> | null)?.[key]) !== normalize(expected)) {
                    throw new Error('Entity fields have changed. Refresh before saving.')
                }
            }
        }
        const post = await tx.contentEntity.update({
            where: { id: data.id },
            data: {
                slug: data.slug,
                createdAt: data.createdAt,
                categoryEN: data.categoryEN,
                categoryZH: data.categoryZH,
                titleDraftEN: data.titleDraftEN,
                titleDraftZH: data.titleDraftZH,
                shortContentDraftEN: data.shortContentDraftEN,
                shortContentDraftZH: data.shortContentDraftZH,
                contentDraftEN,
                contentDraftZH,
                coverImageDraftId: data.coverImageDraftId,
                transparentNavbarDraft: data.transparentNavbarDraft
            },
            select: HYDRATED_CONTENT_ENTITY_SELECT
        })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.writerEditEntity,
                userId: user.id,
                values: [ data.id.toString(), post.titleDraftEN ]
            }
        })
        await tx.approval.deleteMany({ where: { entityId: data.id } })
        if (current?.type === EntityType.page) {
            await reconcilePuckCommentThreads(data.id, post.contentDraftEN, post.contentDraftZH, tx)
        }
        return post
    })
}

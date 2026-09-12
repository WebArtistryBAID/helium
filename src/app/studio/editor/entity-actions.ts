'use server'

import { EntityType, Role, UserAuditLogType } from '@/generated/prisma/client'
import {
    getContentEntityURI,
    HYDRATED_CONTENT_ENTITY_SELECT,
    HydratedContentEntity,
    Paginated,
    SIMPLIFIED_CONTENT_ENTITY_SELECT,
    SimplifiedContentEntity
} from '@/app/lib/data-types'
import { requireUser, requireUserWithRole } from '@/app/login/login-actions'
import { AlignEntityResponse } from '@/app/studio/editor/entity-types'
import { getThresholds, meetsThresholds } from '@/app/lib/approval/approval-actions'
import { prisma } from '@/app/lib/prisma'
import { resolveAllData } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { WEBSITE_METADATA_SLUG } from '@/app/lib/metadata/website-metadata-types'
import { sendPublicationNotification } from '@/app/lib/feishu/feishu-approval'

const PAGE_SIZE = 24
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

export async function getRecentEntities(type: EntityType): Promise<SimplifiedContentEntity[]> {
    return prisma.contentEntity.findMany({
        where: { type, NOT: { slug: WEBSITE_METADATA_SLUG } },
        orderBy: { updatedAt: 'desc' },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT,
        take: 3
    })
}

export async function getMyPendingApprovals(): Promise<SimplifiedContentEntity[]> {
    const user = await requireUser()
    const entityTypes = Object.values(EntityType) as EntityType[]
    const thresholdsByType = new Map<EntityType, Record<string, number>>()
    for (const t of entityTypes) {
        const th = await getThresholds(t)
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
        where: { id: { in: limited } },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT,
        orderBy: { updatedAt: 'desc' }
    })
}

export async function getAllPublishedCourses(): Promise<SimplifiedContentEntity[]> {
    return prisma.contentEntity.findMany({
        where: {
            type: EntityType.course
        },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
}

const lastRefresh = 0

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
        await prisma.contentEntity.update({
            where: { id: page.id },
            data: {
                contentDraftEN: JSON.stringify(await resolveAllData(JSON.parse(page.contentDraftEN), PUCK_CONFIG)),
                contentDraftZH: JSON.stringify(await resolveAllData(JSON.parse(page.contentDraftZH), PUCK_CONFIG)),
                contentPublishedEN: page.contentPublishedEN == null ? null : JSON.stringify(await resolveAllData(JSON.parse(page.contentPublishedEN), PUCK_CONFIG)),
                contentPublishedZH: page.contentPublishedZH == null ? null : JSON.stringify(await resolveAllData(JSON.parse(page.contentPublishedZH), PUCK_CONFIG))
            }
        })
    }
}

export async function getContentEntityBySlug(slug: string): Promise<HydratedContentEntity | null> {
    if (slug === WEBSITE_METADATA_SLUG) return null
    return prisma.contentEntity.findFirst({
        where: {
            slug,
            contentPublishedEN: { not: null }
        },
        select: HYDRATED_CONTENT_ENTITY_SELECT
    })
}

export async function getPublishedContentEntity(id: number): Promise<HydratedContentEntity | null> {
    return prisma.contentEntity.findFirst({
        where: {
            id,
            NOT: { slug: WEBSITE_METADATA_SLUG },
            contentPublishedEN: { not: null }
        },
        select: HYDRATED_CONTENT_ENTITY_SELECT
    })
}

export async function getPublishedProjectsByCategory(page: number, category: string): Promise<Paginated<SimplifiedContentEntity>> {
    const pages = Math.ceil(await prisma.contentEntity.count({
        where: {
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
            type: EntityType.project,
            contentPublishedEN: { not: null },
            OR: [
                { categoryEN: category },
                { categoryZH: category }
            ]
        },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
    return {
        items: posts,
        page,
        pages
    }
}

export async function getPublishedProjectsByCategoriesForInit(): Promise<{
    categoryEN: string,
    categoryZH: string,
    projects: Paginated<SimplifiedContentEntity>
}[]> {
    const categories = await prisma.contentEntity.findMany({
        where: {
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
            projects: await getPublishedProjectsByCategory(0, cat.categoryEN!)
        })
    }
    return result
}

export async function getAllPublishedContentEntities(): Promise<SimplifiedContentEntity[]> {
    return prisma.contentEntity.findMany({
        where: {
            NOT: { slug: WEBSITE_METADATA_SLUG },
            contentPublishedEN: { not: null }
        },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
}

export async function getPublishedContentEntities(page: number, type: EntityType, query: string | undefined = undefined, category: string | undefined = undefined): Promise<Paginated<SimplifiedContentEntity>> {
    const pages = Math.ceil(await prisma.contentEntity.count({
        where: {
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
    }) / PAGE_SIZE)
    const posts = await prisma.contentEntity.findMany({
        where: {
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

export async function getContentEntities(page: number, type: EntityType, query: string | undefined = undefined): Promise<Paginated<SimplifiedContentEntity>> {
    await requireUser()
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
                       WHERE ce."type" = ${type}::"EntityType"
                         AND ce."slug" <> ${WEBSITE_METADATA_SLUG}), m AS (
            SELECT ce.id, ts_rank_cd(t.doc, websearch_to_tsquery('simple', ${q})) AS rank
            FROM "ContentEntity" ce
                JOIN t
            ON t.id = ce.id
                LEFT JOIN "User" u ON u.id = ce."creatorId"
            WHERE ce."type" = ${type}::"EntityType"
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
            where: { id: { in: ids } },
            select: SIMPLIFIED_CONTENT_ENTITY_SELECT
        })
        const rankMap = new Map(ids.map((id, i) => [ id, i ]))
        const items = itemsRaw.sort((a, b) => (rankMap.get(a.id)! - rankMap.get(b.id)!))

        return { items, page, pages }
    }
    // No-query
    const pages = Math.ceil(await prisma.contentEntity.count({
        where: {
            type,
            NOT: { slug: WEBSITE_METADATA_SLUG }
        }
    }) / PAGE_SIZE)
    const posts = await prisma.contentEntity.findMany({
        where: {
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

export async function getContentEntity(id: number): Promise<HydratedContentEntity | null> {
    await requireUser()
    return prisma.contentEntity.findUnique({
        where: { id },
        select: HYDRATED_CONTENT_ENTITY_SELECT
    })
}

export async function unpublishContentEntity(id: number): Promise<void> {
    const user = await requireUserWithRole(Role.editor)
    const post = await prisma.contentEntity.findUnique({ where: { id } })
    if (post == null) {
        return
    }
    if (post.slug === WEBSITE_METADATA_SLUG) {
        throw new Error('Website metadata must be managed from website settings')
    }

    await prisma.contentEntity.update({
        where: { id },
        data: {
            titlePublishedEN: null,
            titlePublishedZH: null,
            coverImagePublishedId: null,
            shortContentPublishedEN: null,
            shortContentPublishedZH: null,
            contentPublishedEN: null,
            contentPublishedZH: null
        }
    })
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.unpublishEntity,
            userId: user.id,
            values: [ post.id.toString(), post.titleDraftEN ]
        }
    })
}

// Align draft content with published content (in effect, publishing or overriding existing publish)
export async function alignContentEntity(id: number): Promise<AlignEntityResponse> {
    const user = await requireUserWithRole(Role.admin)
    const post = await prisma.contentEntity.findUnique({ where: { id } })
    if (post == null) {
        return AlignEntityResponse.notFound
    }
    const thresholds = await meetsThresholds({
        entityType: post.type,
        entityId: id
    })
    if (!thresholds.adminOk || !thresholds.editorOk) {
        return AlignEntityResponse.insufficientApprovals
    }
    await prisma.contentEntity.update({
        where: { id },
        data: {
            titlePublishedEN: post.titleDraftEN,
            titlePublishedZH: post.titleDraftZH,
            contentPublishedEN: post.contentDraftEN,
            contentPublishedZH: post.contentDraftZH,
            shortContentPublishedEN: post.shortContentDraftEN,
            shortContentPublishedZH: post.shortContentDraftZH,
            coverImagePublishedId: post.coverImageDraftId
        }
    })
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.adminPublishEntity,
            userId: user.id,
            values: [ post.id.toString(), post.titleDraftEN ]
        }
    })
    const livePath = post.slug === WEBSITE_METADATA_SLUG
        ? '/'
        : post.type === EntityType.page
            ? `/${post.slug.replace(/^\/+/, '')}`
            : getContentEntityURI(post.createdAt, post.slug)
    try {
        await sendPublicationNotification({
            entityType: post.type,
            title: post.titleDraftZH || post.titleDraftEN,
            publishedBy: user.name,
            url: `${(process.env.HOST!).replace(/\/+$/, '')}${livePath}`
        })
    } catch (error) {
        console.error('Failed to send Feishu publication notification:', error)
    }
    return AlignEntityResponse.success
}

export async function deleteContentEntity(id: number): Promise<void> {
    const user = await requireUserWithRole(Role.editor)
    const current = await prisma.contentEntity.findUnique({ where: { id }, select: { slug: true } })
    if (current?.slug === WEBSITE_METADATA_SLUG) {
        throw new Error('Website metadata cannot be deleted')
    }
    const post = await prisma.contentEntity.delete({
        where: {
            id
        }
    })
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.deleteEntity,
            userId: user.id,
            values: [ post.id.toString(), post.titleDraftEN ]
        }
    })
}

// = CREATING AND EDITING
export async function createContentEntity(type: EntityType, titleEN: string, titleZH: string): Promise<SimplifiedContentEntity> {
    const user = await requireUserWithRole(Role.writer)
    const post = await prisma.contentEntity.create({
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
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.writerCreateEntity,
            userId: user.id,
            values: [ post.id.toString(), titleEN ]
        }
    })
    return post
}

export async function updateContentEntity(data: {
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
}): Promise<HydratedContentEntity> {
    const user = await requireUserWithRole(Role.writer)
    const current = await prisma.contentEntity.findUnique({ where: { id: data.id }, select: { slug: true } })
    if (current?.slug === WEBSITE_METADATA_SLUG) {
        throw new Error('Website metadata must be managed from website settings')
    }
    const post = await prisma.contentEntity.update({
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
            contentDraftEN: data.contentDraftEN,
            contentDraftZH: data.contentDraftZH,
            coverImageDraftId: data.coverImageDraftId
        },
        select: HYDRATED_CONTENT_ENTITY_SELECT
    })
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.writerEditEntity,
            userId: user.id,
            values: [ data.id.toString(), post.titleDraftEN ]
        }
    })
    await prisma.approval.deleteMany({
        where: {
            entityId: data.id
        }
    })
    return post
}

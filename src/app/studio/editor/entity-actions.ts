'use server'

import { ContentEntity, EntityType, Role, User, UserAuditLogType } from '@/generated/prisma/client'
import {
    HYDRATED_CONTENT_ENTITY_SELECT,
    HydratedContentEntity,
    Paginated,
    SIMPLIFIED_CONTENT_ENTITY_SELECT,
    SimplifiedContentEntity
} from '@/app/lib/data-types'
import { requireUser, requireUserWithRole, getMyUser } from '@/app/login/login-actions'
import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import sharp from 'sharp'
import crypto from 'crypto'
import { AlignEntityResponse, WeChatWorkerStatus } from '@/app/studio/editor/entity-types'
import { getThresholds, meetsThresholds } from '@/app/lib/approval/approval-actions'
import { pkgUp } from 'pkg-up'
import { prisma } from '@/app/lib/prisma'
import { resolveAllData } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { LibraryLandingBlock } from '@/app/studio/editor/library-types'
import { sendApprovalProgressNotification } from '@/app/lib/feishu-approval'

const PAGE_SIZE = 24

async function syncContentEntitySequence() {
    await prisma.$queryRaw`
        SELECT setval(
            pg_get_serial_sequence('"ContentEntity"', 'id'),
            GREATEST(COALESCE((SELECT MAX(id) FROM "ContentEntity"), 1), 1),
            (SELECT COUNT(*) > 0 FROM "ContentEntity")
        )
    `
}

type PuckComponentNode = {
    type?: string
    props?: Record<string, any>
}

type PuckDataShape = {
    content?: PuckComponentNode[]
    root?: Record<string, unknown>
    zones?: Record<string, unknown>
}

function parsePuckContent(raw: string | null | undefined): PuckDataShape | null {
    if (!raw) {
        return null
    }

    try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
            return parsed as PuckDataShape
        }
    } catch {
    }

    return null
}

function normalizeSelectedEntityIds(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return []
    }

    return value
        .map(item => {
            if (typeof item === 'number' || typeof item === 'string') {
                return Number(item)
            }

            if (item && typeof item === 'object' && 'value' in item) {
                return Number((item as { value?: unknown }).value)
            }

            if (item && typeof item === 'object' && 'id' in item) {
                return Number((item as { id?: unknown }).id)
            }

            return NaN
        })
        .filter(item => Number.isFinite(item))
}

function getLibraryBlocksFromContent(page: {
    id: number
    slug: string
    titleDraftZH: string
    contentDraftZH: string
}, entityType: EntityType): LibraryLandingBlock[] {
    const data = parsePuckContent(page.contentDraftZH)
    const components = Array.isArray(data?.content) ? data!.content! : []

    return components
        .filter(component =>
            (component.type === 'EntityShowcaseConfig' || component.type === 'EntityFilterWallConfig') &&
            component.props?.entityType === entityType
        )
        .map((component, index) => {
            const componentType = component.type as 'EntityShowcaseConfig' | 'EntityFilterWallConfig'
            const selectedEntityIds = normalizeSelectedEntityIds(component.props?.selectedEntityIds)
            const fallbackEntityIds = selectedEntityIds.length > 0
                ? selectedEntityIds
                : normalizeSelectedEntityIds(component.props?.resolvedItems)

            return {
                pageId: page.id,
                pageSlug: page.slug,
                pageTitle: page.titleDraftZH,
                pageEditorPath: `/studio/pages/${page.id}/editor`,
                pagePublicPath: page.slug === '/' ? '/zh' : `/zh/${page.slug}`,
                componentId: String(component.props?.id ?? `${page.id}-${index}`),
                componentType,
                title: String(component.props?.title ?? '未命名栏目区块'),
                eyebrow: String(component.props?.eyebrow ?? ''),
                entityType,
                manualEntityIds: fallbackEntityIds,
                categoryEN: String(component.props?.categoryEN ?? ''),
                categoryZH: String(component.props?.categoryZH ?? '')
            } satisfies LibraryLandingBlock
        })
}

function getDefaultContent(type: EntityType, titleEN: string, titleZH: string) {
    return JSON.stringify({ content: [], root: { props: { title: titleEN } }, zones: {} })
}

function getDefaultContentZH(type: EntityType, titleZH: string) {
    return JSON.stringify({ content: [], root: { props: { title: titleZH } }, zones: {} })
}

function getStudioReviewUrls(entityType: EntityType, entityId: number) {
    const baseUrl = process.env.HOST || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    if (entityType === EntityType.page) {
        return {
            previewUrl: `${baseUrl}/studio/pages/${entityId}/preview`,
            approvalUrl: `${baseUrl}/studio/pages/${entityId}/approval`
        }
    }

    return {
        previewUrl: `${baseUrl}/studio/editor/${entityId}#preview`,
        approvalUrl: `${baseUrl}/studio/editor/${entityId}#approval`
    }
}

export async function getRecentEntities(type: EntityType): Promise<SimplifiedContentEntity[]> {
    return prisma.contentEntity.findMany({
        where: { type },
        orderBy: { updatedAt: 'desc' },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT,
        take: 3
    })
}

export async function getMyPendingApprovals(): Promise<SimplifiedContentEntity[]> {
    const user = await getMyUser()
    if (!user) return []
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

export async function getAllPageEntities(): Promise<SimplifiedContentEntity[]> {
    await requireUser()

    return prisma.contentEntity.findMany({
        where: {
            type: EntityType.page
        },
        orderBy: {
            titleDraftZH: 'asc'
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
            type: EntityType.page
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
    return prisma.contentEntity.findFirst({
        where: {
            slug,
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
            contentPublishedEN: { not: null }
        },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })
}

export async function getRelatedPublishedContentEntities(entity: {
    id: number
    type: EntityType
    categoryEN?: string | null
    categoryZH?: string | null
}, take = 3): Promise<SimplifiedContentEntity[]> {
    const related = await prisma.contentEntity.findMany({
        where: {
            contentPublishedEN: { not: null },
            id: { not: entity.id },
            OR: [
                {
                    type: entity.type,
                    categoryEN: entity.categoryEN ?? undefined
                },
                {
                    type: entity.type,
                    categoryZH: entity.categoryZH ?? undefined
                },
                {
                    type: entity.type
                }
            ]
        },
        orderBy: [
            { updatedAt: 'desc' }
        ],
        take: take + 4,
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })

    const deduped = related.filter((item, index, arr) =>
        arr.findIndex(candidate => candidate.id === item.id) === index
    )

    return deduped.slice(0, take)
}

export async function getPublishedContentEntities(page: number, type: EntityType, query: string | undefined = undefined, category: string | undefined = undefined): Promise<Paginated<SimplifiedContentEntity>> {
    const pages = Math.ceil(await prisma.contentEntity.count({
        where: {
            type,
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
                       WHERE ce."type" = ${type}::"EntityType"), m AS (
            SELECT ce.id, ts_rank_cd(t.doc, websearch_to_tsquery('simple', ${q})) AS rank
            FROM "ContentEntity" ce
                JOIN t
            ON t.id = ce.id
                LEFT JOIN "User" u ON u.id = ce."creatorId"
            WHERE ce."type" = ${type}::"EntityType"
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
            type
        }
    }) / PAGE_SIZE)
    const posts = await prisma.contentEntity.findMany({
        where: {
            type
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

export async function getLibraryLandingBlocks(type: EntityType, pageSlugs: string[]): Promise<LibraryLandingBlock[]> {
    await requireUser()

    if (pageSlugs.length < 1) {
        return []
    }

    const pages = await prisma.contentEntity.findMany({
        where: {
            type: EntityType.page,
            slug: {
                in: pageSlugs
            }
        },
        orderBy: {
            id: 'asc'
        },
        select: {
            id: true,
            slug: true,
            titleDraftZH: true,
            contentDraftZH: true
        }
    })

    return pages.flatMap(page => getLibraryBlocksFromContent(page, type))
}

export async function updateLibraryLandingBlock(data: {
    pageId: number
    componentId: string
    entityType: EntityType
    selectedEntityIds?: number[]
    categoryEN?: string | null
    categoryZH?: string | null
}): Promise<void> {
    await requireUserWithRole(Role.writer)

    const page = await prisma.contentEntity.findUnique({
        where: {
            id: data.pageId
        },
        select: {
            id: true,
            titleDraftEN: true,
            titleDraftZH: true,
            slug: true,
            contentDraftEN: true,
            contentDraftZH: true
        }
    })

    if (page == null) {
        throw new Error('找不到对应的栏目页')
    }

    const pageTitleEN = page.titleDraftEN
    const pageTitleZH = page.titleDraftZH
    const draftContentEN = page.contentDraftEN
    const draftContentZH = page.contentDraftZH

    function patchContent(raw: string, language: 'en' | 'zh') {
        const parsed = parsePuckContent(raw)
        if (parsed == null || !Array.isArray(parsed.content)) {
            return raw
        }

        let matched = false
        const nextContent = parsed.content.map(component => {
            if (component.props?.id !== data.componentId || component.props?.entityType !== data.entityType) {
                return component
            }

            matched = true
            return {
                ...component,
                props: {
                    ...component.props,
                    selectedEntityIds: (data.selectedEntityIds ?? []).map(id => ({ value: id })),
                    ...(component.type === 'EntityFilterWallConfig'
                        ? {
                            categoryEN: data.categoryEN ?? '',
                            categoryZH: data.categoryZH ?? ''
                        }
                        : {})
                }
            }
        })

        if (!matched) {
            throw new Error('栏目页中没有找到对应的展示区块')
        }

        return JSON.stringify({
            ...parsed,
            content: nextContent,
            root: parsed.root ?? { props: { title: language === 'zh' ? pageTitleZH : pageTitleEN } },
            zones: parsed.zones ?? {}
        })
    }

    await prisma.contentEntity.update({
        where: {
            id: data.pageId
        },
        data: {
            contentDraftZH: patchContent(draftContentZH, 'zh'),
            contentDraftEN: patchContent(draftContentEN, 'en')
        }
    })
}

export async function getContentEntity(id: number): Promise<HydratedContentEntity | null> {
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
    const approvalState = await meetsThresholds({
        entityType: post.type,
        entityId: id
    })
    if (!approvalState.editorOk || !approvalState.adminOk) {
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
    const { previewUrl, approvalUrl } = getStudioReviewUrls(post.type, id)
    await sendApprovalProgressNotification({
        entityId: id,
        entityType: post.type,
        title: post.titleDraftEN || post.titleDraftZH || `Entity #${id}`,
        previewUrl,
        approvalUrl,
        actionBy: user.name,
        statusText: `${user.name} 已发布内容。\n审核流程已完成，公开页面会显示最新发布版本。`,
        editorCount: approvalState.counts[Role.editor] ?? 0,
        editorThreshold: approvalState.thresholds[Role.editor] ?? 1,
        adminCount: approvalState.counts[Role.admin] ?? 0,
        adminThreshold: approvalState.thresholds[Role.admin] ?? 1
    })
    return AlignEntityResponse.success
}

export async function deleteContentEntity(id: number): Promise<void> {
    const user = await requireUserWithRole(Role.editor)
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
    await syncContentEntitySequence()
    const post = await prisma.contentEntity.create({
        data: {
            type,
            titleDraftEN: titleEN,
            titleDraftZH: titleZH,
            slug: `${titleEN.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Date.now().toString(36)}`,
            contentDraftEN: getDefaultContent(type, titleEN, titleZH),
            contentDraftZH: getDefaultContentZH(type, titleZH),
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

export async function updateLibraryEntityMeta(data: {
    id: number
    categoryEN?: string | null
    categoryZH?: string | null
    shortContentDraftEN?: string | null
    shortContentDraftZH?: string | null
}): Promise<SimplifiedContentEntity> {
    await requireUserWithRole(Role.writer)

    const post = await prisma.contentEntity.update({
        where: {
            id: data.id
        },
        data: {
            categoryEN: data.categoryEN,
            categoryZH: data.categoryZH,
            shortContentDraftEN: data.shortContentDraftEN,
            shortContentDraftZH: data.shortContentDraftZH
        },
        select: SIMPLIFIED_CONTENT_ENTITY_SELECT
    })

    await prisma.approval.deleteMany({
        where: {
            entityId: data.id
        }
    })

    return post
}

// = WeChat crawling
let wechatWorkerRunning = WeChatWorkerStatus.idle

async function runCommand(
    command: string,
    args: string[],
    cwd?: string,
    envVars?: NodeJS.ProcessEnv
): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`+ Running command: ${command} ${args.join(' ')}`)
        const options = {
            cwd,
            stdio: 'inherit' as const,
            shell: true,
            env: { ...process.env, ...envVars }
        }
        const child = spawn(command, args, options)
        child.on('close', code => {
            if (code === 0) resolve()
            else reject(new Error(`+ ${command} exited with code ${code}`))
        })
    })
}

export async function checkWeChatWorkerStatus(): Promise<WeChatWorkerStatus> {
    await requireUserWithRole(Role.writer)
    return wechatWorkerRunning
}

// Crawl a WeChat article and create a posts from it
export async function createPostFromWeChat(url: string, coverImageId: number | null): Promise<void> {
    if (wechatWorkerRunning !== WeChatWorkerStatus.idle) {
        return
    }
    const user = await requireUserWithRole(Role.writer)
    await syncContentEntitySequence()
    const post = await prisma.contentEntity.create({
        data: {
            type: EntityType.post,
            titleDraftEN: 'WeChat Article',
            titleDraftZH: '微信文章',
            slug: 'temporary-slug',
            contentDraftEN: '',
            contentDraftZH: '',
            contentPublishedEN: null,
            contentPublishedZH: null,
            creatorId: user.id
        }
    })
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.writerCreateEntity,
            userId: user.id,
            values: [ post.id.toString(), 'WeChat Article' ]
        }
    })
    void workOnWeChat(url, coverImageId, user, post)
}

async function workOnWeChat(link: string, coverImageId: number | null, user: User, post: ContentEntity) {
    try {
        wechatWorkerRunning = WeChatWorkerStatus.download
        console.log(`+ Starting article download from ${link}.`)
        // STEP 0: Download the article
        await fs.mkdir(`/tmp/article-build-${post.id}`)
        await runCommand(path.join(path.dirname(await pkgUp() ?? ''), 'blobs', 'downloader-macos'), [ link, `/tmp/article-build-${post.id}`, '--image=save' ], `/tmp/article-build-${post.id}`)

        // Move from /tmp/article-build-${build.id}/(...) to /tmp/article-build-${build.id}/article
        const files = await fs.readdir(`/tmp/article-build-${post.id}`)
        await fs.rename(path.join(`/tmp/article-build-${post.id}`, files[0]), path.join(`/tmp/article-build-${post.id}`, 'article'))


        console.log('+ Reading Markdown content.')
        // STEP 1: Read the Markdown content
        // Read the only Markdown file from /tmp/article-build-${build.id}/article.
        const articleFiles = await fs.readdir(`/tmp/article-build-${post.id}/article`)
        const markdownFile = articleFiles.find(f => f.endsWith('.md'))
        if (!markdownFile) {
            throw new Error(`No Markdown file found while processing article.`)
        }
        const markdownContent = await fs.readFile(path.join(`/tmp/article-build-${post.id}/article`, markdownFile), 'utf-8')

        wechatWorkerRunning = WeChatWorkerStatus.imageClassification
        console.log('+ Calling image classifiers.')
        // Remove decorative image files.
        const toRemove = []
        const toKeep = []
        for (const file of articleFiles.filter(f => f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp'))) {
            const r = await fetch(`http://localhost:59192?image=/tmp/article-build-${post.id}/article/${file}`)
            if ((await r.text()) === 'decorative') {
                toRemove.push(file)
                await fs.rm(path.join(`/tmp/article-build-${post.id}/article`, file), { force: true })
            } else {
                toKeep.push(file)
            }
        }
        console.log('+ Removed decorative images: ' + toRemove.toString())

        // Call DeepSeek to process the article
        // STEP 2: Sanitize content
        wechatWorkerRunning = WeChatWorkerStatus.sanitization
        console.log('+ Calling DeepSeek to sanitize article content.')
        console.log('Sending prompt:\n' + SANITIZE_LITERAL.replace('{{PLACEHOLDER}}', post.id.toString()).replace('{{IMAGE_BLACKLIST}}', toRemove.toString())
            + markdownContent)
        const sanitizeResp = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: SANITIZE_LITERAL.replace('{{PLACEHOLDER}}', post.id.toString()).replace('{{IMAGE_BLACKLIST}}', toRemove.toString())
                            + markdownContent
                    }
                ],
                stream: false
            })
        })
        console.log('+ DeepSeek responded with sanitized content.')
        const srj = await sanitizeResp.json()
        const srRawContent = srj.choices[0].message.content
        const srStrippedContent = srRawContent.replace(/^```json\s*/, '').replace(/```$/, '')
        const sr = JSON.parse(srStrippedContent)

        const titleChinese = sr.title
        const contentChinese = sr.content
        const date = sr.date

        // STEP 3: Translate content
        wechatWorkerRunning = WeChatWorkerStatus.translation
        console.log('+ Calling DeepSeek to translate article content.')
        console.log('Sending prompt:\n' + TRANSLATE_LITERAL + '#' + titleChinese + '\n\n' + contentChinese)
        const translateResp = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: TRANSLATE_LITERAL + '#' + titleChinese + '\n\n' + contentChinese
                    }
                ],
                stream: false
            })
        })
        console.log('+ DeepSeek responded with translated content.')
        const trj = await translateResp.json()
        const trRawContent = trj.choices[0].message.content
        const trStrippedContent = trRawContent.replace(/^```json\s*/, '').replace(/```$/, '')
        const tr = JSON.parse(trStrippedContent)

        const title = tr.title
        const content = tr.content

        // STEP 4: Store images in media library
        wechatWorkerRunning = WeChatWorkerStatus.savingImages
        const mapping: Map<string, number> = new Map()
        for (const file of toKeep) {
            const fileBuffer = await fs.readFile(path.join(`/tmp/article-build-${post.id}/article`, file))
            const webpBuffer = await sharp(fileBuffer).webp().toBuffer()
            const thumbnailBuffer = await sharp(fileBuffer).resize(300, 200, {
                fit: 'inside',
                withoutEnlargement: true
            }).webp().toBuffer()
            const hash = crypto.createHash('sha1').update(webpBuffer).digest('hex')
            await fs.writeFile(path.join(process.env.UPLOAD_PATH!, hash + '.webp'), webpBuffer)
            await fs.writeFile(path.join(process.env.UPLOAD_PATH!, hash + '_thumb.webp'), thumbnailBuffer)

            const metadata = await sharp(webpBuffer).metadata()

            const img = await prisma.image.create({
                data: {
                    sha1: hash,
                    name: '微信导入',
                    altText: '由微信文章导入',
                    width: metadata.width ?? 0,
                    height: metadata.height ?? 0,
                    sizeKB: Math.ceil(webpBuffer.length / 1024),
                    uploaderId: user.id
                }
            })
            await prisma.userAuditLog.create({
                data: {
                    type: UserAuditLogType.uploadImage,
                    userId: user.id,
                    values: [ img.id.toString(), hash ]
                }
            })
            mapping.set(file, img.id)
        }

        // STEP 5: Create posts for review
        wechatWorkerRunning = WeChatWorkerStatus.creatingPost
        let finalContentEN = content
        let finalContentZH = contentChinese

        for (const [ file, id ] of mapping) {
            const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const escapedFile = escapeRegExp(file)
            const re = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${escapedFile}[^)]*\\)`, 'g')
            finalContentEN = finalContentEN.replace(re, `[IMAGE: ${id}]`)
            finalContentZH = finalContentZH.replace(re, `[IMAGE: ${id}]`)
        }

        await prisma.contentEntity.update({
            where: {
                id: post.id
            },
            data: {
                titleDraftEN: title,
                titleDraftZH: titleChinese,
                slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Date.now().toString(36)}`,
                contentDraftEN: finalContentEN,
                contentDraftZH: finalContentZH,
                coverImageDraftId: coverImageId,
                createdAt: new Date(date)
            }
        })
    } catch (e) {
        console.error(`+ Build failed with ${e}`)
        await prisma.contentEntity.delete({
            where: { id: post.id }
        })
    } finally {
        wechatWorkerRunning = WeChatWorkerStatus.idle
    }
}

const TRANSLATE_LITERAL = `
你将收到一篇**中文 Markdown** 校园新闻：第一行是原标题（已以 \`#\` 开头给出），其后是正文 Markdown。你的任务是**忠实、流畅地翻译为英文**，并以**JSON** 返回结构化结果。

## 翻译要求
- **英文为唯一语言**：输出中**不能出现任何中文**（含括号内注释、术语原文等）。  
- **标题与正文**：将给定的中文标题翻译为英文并放入 \`title\`；**不要**把主标题写入 \`content\`。  
- **Markdown 结构**：保留正文中的 Markdown 结构（段落、列表、加粗、斜体、引用、代码块、链接、图片等）。  
- **图片与特殊符号**：  
  - 不要修改或翻译图片的 Markdown 语法与链接（如 \`![]()\`）。  
  - 不要翻译出现的字面 \`\\n\`（表示换行的转义），保持其原样。  
- **文体与细节**：  
  - 符合**校园新闻报道**的常见英文体例，语法正确，大小写与标点规范。  
  - **专有名词与术语**：严格遵循下方“专有名词对照表”；若原文与对照表不同，以对照表为准。  
  - **中文人名**：采用汉语拼音，**姓在前、名在后**（如“张丹萌”→“Zhang Danmeng”），不使用音译英文名。  
  - 合理处理量词与日期表达，避免直译僵硬。

## 输出字段
- \`content\`：英文正文（不含主标题），保持 Markdown 结构与图片。  
- \`title\`：英文标题。    

## 输出格式（仅输出 JSON 对象；不要使用代码块围栏）
{
  "content": "...Markdown in English...",
  "title": "English Title"
}

## 重要禁止项
- 不要输出任何解释性文字、提示或多余字符。  
- 不要在 JSON 外再包裹 Markdown/代码围栏。  
- 不要混用中英文本；**只输出英文内容**（除非为图片链接、\`\\n\` 字面量等要求保留的非英文字符）。

专有名词:
北京中学 Beijing Academy
北京中学国际部 Beijing Academy International Division (尽量缩写为 BAID)
北中国籍: BAID
BA 大讲堂: BA Lectures
北中小讲师: BAID Speaker
世界大课堂: BA Global Classroom
阅历课程: Experiential Program
北京文化探究: Beijing Cultural Exploration
职业体验: Career Experiences
英才学者: Elite Scholar
世界因我更美好: Better Me, Better World
仁、智、勇、乐: Benevolence, Wisdom, Bravery, Happiness
和而不同 乐在其中: Embrace Harmony and Differences
学会学习 学会共处 学会创新 学会生活: To Learn, To Coooperate, To Innovate, To Live
京领: KingLead
京西学校: Western Academy of Beijing
社团: Student Club
选修课: Electives
年度人物: Person of the Year
月度人物: Person of the Month
校长特别奖: Principal's Special Award
学科周: Subject Week
国际风情周: International Theme Week
校友联络处: Alumni Association
中秋诗会: Zhongqiu Poem Festival
大地课程: Nature Exploration
语文 (指课程): Chinese Literature
通用技术 (指课程): General Technology
信息技术 (指课程): Information Technology
综合英语 (指课程): Integrated English
文学与写作 (指课程): Literature
整本书阅读 (指课程): Guided Reading
戏剧 (指课程): Drama
专题数学 (指课程): Selected Topics in Mathematics
高阶数学 (指课程): Multivariable Calculus
高阶经济 (指课程): Advanced Economics
高阶物理 (指课程): Advanced Physics
沟通技能 (指课程): Communication Skills
学术写作 (指课程): Academic Writing
跨文化交际 (指课程): Intercultural Communications
人文社科 (指课程): Social Studies Course Set (必须包含 Course Set)
EOT 经济竞赛 (指课程): Economics Olympiad Team
植物知道生命的答案 (指课程): Plants Know the Truth of Life
「丝绸之路」之跨学科探索 (指课程): Silk Road Exploration
近现代物理 (指课程): Modern Physics
版画 (指课程): Printmaking
升学指导: College Counseling
班会: Homeroom
戏剧节: Drama Festival
北中好声音: Sing! BA
北中杯: BA Cup
北中小舞台: BAID's Got Talent
露营: Camping
`

const SANITIZE_LITERAL = `
你将收到一段**中文 Markdown** 文本（由微信公众号内容转换而来）。请对其进行**清理与结构化输出**，并按以下要求返回**JSON**：

## 任务
1) **去除装饰性元素**：删除与正文无关的装饰文字、页眉/页脚、水印、作者名片、引导关注/点赞/转发等提示，删除文章主标题、公众号名称与日期等版头信息。  
2) **保留正文与图片**：正文中的图片属于内容的一部分，需要保留其 **Markdown 图片语法**。  
3) **规范化与排版**：在不改变原意的前提下，适度改善排版 (如合理添加小标题、列表、加粗等)，但**不要把文章主标题作为正文标题**加入到 content 中。
4) **空格**: 在中文与英文、数字之间添加空格 (如"BA大讲堂"改为"BA 大讲堂")，但不要在纯中文或纯英文词组内添加空格。

## 图片处理
- 删除所有 **SVG** 与 **GIF** 图片。
- 删除在 {{IMAGE_BLACKLIST}} 中给出的图片文件 (如果存在)。

## 提取字段
- **title**：从原文中提取的文章标题 (不出现在 content 内)。
- **date**：从文本**开头部分**提取的日期，格式为 yyyy-MM-dd。
- **content**：清理与排版后的 Markdown 正文 (不含主标题；保留合规图片的 Markdown 语法与其他结构)。

## 输出格式（必须是一个 JSON 对象）
{
  "content": "...Markdown...",
  "title": "文章标题",
  "date": "yyyy-MM-dd"
}
**仅输出 JSON，不要包含解释或多余文本。**
在处理前，先根据以上规则完成图片筛除与链接前缀替换，再进行字段提取与排版。
`

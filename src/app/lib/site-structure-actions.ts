'use server'

import { prisma } from '@/app/lib/prisma'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'
import {
    buildSiteStructureTree,
    DbSiteStructureItem,
    DEFAULT_SITE_STRUCTURE,
    SiteStructureFormNode,
    SiteStructureResolvedChild,
    SiteStructureNavNode,
    SiteStructureTreeNode,
    toSiteStructureNavigation
} from '@/app/lib/site-structure-schema'

async function getSiteStructureItems(): Promise<DbSiteStructureItem[]> {
    return prisma.$queryRaw<DbSiteStructureItem[]>`
        SELECT
            "id",
            "titleEN",
            "titleZH",
            "slug",
            "jumpLabelEN",
            "jumpLabelZH",
            "jumpDescriptionEN",
            "jumpDescriptionZH",
            "parentId",
            "position",
            "pageEntityId"
        FROM "SiteStructureItem"
        ORDER BY "parentId" ASC NULLS FIRST, "position" ASC, "id" ASC
    `
}

export async function seedSiteStructureIfEmpty() {
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "SiteStructureItem"`
    if (Number(count[0]?.count ?? 0) > 0) {
        return
    }

    for (let index = 0; index < DEFAULT_SITE_STRUCTURE.length; index++) {
        const section = DEFAULT_SITE_STRUCTURE[index]
        const created = await prisma.$queryRaw<Array<{ id: number }>>`
            INSERT INTO "SiteStructureItem" (
                "titleEN",
                "titleZH",
                "slug",
                "jumpLabelEN",
                "jumpLabelZH",
                "jumpDescriptionEN",
                "jumpDescriptionZH",
                "position",
                "pageEntityId"
            )
            VALUES (
                ${section.titleEN},
                ${section.titleZH},
                ${section.slug},
                ${section.jumpLabelEN ?? null},
                ${section.jumpLabelZH ?? null},
                ${section.jumpDescriptionEN ?? null},
                ${section.jumpDescriptionZH ?? null},
                ${index},
                ${section.pageEntityId ?? null}
            )
            RETURNING "id"
        `

        const parentId = created[0]?.id
        for (let childIndex = 0; childIndex < section.children.length; childIndex++) {
            const child = section.children[childIndex]
            await prisma.$executeRaw`
                INSERT INTO "SiteStructureItem" (
                    "titleEN",
                    "titleZH",
                    "slug",
                    "jumpLabelEN",
                    "jumpLabelZH",
                    "jumpDescriptionEN",
                    "jumpDescriptionZH",
                    "position",
                    "parentId",
                    "pageEntityId"
                )
                VALUES (
                    ${child.titleEN},
                    ${child.titleZH},
                    ${child.slug},
                    ${child.jumpLabelEN ?? null},
                    ${child.jumpLabelZH ?? null},
                    ${child.jumpDescriptionEN ?? null},
                    ${child.jumpDescriptionZH ?? null},
                    ${childIndex},
                    ${parentId},
                    ${child.pageEntityId ?? null}
                )
            `
        }
    }
}

export async function getSiteStructureTree(): Promise<SiteStructureTreeNode[]> {
    const items = await getSiteStructureItems()

    if (items.length === 0) {
        await seedSiteStructureIfEmpty()
        return getSiteStructureTree()
    }

    return buildSiteStructureTree(items)
}

export async function getSiteStructureNavigation(): Promise<SiteStructureNavNode[]> {
    const tree = await getSiteStructureTree()
    return tree.map(toSiteStructureNavigation)
}

export async function getSiteStructureChildren(parentSlug: string): Promise<SiteStructureResolvedChild[]> {
    const normalizedSlug = parentSlug.trim().replace(/^\/+|\/+$/g, '')
    if (!normalizedSlug) {
        return []
    }

    return prisma.$queryRaw<SiteStructureResolvedChild[]>`
        SELECT
            child."id",
            child."slug",
            child."titleEN",
            child."titleZH",
            child."jumpLabelEN",
            child."jumpLabelZH",
            child."jumpDescriptionEN",
            child."jumpDescriptionZH",
            child."pageEntityId",
            page."titlePublishedEN" AS "pageTitleEN",
            page."titlePublishedZH" AS "pageTitleZH",
            page."shortContentPublishedEN" AS "shortContentEN",
            page."shortContentPublishedZH" AS "shortContentZH"
        FROM "SiteStructureItem" parent
        JOIN "SiteStructureItem" child ON child."parentId" = parent."id"
        LEFT JOIN "ContentEntity" page ON page."id" = child."pageEntityId"
        WHERE parent."slug" = ${normalizedSlug}
        ORDER BY child."position" ASC, child."id" ASC
    `
}

export async function saveSiteStructureTree(tree: SiteStructureFormNode[]) {
    await requireUserWithRole(Role.admin)

    const slugs = new Set<string>()
    for (const section of tree) {
        if (!section.slug.trim()) {
            throw new Error('每个栏目都需要 slug')
        }
        if (slugs.has(section.slug)) {
            throw new Error(`重复的 slug: ${section.slug}`)
        }
        slugs.add(section.slug)

        for (const child of section.children) {
            if (!child.slug.trim()) {
                throw new Error('每个子页面都需要 slug')
            }
            if (slugs.has(child.slug)) {
                throw new Error(`重复的 slug: ${child.slug}`)
            }
            slugs.add(child.slug)
        }
    }

    await prisma.$transaction(async tx => {
        await tx.$executeRaw`DELETE FROM "SiteStructureItem"`

        for (let index = 0; index < tree.length; index++) {
            const section = tree[index]
            const created = await tx.$queryRaw<Array<{ id: number }>>`
                INSERT INTO "SiteStructureItem" (
                    "titleEN",
                    "titleZH",
                    "slug",
                    "jumpLabelEN",
                    "jumpLabelZH",
                    "jumpDescriptionEN",
                    "jumpDescriptionZH",
                    "position",
                    "pageEntityId"
                )
                VALUES (
                    ${section.titleEN},
                    ${section.titleZH},
                    ${section.slug},
                    ${section.jumpLabelEN ?? null},
                    ${section.jumpLabelZH ?? null},
                    ${section.jumpDescriptionEN ?? null},
                    ${section.jumpDescriptionZH ?? null},
                    ${index},
                    ${section.pageEntityId ?? null}
                )
                RETURNING "id"
            `

            const parentId = created[0]?.id
            for (let childIndex = 0; childIndex < section.children.length; childIndex++) {
                const child = section.children[childIndex]
                await tx.$executeRaw`
                    INSERT INTO "SiteStructureItem" (
                        "titleEN",
                        "titleZH",
                        "slug",
                        "jumpLabelEN",
                        "jumpLabelZH",
                        "jumpDescriptionEN",
                        "jumpDescriptionZH",
                        "position",
                        "parentId",
                        "pageEntityId"
                    )
                    VALUES (
                        ${child.titleEN},
                        ${child.titleZH},
                        ${child.slug},
                        ${child.jumpLabelEN ?? null},
                        ${child.jumpLabelZH ?? null},
                        ${child.jumpDescriptionEN ?? null},
                        ${child.jumpDescriptionZH ?? null},
                        ${childIndex},
                        ${parentId},
                        ${child.pageEntityId ?? null}
                    )
                `
            }
        }
    })
}

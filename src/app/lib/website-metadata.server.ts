import { EntityType, Prisma } from '@/generated/prisma/client'
import { HYDRATED_CONTENT_ENTITY_SELECT, HydratedContentEntity } from '@/app/lib/data-types'
import { prisma } from '@/app/lib/prisma'
import {
    DEFAULT_WEBSITE_METADATA,
    parseWebsiteMetadataContent,
    serializeWebsiteMetadataContent,
    WEBSITE_METADATA_ENTITY_TITLE_EN,
    WEBSITE_METADATA_ENTITY_TITLE_ZH,
    WEBSITE_METADATA_SLUG,
    WebsiteMetadataDraft
} from '@/app/lib/website-metadata-types'

function isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function ensureWebsiteMetadataEntity(
    preferredCreatorId?: number
): Promise<HydratedContentEntity | null> {
    const existing = await prisma.contentEntity.findUnique({
        where: { slug: WEBSITE_METADATA_SLUG },
        select: HYDRATED_CONTENT_ENTITY_SELECT
    })
    if (existing) return existing

    const creator = preferredCreatorId == null
        ? await prisma.user.findFirst({ orderBy: { id: 'asc' }, select: { id: true } })
        : await prisma.user.findUnique({ where: { id: preferredCreatorId }, select: { id: true } })
    if (!creator) return null

    const contentEN = serializeWebsiteMetadataContent(DEFAULT_WEBSITE_METADATA.en)
    const contentZH = serializeWebsiteMetadataContent(DEFAULT_WEBSITE_METADATA.zh)

    try {
        return await prisma.contentEntity.create({
            data: {
                type: EntityType.page,
                titlePublishedEN: WEBSITE_METADATA_ENTITY_TITLE_EN,
                titlePublishedZH: WEBSITE_METADATA_ENTITY_TITLE_ZH,
                titleDraftEN: WEBSITE_METADATA_ENTITY_TITLE_EN,
                titleDraftZH: WEBSITE_METADATA_ENTITY_TITLE_ZH,
                slug: WEBSITE_METADATA_SLUG,
                contentPublishedEN: contentEN,
                contentPublishedZH: contentZH,
                contentDraftEN: contentEN,
                contentDraftZH: contentZH,
                creatorId: creator.id
            },
            select: HYDRATED_CONTENT_ENTITY_SELECT
        })
    } catch (error) {
        if (!isUniqueConstraintError(error)) throw error
        return prisma.contentEntity.findUnique({
            where: { slug: WEBSITE_METADATA_SLUG },
            select: HYDRATED_CONTENT_ENTITY_SELECT
        })
    }
}

export async function getPublishedWebsiteMetadata(): Promise<WebsiteMetadataDraft> {
    const entity = await ensureWebsiteMetadataEntity()
    return {
        en: parseWebsiteMetadataContent(entity?.contentPublishedEN, 'en'),
        zh: parseWebsiteMetadataContent(entity?.contentPublishedZH, 'zh')
    }
}

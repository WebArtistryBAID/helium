import type { MetadataRoute } from 'next'
import { prisma } from '@/app/lib/prisma'
import { getUploadServePath } from '@/app/lib/services/media'
import { WEBSITE_METADATA_SLUG } from '@/app/lib/metadata/website-metadata-types'
import { getSiteOrigin } from '@/app/lib/seo/site-url'
import { buildSitemapEntries } from '@/app/lib/seo/sitemap-builder'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [ entities, uploadPath ] = await Promise.all([
        prisma.contentEntity.findMany({
            where: {
                linkOnly: false,
                NOT: { slug: WEBSITE_METADATA_SLUG },
                contentPublishedEN: { not: null }
            },
            select: {
                type: true,
                slug: true,
                createdAt: true,
                lastPublishedAt: true,
                contentPublishedEN: true,
                contentPublishedZH: true,
                coverImagePublished: { select: { sha1: true, mediaType: true } }
            },
            orderBy: { id: 'asc' }
        }),
        getUploadServePath()
    ])
    return buildSitemapEntries(entities, getSiteOrigin(), uploadPath)
}

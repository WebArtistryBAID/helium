import type { MetadataRoute } from 'next'
import type { EntityType, Image } from '@/generated/prisma/client'
import { getContentEntityURI } from '@/app/lib/data-types'

export interface SitemapEntity {
    type: EntityType
    slug: string
    createdAt: Date | string
    lastPublishedAt: Date | string
    contentPublishedEN: string | null
    contentPublishedZH: string | null
    coverImagePublished: Pick<Image, 'sha1' | 'mediaType'> | null
}

const liveContentComponents = new Set([
    'LatestNewsConfig', 'NewsListConfig', 'ActivitiesConfig', 'ClubsConfig',
    'CoursesConfig', 'PeopleConfig', 'FeaturedProjectsConfig', 'ProjectCategoryConfig'
])

function hasLiveContent(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false
    if (Array.isArray(value)) return value.some(hasLiveContent)
    const record = value as Record<string, unknown>
    return (typeof record.type === 'string' && liveContentComponents.has(record.type)) ||
        Object.values(record).some(hasLiveContent)
}

function lastModified(entity: SitemapEntity, content: string, now: Date): Date | undefined {
    const date = new Date(entity.lastPublishedAt)
    if (!Number.isFinite(date.getTime()) || date.getTime() <= 0 || date > now) return undefined
    if (entity.type === 'page') {
        try {
            if (hasLiveContent(JSON.parse(content))) return undefined
        } catch {
            return undefined
        }
    }
    return date
}

const entityChanges: Record<string, 'yearly' | 'monthly' | 'daily' | 'never'> = {
    '/': 'daily',
    about: 'yearly',
    academics: 'yearly',
    life: 'monthly',
    projects: 'monthly',
    admissions: 'yearly',
    news: 'daily',
    privacy: 'never',
    terms: 'never'
}

const entityPriority: Record<string, number> = {
    '/': 1.0,
    about: 0.9,
    admissions: 0.9,
    academics: 0.9,
    life: 0.8,
    projects: 0.8,
    news: 0.8,
    privacy: 0.4,
    terms: 0.4
}

export function buildSitemapEntries(entities: SitemapEntity[], origin: string, uploadPath: string,
                                    now = new Date()): MetadataRoute.Sitemap {
    const base = new URL(origin).origin
    return entities.flatMap(entity => {
        const createdAt = new Date(entity.createdAt)
        const pathname = entity.type === 'page'
            ? (entity.slug === '/' ? '' : `/${entity.slug.replace(/^\/+|\/+$/g, '')}`)
            : getContentEntityURI(createdAt, entity.slug)
        const versions = ([ 'en', 'zh' ] as const).filter(locale =>
            entity[locale === 'en' ? 'contentPublishedEN' : 'contentPublishedZH'] !== null)
        const urls = Object.fromEntries(versions.map(locale => [ locale, `${base}/${locale}${pathname}` ]))
        const languages = { 'x-default': urls.en ?? urls.zh, ...urls }
        const image = entity.coverImagePublished
        const images = image && image.mediaType !== 'video'
            ? [ new URL(`${uploadPath.replace(/\/+$/, '')}/${image.sha1}.webp`, `${base}/`).href ]
            : undefined
        return versions.map(locale => ({
            url: urls[locale],
            alternates: { languages },
            lastModified: lastModified(entity, entity[locale === 'en' ? 'contentPublishedEN' : 'contentPublishedZH']!, now),
            images,
            changeFrequency: entity.type === 'page' ? (entityChanges[entity.slug] ?? 'monthly') : 'never',
            priority: entity.type === 'page' ? (entityPriority[entity.slug] ?? 0.8)
                : (now.getTime() - createdAt.getTime() < 6 * 30 * 24 * 60 * 60 * 1000 ? 0.7 : 0.6)
        }))
    })
}

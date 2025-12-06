import { MetadataRoute } from 'next'
import { getAllPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/client'
import { getContentEntityURI } from '@/app/lib/data-types'

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    return (await getAllPublishedContentEntities()).map(entity => {
        if (typeof entity.createdAt === 'string') {
            entity.createdAt = new Date(entity.createdAt)
        }
        const fullURL = entity.type === EntityType.page ? (entity.slug === '/' ? '/' : `/${entity.slug}`) : getContentEntityURI(entity.createdAt, entity.slug)
        return {
            url: `${process.env.HOST}/en${fullURL}`,
            alternates: {
                languages: {
                    'x-default': `${process.env.HOST}/en${fullURL}`,
                    en: `${process.env.HOST}/en${fullURL}`,
                    zh: `${process.env.HOST}/zh${fullURL}`
                }
            },
            changeFrequency: entity.type === EntityType.page ? (entityChanges[entity.slug] ?? 'monthly') : 'never',
            priority: entity.type === EntityType.page ? (entityPriority[entity.slug] ?? 0.8) : (Date.now() - entity.createdAt.getTime() < 6 * 30 * 24 * 60 * 60 * 1000 ? 0.7 : 0.6)
        }
    })
}

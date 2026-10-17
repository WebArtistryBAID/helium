import type { PublicContentEntity } from '../data-types'
import type { WebsiteMetadataDraft } from '../metadata/website-metadata-types'

type StructuredEntity = Pick<PublicContentEntity,
    'type' | 'titlePublishedEN' | 'titlePublishedZH' | 'shortContentPublishedEN' |
    'shortContentPublishedZH' | 'contentPublishedEN' | 'contentPublishedZH' |
    'createdAt' | 'lastPublishedAt' | 'coverImagePublished'>

function isoDate(value: Date | string): string | undefined {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) && date.getTime() > 0 ? date.toISOString() : undefined
}

export function buildStructuredData({ origin, locale, pathname, metadata, entity, uploadPath }: {
    origin: string
    locale: 'en' | 'zh'
    pathname: string
    metadata: WebsiteMetadataDraft
    entity: StructuredEntity
    uploadPath: string
}) {
    const base = new URL(origin).origin
    const path = pathname.replace(/^\/+|\/+$/g, '')
    const home = `${base}/${locale}`
    const url = `${home}${path ? `/${path}` : ''}`
    const site = metadata[locale]
    const content = locale === 'en' ? entity.contentPublishedEN : entity.contentPublishedZH
    const title = locale === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH
    const description = locale === 'en' ? entity.shortContentPublishedEN : entity.shortContentPublishedZH
    if (content == null || !title?.trim()) return null

    const schoolId = `${base}/#school`
    const websiteId = `${base}/#website`
    const school = {
        '@type': 'School',
        '@id': schoolId,
        name: site.title,
        alternateName: metadata[locale === 'en' ? 'zh' : 'en'].title,
        url: `${base}/`,
        logo: `${base}/assets/icon.png`,
        email: site.footer.emailText.trim() || undefined,
        telephone: site.footer.phoneText.match(/\+?\d[\d\s()-]*\d/)?.[0].trim() || undefined
    }
    const website = {
        '@type': 'WebSite',
        '@id': websiteId,
        url: `${base}/`,
        name: site.title,
        alternateName: metadata[locale === 'en' ? 'zh' : 'en'].title,
        inLanguage: [ 'en', 'zh-CN' ],
        publisher: { '@id': schoolId }
    }
    const pageId = `${url}#webpage`
    const page = {
        '@type': 'WebPage',
        '@id': pageId,
        url,
        name: path ? title : site.title,
        description: (path ? description : site.description)?.trim() || undefined,
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
        isPartOf: { '@id': websiteId },
        about: { '@id': schoolId },
        ...(entity.type === 'post' ? { mainEntity: { '@id': `${url}#article` } } : {})
    }
    const graph: Record<string, unknown>[] = [ school, website, page ]
    if (entity.type === 'post') {
        const published = isoDate(entity.createdAt)
        const modified = isoDate(entity.lastPublishedAt)
        const image = entity.coverImagePublished
        graph.push({
            '@type': 'NewsArticle',
            '@id': `${url}#article`,
            url,
            headline: title,
            description: description?.trim() || undefined,
            inLanguage: page.inLanguage,
            mainEntityOfPage: { '@id': pageId },
            publisher: { '@id': schoolId },
            datePublished: published,
            dateModified: modified && (!published || modified >= published) ? modified : undefined,
            image: image && image.mediaType !== 'video'
                ? [ new URL(`${uploadPath.replace(/\/+$/, '')}/${image.sha1}.webp`, `${base}/`).href ]
                : undefined
        })
    }
    return { '@context': 'https://schema.org', '@graph': graph }
}

export function serializeStructuredData(data: NonNullable<ReturnType<typeof buildStructuredData>>): string {
    return JSON.stringify(data).replace(/</g, '\\u003c')
}

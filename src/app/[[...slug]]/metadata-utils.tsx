import { getLocalizedURL } from '@/app/lib/seo/site-url'
import { getContentEntityBySlug } from '@/app/studio/editor/entity-actions'
import { getPublishedWebsiteMetadata } from '@/app/lib/metadata/website-metadata.server'

export async function retrieveMetadata(slugs: string[] | null, preferredLanguage?: 'en' | 'zh'): Promise<{
    title: string,
    documentTitle?: string,
    description: string,
    urlEN: string,
    urlZH: string,
    siteName: string
}> {
    const route = slugs ?? []
    const websiteMetadata = await getPublishedWebsiteMetadata()

    if (route.length < 1 || (route[0] !== 'en' && route[0] !== 'zh')) {
        const language = preferredLanguage ?? 'en'
        const content = websiteMetadata[language]
        return {
            title: content.title,
            description: content.description,
            urlEN: getLocalizedURL('en', route.join('/')),
            urlZH: getLocalizedURL('zh', route.join('/')),
            siteName: content.title
        }
    }

    const language = route[0] as 'en' | 'zh'
    const newRoute = route.slice(1)
    const slug = newRoute.length === 5 ? newRoute[4] : (newRoute.length === 0 ? '/' : newRoute.join('/'))
    const siteContent = websiteMetadata[language]
    const baseDescription = siteContent.description
    if (slug === '/') {
        return {
            title: siteContent.title,
            description: baseDescription,
            urlEN: getLocalizedURL('en', '/'),
            urlZH: getLocalizedURL('zh', '/'),
            siteName: siteContent.title
        }
    }
    const entity = await getContentEntityBySlug(slug)
    if (entity == null) {
        return {
            title: language === 'en' ? `Not Found | ${siteContent.title}` : `未找到 | ${siteContent.title}`,
            description: baseDescription,
            urlEN: '',
            urlZH: '',
            siteName: siteContent.title
        }
    }
    const titleSuffix = entity.type === 'page' ? siteContent.title : siteContent.shortTitle.trim() || siteContent.title
    return {
        documentTitle: `${language === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH} | ${titleSuffix}`,
        title: language === 'en'
            ? `${entity.titlePublishedEN} | ${siteContent.title}`
            : `${entity.titlePublishedZH} | ${siteContent.title}`,
        description: (language === 'en' ? entity.shortContentPublishedEN : entity.shortContentPublishedZH) ?? baseDescription,
        urlEN: getLocalizedURL('en', route.slice(1).join('/')),
        urlZH: getLocalizedURL('zh', route.slice(1).join('/')),
        siteName: siteContent.title
    }
}

import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { Render } from '@measured/puck'
import { resolveAllData } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { getContentEntityBySlug, refreshPageData } from '@/app/studio/editor/entity-actions'
import GlobalFooter from './GlobalFooter'
import GlobalHeader from './GlobalHeader'
import AnyContentEntityPage from './AnyContentEntityPage'
import { retrieveMetadata } from './metadata-utils'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import { Metadata } from 'next'
import { getSiteStructureNavigation } from '@/app/lib/site-structure-actions'

function isStaticAssetPath(route: string[]) {
    if (route.length === 0) return false

    const first = route[0]
    const last = route[route.length - 1]

    return first === 'uploads' ||
        first === 'assets' ||
        first === 'favicon.ico' ||
        first === 'apple-touch-icon.png' ||
        first === 'apple-touch-icon-precomposed.png' ||
        /\.[a-z0-9]+$/i.test(last)
}

export async function generateMetadata({ params }: {
    params: Promise<{ slug: string[] | undefined }>
}): Promise<Metadata> {
    const route = (await params).slug ?? []

    // Determine locale
    let finalLocale: string
    if (route.length > 0 && (route[0] === 'en' || route[0] === 'zh')) {
        finalLocale = route[0]
    } else {
        const langCookie = (await cookies()).get('lang')?.value
        if (langCookie === 'en' || langCookie === 'zh') {
            finalLocale = langCookie
        } else {
            const rawLocale = ((await headers()).get('Accept-Language') ?? 'en').split(';')
            finalLocale = rawLocale[0].includes('zh') ? 'zh' : 'en'
        }
    }

    const newRoute = route.slice(1)
    const metadata = await retrieveMetadata(route)

    let ogImage = `${process.env.HOST}/assets/components/bento/life.webp`
    let ogType: 'website' | 'article' = 'website'
    let publishedTime
    if (newRoute.length === 5 && newRoute[0] === 'content') {
        const actualSlug = newRoute[4]
        const entity = await getContentEntityBySlug(actualSlug)
        if (entity && entity.coverImagePublished) {
            ogImage = `${process.env.HOST}${await getUploadServePath()}/${entity.coverImagePublished.sha1}.webp`
        }
        ogType = 'article'
        if (entity && entity.createdAt) {
            publishedTime = (typeof entity.createdAt === 'string'
                    ? new Date(entity.createdAt)
                    : entity.createdAt
            ).toISOString()
        }
    }

    return {
        title: metadata.title,
        description: metadata.description,
        openGraph: {
            title: metadata.title,
            description: metadata.description,
            url: finalLocale === 'en' ? metadata.urlEN : metadata.urlZH,
            type: ogType,
            images: [
                {
                    url: ogImage,
                    alt: metadata.title
                }
            ],
            siteName: finalLocale === 'en'
                ? 'Beijing Academy International Division'
                : '北京中学国际部',
            locale: finalLocale === 'zh' ? 'zh_CN' : 'en_US',
            alternateLocale: finalLocale === 'zh' ? 'en_US' : 'zh_CN',
            ...(publishedTime ? { publishedTime } : {})
        },
        twitter: {
            card: 'summary_large_image',
            title: metadata.title,
            description: metadata.description,
            images: [ ogImage ]
        },
        alternates: {
            canonical: finalLocale === 'en' ? metadata.urlEN : metadata.urlZH,
            languages: {
                'x-default': metadata.urlEN,
                en: metadata.urlEN,
                zh: metadata.urlZH
            }
        },
        other: ogType === 'article' && publishedTime
            ? { 'article:published_time': publishedTime }
            : {}
    }
}

export default async function RouteHandler({ params }: { params: Promise<{ slug: string[] | undefined }> }) {
    const route = (await params).slug ?? []

    if (isStaticAssetPath(route)) {
        notFound()
    }

    // Determine locale
    let finalLocale: string
    if (route.length > 0 && (route[0] === 'en' || route[0] === 'zh')) {
        finalLocale = route[0]
    } else {
        const langCookie = (await cookies()).get('lang')?.value
        if (langCookie === 'en' || langCookie === 'zh') {
            finalLocale = langCookie
        } else {
            const rawLocale = ((await headers()).get('Accept-Language') ?? 'en').split(';')
            finalLocale = rawLocale[0].includes('zh') ? 'zh' : 'en'
        }
    }

    if (route.length < 1 || (route[0] !== 'en' && route[0] !== 'zh')) {
        // Redirect to the correct locale
        redirect(`/${finalLocale}/${route.join('/')}`)
    }

    void refreshPageData()
    const newRoute = route.slice(1)
    const slug = newRoute.length === 0 ? '/' : newRoute.join('/')

    if (newRoute.length === 5 && newRoute[0] === 'content') {
        const actualSlug = newRoute[4]
        const entity = await getContentEntityBySlug(actualSlug)
        if (entity == null) {
            notFound()
        }
        if (typeof entity.createdAt === 'string') {
            entity.createdAt = new Date(entity.createdAt)
        }
        const year = entity.createdAt.getFullYear().toString()
        const month = (entity.createdAt.getMonth() + 1).toString().padStart(2, '0')
        const day = entity.createdAt.getDate().toString().padStart(2, '0')
        if (year !== newRoute[1] || month !== newRoute[2] || day !== newRoute[3]) {
            notFound()
        }
        return (
            <>
                <GlobalHeader pages={await getSiteStructureNavigation()}
                              headerAnimate={[ '/', 'projects', 'life', 'academics/pbl' ].includes(slug)}/>
                <div id="main-content">
                    <AnyContentEntityPage entity={entity} params={params}/>
                </div>
                <GlobalFooter pages={await getSiteStructureNavigation()}/>
            </>
        )
    }

    const entity = await getContentEntityBySlug(slug)
    if (entity == null) {
        notFound()
    }
    return (
        <>
            <GlobalHeader pages={await getSiteStructureNavigation()} headerAnimate={[ '/', 'projects', 'life', 'academics/pbl' ].includes(slug)}/>
            <div id="main-content">
                <Render
                    config={PUCK_CONFIG}
                    data={await resolveAllData(
                        finalLocale === 'en'
                            ? JSON.parse(entity.contentPublishedEN!)
                            : JSON.parse(entity.contentPublishedZH!),
                        PUCK_CONFIG
                    )}
                />
            </div>
            <GlobalFooter pages={await getSiteStructureNavigation()}/>
        </>
    )
}

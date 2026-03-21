import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { Render } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { getContentEntityBySlug, refreshPageData } from '@/app/studio/editor/entity-actions'
import GlobalFooter from '@/app/[[...slug]]/GlobalFooter'
import GlobalHeader from '@/app/[[...slug]]/GlobalHeader'
import AnyContentEntityPage from '@/app/[[...slug]]/AnyContentEntityPage'
import { retrieveMetadata } from '@/app/[[...slug]]/metadata-utils'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import { Metadata } from 'next'

const PAGES = [
    { id: 1, titleEN: 'About Us', titleZH: '关于', slug: 'about' },
    { id: 2, titleEN: 'Academics', titleZH: '学术', slug: 'academics' },
    { id: 3, titleEN: 'Life', titleZH: '学生生活', slug: 'life' },
    { id: 4, titleEN: 'Projects', titleZH: '自主项目', slug: 'projects' },
    { id: 5, titleEN: 'Admissions', titleZH: '招生', slug: 'admissions' },
    { id: 6, titleEN: 'News', titleZH: '新闻', slug: 'news' }
]

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
                <GlobalHeader pages={PAGES}
                              headerAnimate={[ '/', 'projects', 'life', 'academics/pbl' ].includes(slug)}/>
                <div id="main-content">
                    <AnyContentEntityPage entity={entity} params={params}/>
                </div>
                <GlobalFooter pages={PAGES}/>
            </>
        )
    }

    const entity = await getContentEntityBySlug(slug)
    if (entity == null) {
        notFound()
    }
    return (
        <>
            <GlobalHeader pages={PAGES} headerAnimate={[ '/', 'projects', 'life', 'academics/pbl' ].includes(slug)}/>
            <div id="main-content">
                <Render config={PUCK_CONFIG}
                        data={finalLocale === 'en'
                            ? JSON.parse(entity.contentPublishedEN!)
                            : JSON.parse(entity.contentPublishedZH!)}/>
            </div>
            <GlobalFooter pages={PAGES}/>
        </>
    )
}

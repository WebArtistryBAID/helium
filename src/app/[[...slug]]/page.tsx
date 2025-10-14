import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { Render } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { getContentEntityBySlug } from '@/app/studio/editor/entity-actions'
import GlobalFooter from '@/app/[[...slug]]/GlobalFooter'
import GlobalHeader from '@/app/[[...slug]]/GlobalHeader'
import AnyContentEntityPage from '@/app/[[...slug]]/AnyContentEntityPage'
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

    if (route.length < 1 || (route[0] !== 'en' && route[0] !== 'zh')) {
        return { title: 'Beijing Academy International Division' }
    }

    const language = route[0]
    const newRoute = route.slice(1)
    const slug = newRoute.length === 5 ? newRoute[4] : (newRoute.length === 0 ? '/' : newRoute.join('/'))
    const baseDescription = language === 'en'
        ? 'Beijing Academy International Division (BAID) is a CIS-member international high school program in Beijing offering AP and Cambridge curricula.'
        : '北京中学国际部 (BAID) 是北京中学下设的国际高中项目，提供 AP 和剑桥课程。我们以立足北京、植根中国、面向世界的现代教育，培养全面发展的未来领袖。'
    if (slug === '/') {
        return {
            title: language === 'en' ? 'Beijing Academy International Division' : '北京中学国际部',
            description: baseDescription
        }
    }
    const entity = await getContentEntityBySlug(slug)
    if (entity == null) {
        return {
            title: language === 'en' ? 'Not Found | Beijing Academy International Division' : '未找到 | 北京中学国际部',
            description: baseDescription
        }
    }
    return {
        title: language === 'en' ? `${entity.titlePublishedEN} | Beijing Academy International Division` : `${entity.titlePublishedZH} | 北京中学国际部`,
        description: (language === 'en' ? entity.shortContentPublishedEN : entity.shortContentPublishedZH) ?? baseDescription
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
        return <>
            <GlobalHeader pages={PAGES} headerAnimate={[ '/', 'projects', 'life' ].includes(slug)}/>
            <AnyContentEntityPage entity={entity} params={params}/>
            <GlobalFooter pages={PAGES}/>
        </>
    }

    const entity = await getContentEntityBySlug(slug)
    if (entity == null) {
        notFound()
    }

    return <>
        <GlobalHeader pages={PAGES} headerAnimate={[ '/', 'projects', 'life' ].includes(slug)}/>
        <Render config={PUCK_CONFIG}
                data={finalLocale === 'en'
                    ? JSON.parse(entity.contentPublishedEN!)
                    : JSON.parse(entity.contentPublishedZH!)}/>
        <GlobalFooter pages={PAGES}/>
    </>
}

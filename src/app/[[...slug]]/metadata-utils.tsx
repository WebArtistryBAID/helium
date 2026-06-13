import { getContentEntityBySlug } from '@/app/studio/editor/entity-actions'

export async function retrieveMetadata(slugs: string[] | null): Promise<{
    title: string,
    description: string,
    urlEN: string,
    urlZH: string
}> {
    const route = slugs ?? []

    if (route.length < 1 || (route[0] !== 'en' && route[0] !== 'zh')) {
        return {
            title: 'Beijing Academy · International Education',
            description: 'The Beijing Academy Education Group offers AP, Cambridge Lower Secondary, and A Level programs through Beijing Academy International Division and the International School of Beijing Academy.',
            urlEN: process.env.HOST + `/en/${route.join('/')}`,
            urlZH: process.env.HOST + `/zh/${route.join('/')}`
        }
    }

    const language = route[0]
    const newRoute = route.slice(1)
    const slug = newRoute.length === 5 ? newRoute[4] : (newRoute.length === 0 ? '/' : newRoute.join('/'))
    const baseDescription = language === 'en'
        ? 'The Beijing Academy Education Group offers AP, Cambridge Lower Secondary, and A Level programs through Beijing Academy International Division and the International School of Beijing Academy.'
        : '北京中学教育集团通过北京中学国际部 (BAID) 和北中外籍人员子女学校 (ISBA) 提供 AP、剑桥国际初中及 A Level 项目。'
    if (slug === '/') {
        return {
            title: language === 'en' ? 'Beijing Academy · International Education' : '北京中学 · 国际教育项目',
            description: baseDescription,
            urlEN: process.env.HOST + `/en/`,
            urlZH: process.env.HOST + `/zh/`
        }
    }
    const entity = await getContentEntityBySlug(slug)
    if (entity == null) {
        return {
            title: language === 'en' ? 'Not Found | Beijing Academy · International Education' : '未找到 | 北京中学 · 国际教育项目',
            description: baseDescription,
            urlEN: '',
            urlZH: ''
        }
    }
    return {
        title: language === 'en' ? `${entity.titlePublishedEN} | Beijing Academy · International Education` : `${entity.titlePublishedZH} | 北京中学 · 国际教育项目`,
        description: (language === 'en' ? entity.shortContentPublishedEN : entity.shortContentPublishedZH) ?? baseDescription,
        urlEN: process.env.HOST + `/en/${route.slice(1).join('/')}`,
        urlZH: process.env.HOST + `/zh/${route.slice(1).join('/')}`
    }
}

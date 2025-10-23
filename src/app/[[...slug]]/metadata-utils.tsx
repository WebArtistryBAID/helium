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
            title: 'Beijing Academy International Division',
            description: 'Beijing Academy International Division (BAID) is a CIS-member international high school program in Beijing offering AP and Cambridge curricula.',
            urlEN: process.env.HOST + `/en/${route.join('/')}`,
            urlZH: process.env.HOST + `/zh/${route.join('/')}`
        }
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
            description: baseDescription,
            urlEN: process.env.HOST + `/en/`,
            urlZH: process.env.HOST + `/zh/`
        }
    }
    const entity = await getContentEntityBySlug(slug)
    if (entity == null) {
        return {
            title: language === 'en' ? 'Not Found | Beijing Academy International Division' : '未找到 | 北京中学国际部',
            description: baseDescription,
            urlEN: '',
            urlZH: ''
        }
    }
    return {
        title: language === 'en' ? `${entity.titlePublishedEN} | Beijing Academy International Division` : `${entity.titlePublishedZH} | 北京中学国际部`,
        description: (language === 'en' ? entity.shortContentPublishedEN : entity.shortContentPublishedZH) ?? baseDescription,
        urlEN: process.env.HOST + `/en/${route.slice(1).join('/')}`,
        urlZH: process.env.HOST + `/zh/${route.slice(1).join('/')}`
    }
}

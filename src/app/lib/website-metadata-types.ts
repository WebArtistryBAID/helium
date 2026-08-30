import type { HydratedContentEntity } from '@/app/lib/data-types'

export const WEBSITE_METADATA_SLUG = '__website-metadata'
export const WEBSITE_METADATA_ENTITY_TITLE_EN = 'Website Metadata'
export const WEBSITE_METADATA_ENTITY_TITLE_ZH = '网站信息'
export const WEBSITE_METADATA_STUDIO_PATH = '/studio/settings/website-metadata'

export type WebsiteLink = {
    id: string
    name: string
    url: string
}

export type WebsiteFooterItem = WebsiteLink & {
    subItems: WebsiteLink[]
}

export type WebsiteFooterContent = {
    items: WebsiteFooterItem[]
    phoneText: string
    emailText: string
    copyrightText: string
    chineseWebsiteUrl: string
    chineseWebsiteText: string
    icpNumber: string
}

export type WebsiteMetadataContent = {
    title: string
    description: string
    navbar: WebsiteLink[]
    footer: WebsiteFooterContent
}

export type WebsiteMetadataDraft = {
    en: WebsiteMetadataContent
    zh: WebsiteMetadataContent
}

export type WebsiteMetadataEditorState = WebsiteMetadataDraft & {
    entity: HydratedContentEntity
}

export type WebsitePageOption = {
    id: number
    titleEN: string
    titleZH: string
    url: string
}

export function resolveWebsiteHref(value: string): string {
    const href = value.trim()
    if (!href) return '/'
    if (/^(?:https?:\/\/|mailto:|tel:|\/\/|\/|#|\?)/i.test(href)) return href
    return `/${href.replace(/^\/+/, '')}`
}

const NAVBAR_EN: WebsiteLink[] = [
    { id: 'about', name: 'About Us', url: '/about' },
    { id: 'academics', name: 'Academics', url: '/academics' },
    { id: 'life', name: 'Life', url: '/life' },
    { id: 'projects', name: 'Projects', url: '/projects' },
    { id: 'admissions', name: 'Admissions', url: '/admissions' },
    { id: 'news', name: 'News', url: '/news' }
]

const NAVBAR_ZH: WebsiteLink[] = [
    { id: 'about', name: '关于', url: '/about' },
    { id: 'academics', name: '学术', url: '/academics' },
    { id: 'life', name: '学生生活', url: '/life' },
    { id: 'projects', name: '自主项目', url: '/projects' },
    { id: 'admissions', name: '招生', url: '/admissions' },
    { id: 'news', name: '新闻', url: '/news' }
]

const FOOTER_EN: WebsiteFooterItem[] = [
    {
        ...NAVBAR_EN[0],
        subItems: [
            { id: 'about-mission', name: 'Our Mission', url: '/about' },
            { id: 'about-values', name: 'Core Values', url: '/about' },
            { id: 'about-accreditation', name: 'Accreditation', url: '/about' }
        ]
    },
    {
        ...NAVBAR_EN[1],
        subItems: [
            { id: 'academics-isba', name: 'ISBA Program', url: '/academics/isba' },
            { id: 'academics-baid', name: 'BAID Program', url: '/academics/baid' },
            { id: 'academics-pbl', name: 'Project-Based Learning', url: '/academics/pbl' },
            {
                id: 'academics-college-counseling',
                name: 'College Counseling',
                url: '/academics/college-counseling'
            }
        ]
    },
    {
        ...NAVBAR_EN[2],
        subItems: [
            { id: 'life-clubs', name: 'Clubs', url: '/life/clubs' },
            { id: 'life-electives', name: 'Electives', url: '/life/electives' },
            { id: 'life-dining', name: 'Dining', url: '/life/dining' },
            { id: 'life-athletics', name: 'Athletics', url: '/life/athletics' },
            { id: 'life-activities', name: 'Activities', url: '/life/activities' }
        ]
    },
    {
        ...NAVBAR_EN[3],
        subItems: [
            { id: 'projects-featured', name: 'Featured Projects', url: '/projects' },
            { id: 'projects-gallery', name: 'Gallery', url: '/projects' }
        ]
    },
    {
        ...NAVBAR_EN[4],
        subItems: [
            { id: 'admissions-baid', name: 'BAID Admissions', url: '/admissions/baid' },
            { id: 'admissions-isba', name: 'ISBA Admissions', url: '/admissions/isba' }
        ]
    },
    { ...NAVBAR_EN[5], subItems: [] }
]

const FOOTER_ZH: WebsiteFooterItem[] = [
    {
        ...NAVBAR_ZH[0],
        subItems: [
            { id: 'about-mission', name: '我们的使命', url: '/about' },
            { id: 'about-values', name: '核心价值观', url: '/about' },
            { id: 'about-accreditation', name: '认证', url: '/about' }
        ]
    },
    {
        ...NAVBAR_ZH[1],
        subItems: [
            { id: 'academics-isba', name: 'ISBA 项目', url: '/academics/isba' },
            { id: 'academics-baid', name: 'BAID 项目', url: '/academics/baid' },
            { id: 'academics-pbl', name: '项目式学习', url: '/academics/pbl' },
            { id: 'academics-college-counseling', name: '大学升学指导', url: '/academics/college-counseling' }
        ]
    },
    {
        ...NAVBAR_ZH[2],
        subItems: [
            { id: 'life-clubs', name: '社团', url: '/life/clubs' },
            { id: 'life-electives', name: '选修课', url: '/life/electives' },
            { id: 'life-dining', name: '用餐', url: '/life/dining' },
            { id: 'life-athletics', name: '运动', url: '/life/athletics' },
            { id: 'life-activities', name: '校园活动', url: '/life/activities' }
        ]
    },
    {
        ...NAVBAR_ZH[3],
        subItems: [
            { id: 'projects-featured', name: '精选项目', url: '/projects' },
            { id: 'projects-gallery', name: '项目展览', url: '/projects' }
        ]
    },
    {
        ...NAVBAR_ZH[4],
        subItems: [
            { id: 'admissions-baid', name: 'BAID 招生', url: '/admissions/baid' },
            { id: 'admissions-isba', name: 'ISBA 招生', url: '/admissions/isba' }
        ]
    },
    { ...NAVBAR_ZH[5], subItems: [] }
]

export const DEFAULT_WEBSITE_METADATA: WebsiteMetadataDraft = {
    en: {
        title: 'Beijing Academy · International Education',
        description: 'The Beijing Academy Education Group offers AP, Cambridge Lower Secondary, and A Level programs through Beijing Academy International Division and the International School of Beijing Academy.',
        navbar: NAVBAR_EN,
        footer: {
            items: FOOTER_EN,
            phoneText: '+86 186 1000 0000 (add on WeChat)',
            emailText: 'baid@bjacademy.com.cn',
            copyrightText: '© 2026 Beijing Academy Education Group. All rights reserved.',
            chineseWebsiteUrl: 'https://www.beijingacademy.com.cn',
            chineseWebsiteText: 'Learn more about Beijing Academy Education Group\'s other programs.',
            icpNumber: '京ICP备13051651号-1'
        }
    },
    zh: {
        title: '北京中学 · 国际教育项目',
        description: '北京中学教育集团通过北京中学国际部 (BAID) 和北中外籍人员子女学校 (ISBA) 提供 AP、剑桥国际初中及 A Level 项目。',
        navbar: NAVBAR_ZH,
        footer: {
            items: FOOTER_ZH,
            phoneText: '+86 186 1000 0000 (可添加微信)',
            emailText: 'baid@bjacademy.com.cn',
            copyrightText: '© 2026 北京中学教育集团，保留所有权利。',
            chineseWebsiteUrl: 'https://www.beijingacademy.com.cn',
            chineseWebsiteText: '了解北京中学教育集团的其他项目。',
            icpNumber: '京ICP备13051651号-1'
        }
    }
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback
}

function normalizeLinks(value: unknown, fallback: WebsiteLink[], prefix: string): WebsiteLink[] {
    if (!Array.isArray(value)) return clone(fallback)
    return value.map((item, index) => {
        const source = isRecord(item) ? item : {}
        const defaultItem = fallback[index]
        return {
            id: stringValue(source.id, defaultItem?.id ?? `${prefix}-${index + 1}`),
            name: stringValue(source.name, defaultItem?.name ?? ''),
            url: stringValue(source.url, defaultItem?.url ?? '')
        }
    })
}

function normalizeFooterItems(value: unknown, fallback: WebsiteFooterItem[]): WebsiteFooterItem[] {
    if (!Array.isArray(value)) return clone(fallback)
    return value.map((item, index) => {
        const source = isRecord(item) ? item : {}
        const defaultItem = fallback[index]
        const id = stringValue(source.id, defaultItem?.id ?? `footer-${index + 1}`)
        return {
            id,
            name: stringValue(source.name, defaultItem?.name ?? ''),
            url: stringValue(source.url, defaultItem?.url ?? ''),
            subItems: normalizeLinks(source.subItems, defaultItem?.subItems ?? [], `${id}-subitem`)
        }
    })
}

export function normalizeWebsiteMetadataContent(
    value: unknown,
    language: keyof WebsiteMetadataDraft
): WebsiteMetadataContent {
    const fallback = DEFAULT_WEBSITE_METADATA[language]
    if (!isRecord(value)) return clone(fallback)

    const footer = isRecord(value.footer) ? value.footer : {}
    return {
        title: stringValue(value.title, fallback.title),
        description: stringValue(value.description, fallback.description),
        navbar: normalizeLinks(value.navbar, fallback.navbar, 'navbar'),
        footer: {
            items: normalizeFooterItems(footer.items, fallback.footer.items),
            phoneText: stringValue(footer.phoneText, fallback.footer.phoneText),
            emailText: stringValue(footer.emailText, fallback.footer.emailText),
            copyrightText: stringValue(footer.copyrightText, fallback.footer.copyrightText),
            chineseWebsiteUrl: stringValue(footer.chineseWebsiteUrl, fallback.footer.chineseWebsiteUrl),
            chineseWebsiteText: stringValue(footer.chineseWebsiteText, fallback.footer.chineseWebsiteText),
            icpNumber: stringValue(footer.icpNumber, fallback.footer.icpNumber)
        }
    }
}

export function parseWebsiteMetadataContent(
    content: string | null | undefined,
    language: keyof WebsiteMetadataDraft
): WebsiteMetadataContent {
    if (!content) return clone(DEFAULT_WEBSITE_METADATA[language])
    try {
        return normalizeWebsiteMetadataContent(JSON.parse(content), language)
    } catch {
        return clone(DEFAULT_WEBSITE_METADATA[language])
    }
}

export function serializeWebsiteMetadataContent(content: WebsiteMetadataContent): string {
    return JSON.stringify(content)
}

export const WECHAT_CATEGORIES = {
    Academics: { categoryZH: '学术', categoryEN: 'Academics' },
    'College Counseling': { categoryZH: '大学升学指导', categoryEN: 'College Counseling' },
    'Campus Life': { categoryZH: '校园生活', categoryEN: 'Campus Life' },
    Admissions: { categoryZH: '招生', categoryEN: 'Admissions' }
} as const

export function parseWeChatCategory(category: unknown) {
    if (typeof category !== 'string' || !Object.hasOwn(WECHAT_CATEGORIES, category)) {
        throw new Error('AI 返回的文章分类无效，请重新导入。')
    }
    return WECHAT_CATEGORIES[category as keyof typeof WECHAT_CATEGORIES]
}

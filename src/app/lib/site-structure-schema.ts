export type SiteStructureTreeNode = {
    id: number
    titleEN: string
    titleZH: string
    slug: string
    jumpLabelEN: string | null
    jumpLabelZH: string | null
    jumpDescriptionEN: string | null
    jumpDescriptionZH: string | null
    pageEntityId: number | null
    position: number
    children: SiteStructureTreeNode[]
}

export type SiteStructureNavNode = {
    id: number
    titleEN: string
    titleZH: string
    slug: string
    subPages: Array<{
        id: number
        titleEN: string
        titleZH: string
        slug: string
    }>
}

export type SiteStructureFormNode = {
    id?: number
    titleEN: string
    titleZH: string
    slug: string
    jumpLabelEN?: string | null
    jumpLabelZH?: string | null
    jumpDescriptionEN?: string | null
    jumpDescriptionZH?: string | null
    pageEntityId?: number | null
    children: SiteStructureFormNode[]
}

export type DbSiteStructureItem = {
    id: number
    titleEN: string
    titleZH: string
    slug: string
    jumpLabelEN: string | null
    jumpLabelZH: string | null
    jumpDescriptionEN: string | null
    jumpDescriptionZH: string | null
    parentId: number | null
    position: number
    pageEntityId: number | null
}

export type SiteStructureResolvedChild = {
    id: number
    slug: string
    titleEN: string
    titleZH: string
    jumpLabelEN: string | null
    jumpLabelZH: string | null
    jumpDescriptionEN: string | null
    jumpDescriptionZH: string | null
    pageEntityId: number | null
    pageTitleEN: string | null
    pageTitleZH: string | null
    shortContentEN: string | null
    shortContentZH: string | null
}

export const DEFAULT_SITE_STRUCTURE: SiteStructureFormNode[] = [
    {
        titleEN: 'About Us',
        titleZH: '关于',
        slug: 'about',
        children: [
            { titleEN: 'Our Mission', titleZH: '我们的使命', slug: 'about', children: [] },
            { titleEN: 'Core Values', titleZH: '核心价值观', slug: 'about', children: [] },
            { titleEN: 'Accreditation', titleZH: '认证', slug: 'about', children: [] }
        ]
    },
    {
        titleEN: 'Academics',
        titleZH: '学术',
        slug: 'academics',
        children: [
            { titleEN: 'Middle School Program', titleZH: '初中项目', slug: 'academics/middle-school', pageEntityId: 31, children: [] },
            { titleEN: 'High School Program', titleZH: '高中项目', slug: 'academics/high-school', pageEntityId: 32, children: [] },
            { titleEN: 'Project-Based Learning', titleZH: '项目式学习', slug: 'academics/pbl', pageEntityId: 33, children: [] },
            { titleEN: 'College Counseling', titleZH: '大学升学指导', slug: 'academics/college-counseling', pageEntityId: 34, children: [] }
        ]
    },
    {
        titleEN: 'Life',
        titleZH: '学生生活',
        slug: 'life',
        children: [
            { titleEN: 'Clubs', titleZH: '社团', slug: 'life/clubs', pageEntityId: 36, children: [] },
            { titleEN: 'Electives', titleZH: '选修课', slug: 'life/electives', pageEntityId: 37, children: [] },
            { titleEN: 'Dining', titleZH: '用餐', slug: 'life/dining', pageEntityId: 38, children: [] },
            { titleEN: 'Athletics', titleZH: '运动', slug: 'life/athletics', pageEntityId: 39, children: [] },
            { titleEN: 'Activities', titleZH: '校园活动', slug: 'life/activities', pageEntityId: 40, children: [] }
        ]
    },
    {
        titleEN: 'Projects',
        titleZH: '自主项目',
        slug: 'projects',
        children: [
            { titleEN: 'Featured Projects', titleZH: '精选项目', slug: 'projects', children: [] },
            { titleEN: 'Gallery', titleZH: '项目展览', slug: 'projects', children: [] }
        ]
    },
    {
        titleEN: 'Admissions',
        titleZH: '招生',
        slug: 'admissions',
        children: [
            { titleEN: 'High School Admissions', titleZH: '高中项目招生', slug: 'admissions/baid', pageEntityId: 27, children: [] },
            { titleEN: 'Middle School Admissions', titleZH: '初中项目招生', slug: 'admissions/isba', children: [] }
        ]
    },
    {
        titleEN: 'News',
        titleZH: '新闻',
        slug: 'news',
        children: []
    }
]

export function buildSiteStructureTree(items: DbSiteStructureItem[], parentId: number | null = null): SiteStructureTreeNode[] {
    return items
        .filter(item => item.parentId === parentId)
        .sort((a, b) => a.position - b.position)
        .map(item => ({
            id: item.id,
            titleEN: item.titleEN,
            titleZH: item.titleZH,
            slug: item.slug,
            jumpLabelEN: item.jumpLabelEN,
            jumpLabelZH: item.jumpLabelZH,
            jumpDescriptionEN: item.jumpDescriptionEN,
            jumpDescriptionZH: item.jumpDescriptionZH,
            pageEntityId: item.pageEntityId,
            position: item.position,
            children: buildSiteStructureTree(items, item.id)
        }))
}

export function toSiteStructureNavigation(node: SiteStructureTreeNode): SiteStructureNavNode {
    return {
        id: node.pageEntityId ?? node.id,
        titleEN: node.titleEN,
        titleZH: node.titleZH,
        slug: node.slug,
        subPages: node.children.map(child => ({
            id: child.pageEntityId ?? child.id,
            titleEN: child.titleEN,
            titleZH: child.titleZH,
            slug: child.slug
        }))
    }
}

import { EntityType } from '@/generated/prisma/browser'
import { LibraryConfig } from '@/app/studio/editor/library-types'

export const LIBRARY_CONFIG: Record<EntityType, LibraryConfig> = {
    page: {
        title: '页面',
        description: '管理网站里的固定页面、专题页和导航入口页面。适合首页、栏目页、介绍页和专题页。',
        createLabel: '创建页面',
        examples: [ '首页专题', '招生总览', '项目式学习' ],
        entryPathLabel: '页面入口',
        publicPathHint: '会作为网站主结构中的页面入口使用'
    },
    post: {
        title: '文章',
        description: '管理新闻、公告、校园故事和活动回顾，适合按时间发布的内容。',
        createLabel: '创建文章',
        examples: [ '活动回顾', '学生故事', '校园新闻' ],
        entryPathLabel: '文章入口',
        publicPathHint: '会显示在文章列表和相关内容推荐中',
        sectionDescription: '文章可以挂到新闻栏目页中的精选区，也可以按主题分类后自动出现在浏览区。',
        categorySuggestions: [ '校园新闻', '学生故事', '活动回顾', '学术成果' ],
        landingPages: [
            {
                slug: 'news',
                title: '新闻栏目页',
                description: '公开站新闻入口页，用来承接精选文章和新闻浏览区。'
            }
        ]
    },
    club: {
        title: '社团',
        description: '管理社团介绍、社团文化、活动亮点和加入方式。每条内容都会形成独立详情页。',
        createLabel: '创建社团',
        examples: [ '机器人社', '辩论社', '音乐社' ],
        entryPathLabel: '社团详情页',
        publicPathHint: '会显示在公开网站的社团入口页和详情页里',
        sectionDescription: '社团内容可以加入社团栏目页的精选区，或按分类自动进入浏览区，让入口页和详情页真正联动。',
        categorySuggestions: [ '表演艺术', '学术研究', '公益服务', '体育健康', '科技创新' ],
        structureParentSlug: 'life',
        landingPages: [
            {
                slug: 'life/clubs',
                title: '社团栏目页',
                description: '公开站社团入口页，用来展示精选社团和按分类浏览社团。'
            }
        ]
    },
    activity: {
        title: '校园活动',
        description: '管理讲座、比赛、展演、节庆和校园活动内容，支持做成活动详情入口。',
        createLabel: '创建校园活动',
        examples: [ '开放日', '艺术展演', '竞赛周' ],
        entryPathLabel: '活动详情页',
        publicPathHint: '会显示在公开网站的活动入口页和详情页里',
        sectionDescription: '活动可以放到活动栏目页的精选活动区，也可以通过分类进入自动浏览区。',
        categorySuggestions: [ '节庆活动', '学术活动', '学生展示', '讲座工作坊', '校园传统' ],
        structureParentSlug: 'life',
        landingPages: [
            {
                slug: 'life/activities',
                title: '校园活动栏目页',
                description: '公开站活动入口页，用来展示精选活动和活动浏览区。'
            }
        ]
    },
    project: {
        title: '自主项目',
        description: '管理学生项目、成果展示和研究叙事，强调过程、问题和结果。',
        createLabel: '创建自主项目',
        examples: [ '科学研究', '艺术装置', '社区项目' ],
        entryPathLabel: '项目详情页',
        publicPathHint: '会显示在公开网站的项目入口页和详情页里',
        sectionDescription: '项目内容会进入项目栏目页的精选项目和分类浏览模块，适合按主题策展。',
        categorySuggestions: [ '科技与社会', '艺术', '生物学', '社会活动', '农业' ],
        structureParentSlug: 'projects',
        landingPages: [
            {
                slug: 'projects',
                title: '项目栏目页',
                description: '公开站项目入口页，用来展示精选项目和按主题浏览项目。'
            }
        ]
    },
    course: {
        title: '课程介绍',
        description: '管理课程介绍、学习路径、成果示例和适合对象。每门课程都可以单独进入。',
        createLabel: '创建课程',
        examples: [ 'AP Biology', 'World Literature', '设计思维' ],
        entryPathLabel: '课程详情页',
        publicPathHint: '会显示在公开网站的课程入口页和详情页里',
        sectionDescription: '课程可以进入高中项目页中的精选课程区，也可以按课程类别自动出现在浏览区。',
        categorySuggestions: [ 'AP', '国家课程', '跨学科', '人文学科', '科学课程' ],
        structureParentSlug: 'academics',
        landingPages: [
            {
                slug: 'academics/high-school',
                title: '高中项目栏目页',
                description: '公开站高中项目入口页，用来承接精选课程和按类别浏览课程。'
            }
        ]
    },
    faculty: {
        title: '教职工介绍',
        description: '管理老师和教职工介绍，突出教学理念、课程和代表项目。',
        createLabel: '创建教职工介绍',
        examples: [ '数学老师', '升学指导老师', '艺术教师' ],
        entryPathLabel: '人物详情页',
        publicPathHint: '会显示在公开网站的人物入口页和详情页里',
        sectionDescription: '教职工内容可以进入教职工栏目页的精选人物区，并按角色分类进入浏览区。',
        categorySuggestions: [ '学科教师', '导师', '升学指导', '艺术教师', '支持团队' ],
        structureParentSlug: 'faculty',
        landingPages: [
            {
                slug: 'faculty',
                title: '教职工栏目页',
                description: '公开站教职工入口页，用来展示人物聚焦和教职工浏览区。'
            }
        ]
    }
}

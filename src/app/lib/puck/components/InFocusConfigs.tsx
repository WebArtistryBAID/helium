import { ComponentConfig } from '@measured/puck'
import { imageTypeField, RESOLVED_CONTENT_ENTITY_TYPE, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import InFocusProjects from '@/app/lib/puck/components/InFocusProjects'
import { convertDatesToStrings, SimplifiedContentEntity } from '@/app/lib/data-types'
import { getContentEntity, getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/browser'
import InFocusNewStudents from '@/app/lib/puck/components/InFocusNewStudents'

export const InFocusNewStudentsConfig: ComponentConfig = {
    label: '欢迎新生',
    fields: {
        heroBg: imageTypeField('背景图片'),
        title: { label: '标题', type: 'text', contentEditable: true },
        description: { label: '描述', type: 'textarea', contentEditable: true },

        introTitle: { label: '新生引导标题', type: 'text', contentEditable: true },
        introDescription: { label: '新生引导描述', type: 'textarea', contentEditable: true },
        introCards: {
            label: '新生卡片',
            type: 'array',
            arrayFields: {
                href: { label: '链接', type: 'text' },
                image: imageTypeField('图片'),
                title: { label: '标题', type: 'text', contentEditable: true },
                shortContent: { label: '简介', type: 'textarea', contentEditable: true }
            },
            max: 4
        },

        resourcesTitle: { label: '资源标题', type: 'text', contentEditable: true },
        resourcesDescription: { label: '资源描述', type: 'textarea', contentEditable: true },
        resourcesImage: imageTypeField('资源图片'),
        resources: {
            label: '资源列表',
            type: 'array',
            arrayFields: {
                name: { label: '名称', type: 'text', contentEditable: true },
                content: { label: '内容', type: 'text', contentEditable: true }
            },
            max: 4
        },

        projectsTitle: { label: '项目标题', type: 'text', contentEditable: true },
        projectsDescription: { label: '项目描述', type: 'textarea', contentEditable: true },
        projects: {
            label: '项目',
            type: 'array',
            arrayFields: {
                project: {
                    label: '项目',
                    type: 'external',
                    fetchList: async ({ query }) => {
                        const page = await getPublishedContentEntities(
                            0,
                            EntityType.project,
                            query ?? undefined
                        )
                        return page.items.map((p) => ({
                            id: p.id,
                            title: p.titlePublishedZH ?? '(无标题)'
                        }))
                    },
                    placeholder: '选择',
                    showSearch: true
                },
                discipline: { label: '学科', type: 'text', contentEditable: true }
            },
            max: 6
        },
        resolvedHeroBg: { type: 'object', objectFields: {} },
        resolvedIntroCards: {
            type: 'array',
            visible: false,
            arrayFields: {}
        },
        resolvedResourcesImage: { type: 'object', objectFields: {} },
        resolvedProjects: {
            type: 'array',
            visible: false,
            arrayFields: {}
        },
        resolvedUploadPrefix: { type: 'text', visible: false }
    },

    defaultProps: {
        title: '欢迎新同学',
        description:
            '在国际部，时间过得比想象中快很多。从踏入校园前的那个暑假，一连串全新的活动便接踵而至。军训、社团招新、各类讲座与项目……不要紧张。掌握好节奏，你会发现，这一年远比想象中更充实。',
        introTitle: '准备好了吗?',
        introDescription: '除了享受青葱岁月之外，作为学生，我们的每个阶段都有一个目标。初中时，这个目标是准备中考。在国内高中，这个目标是准备高考。那么，到了国际部，我们需要做什么呢?',
        introCards: [
            {
                title: '大学申请制',
                shortContent: '在中国，高考是本科录取的主要途径。在大部分其他国家，申请是录取的主要途径，往往比中国更为复杂。'
            },
            {
                title: '英语学习',
                shortContent: '无论申请哪个国家，学习什么专业，提升英语都是非常重要的。我们邀请到综合英语老师姜辉，为大家介绍提升英语能力的秘诀。'
            },
            {
                title: '平衡课程与活动',
                shortContent: '在国际部，成绩固然很重要，但课外活动也同样重要。两者如何平衡? 这是每名同学的必修课。'
            },
            {
                title: '新生时间线',
                shortContent: '入学这一年，新生会经历哪些重要的时间节点? 这里有一份简要的时间线，帮助大家建立未来一年的规划。'
            }
        ],
        resourcesTitle: '从这里出发',
        resourcesDescription: '在北京中学国际部，你将获得通向世界的钥匙。学校为同学们提供了丰富的资源和支持，帮助大家实现梦想。',
        resources: [
            {
                name: '开设的 AP 课程',
                content: '22'
            },
            {
                name: '学生自主设立的社团',
                content: '49'
            },
            {
                name: '校内外教师开设的选修课',
                content: '25'
            },
            {
                name: '可供选择的科研项目',
                content: '5'
            }
        ],
        projectsTitle: '在探索中学习',
        projectsDescription: '在北京中学国际部，学习不仅是课堂上的事情。你可以参加各类课外活动，在实践中成长。不妨看看学长学姐都在做些什么!'
    },

    resolveData: async ({ props }) => {
        const resolvedHeroBg =
            props.heroBg == null ? null : convertDatesToStrings(await getImage(parseInt(props.heroBg)))

        const resolvedIntroCards = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (props.introCards ?? []).map(async (c: any) => {
                if (!c) return null
                return {
                    href: c.href,
                    image: c.image ? convertDatesToStrings(await getImage(parseInt(c.image))) : null,
                    title: c.title,
                    shortContent: c.shortContent
                }
            })
        )

        const resolvedProjects = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (props.projects ?? []).map(async (p: any) => {
                if (!p?.project?.id) return null
                return {
                    project: convertDatesToStrings(await getContentEntity(p.project.id)),
                    discipline: p.discipline
                }
            })
        )

        return {
            props: {
                resolvedHeroBg,
                resolvedIntroCards,
                resolvedProjects,
                resolvedResourcesImage: props.resourcesImage == null ? null : await getImage(parseInt(props.resourcesImage)),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },

    render: ({
                 resolvedHeroBg,
                 title,
                 description,
                 introTitle,
                 introDescription,
                 resolvedIntroCards,
                 resourcesTitle,
                 resourcesDescription,
                 resources,
                 resolvedResourcesImage,
                 projectsTitle,
                 projectsDescription,
                 resolvedProjects,
                 resolvedUploadPrefix
             }) => (
        <InFocusNewStudents
            heroBg={resolvedHeroBg}
            title={title}
            description={description}
            introTitle={introTitle}
            introDescription={introDescription}
            introCards={resolvedIntroCards}
            resourcesTitle={resourcesTitle}
            resourcesDescription={resourcesDescription}
            resourcesImage={resolvedResourcesImage}
            resources={resources}
            projectsTitle={projectsTitle}
            projectsDescription={projectsDescription}
            projects={resolvedProjects}
            uploadPrefix={resolvedUploadPrefix}
        />
    )
}

export interface InFocusProject {
    project: SimplifiedContentEntity | undefined
    discipline: string | undefined
    description: string | undefined // Contains <1></1> for highlight span
    linkText: string | undefined
}

export const InFocusProjectsConfig: ComponentConfig = {
    label: '自主项目',
    fields: {
        heroBg: imageTypeField('背景图片'),
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        description: {
            label: '描述',
            type: 'textarea',
            contentEditable: true
        },
        link: {
            label: '链接',
            type: 'text'
        },
        linkText: {
            label: '链接文字',
            type: 'text',
            contentEditable: true
        },
        projects: {
            label: '项目',
            type: 'array',
            arrayFields: {
                project: {
                    label: '项目',
                    type: 'external',
                    fetchList: async ({ query }) => {
                        if (!query) {
                            return (await getPublishedContentEntities(0, EntityType.project)).items.map(project => ({
                                id: project.id,
                                title: project.titlePublishedZH ?? '(无标题)'
                            }))
                        }
                        return (await getPublishedContentEntities(0, EntityType.project, query)).items.map(project => ({
                            id: project.id,
                            title: project.titlePublishedZH ?? '(无标题)'
                        }))
                    },
                    placeholder: '选择',
                    showSearch: true
                },
                discipline: {
                    label: '学科',
                    type: 'text',
                    contentEditable: true
                },
                description: {
                    label: '介绍',
                    type: 'textarea',
                    contentEditable: true
                },
                linkText: {
                    label: '链接文字',
                    type: 'text',
                    contentEditable: true
                }
            },
            max: 6
        },
        startTopText: {
            label: '收尾标题',
            type: 'text',
            contentEditable: true
        },
        startMainText: {
            label: '收尾文字',
            type: 'textarea',
            contentEditable: true
        },
        resolvedHeroBg: RESOLVED_IMAGE_TYPE,
        resolvedProjects: {
            type: 'array',
            visible: false,
            arrayFields: {
                project: RESOLVED_CONTENT_ENTITY_TYPE,
                discipline: { type: 'text' },
                description: { type: 'text' },
                linkText: { type: 'text' }
            }
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    defaultProps: {
        title: '世界因我更美好',
        description: '在北京中学，我们优秀的学生和敬业的教师踏上发现、探索和成长的旅程，在每一步中改变世界，让世界因我们而更加美好。',
        link: '/projects',
        linkText: '了解我们的学生如何改变世界',
        startTopText: '每一个脚步都算数',
        startMainText: '我们正让世界因我们而更美好。'
    },
    resolveData: async ({ props }) => {
        return {
            props: {
                resolvedHeroBg: props.heroBg == null ? null : convertDatesToStrings(await getImage(parseInt(props.heroBg))),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                resolvedProjects: await Promise.all((props.projects ?? []).map(async (item: any) => {
                    if (!item?.project?.id) return null
                    return {
                        project: convertDatesToStrings(await getContentEntity(item.project.id)),
                        discipline: item.discipline,
                        description: item.description,
                        linkText: item.linkText
                    }
                })),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({
                 resolvedHeroBg,
                 title,
                 description,
                 link,
                 linkText,
                 startTopText,
                 startMainText,
                 resolvedProjects,
                 resolvedUploadPrefix
             }) =>
        <InFocusProjects heroBg={resolvedHeroBg} title={title} description={description}
                         link={link} linkText={linkText} startTopText={startTopText} startMainText={startMainText}
                         resolvedProjects={resolvedProjects} uploadPrefix={resolvedUploadPrefix}/>
}

import { ComponentConfig } from '@measured/puck'
import { getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/browser'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { imageTypeField } from '@/app/lib/puck/custom-fields'
import FeaturedProjects from '@/app/lib/puck/components/FeaturedProjects'
import { convertDatesToStrings, getContentEntityURI } from '@/app/lib/data-types'

const FeaturedProjectsConfig: ComponentConfig = {
    label: '精选项目',
    fields: {
        title: {
            label: '标题',
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
                                title: project.titlePublishedZH ?? '(无标题)',
                                createdAt: project.createdAt,
                                slug: project.slug
                            }))
                        }
                        return (await getPublishedContentEntities(0, EntityType.project, query)).items.map(project => ({
                            id: project.id,
                            title: project.titlePublishedZH ?? '(无标题)',
                            createdAt: project.createdAt,
                            slug: project.slug
                        }))
                    },
                    placeholder: '选择',
                    showSearch: true
                },
                quote: {
                    label: '引用文字',
                    type: 'textarea',
                    contentEditable: true
                },
                name: {
                    label: '引用来源',
                    type: 'text',
                    contentEditable: true
                },
                image: imageTypeField('图片'),
                linkText: {
                    label: '链接文字',
                    type: 'text',
                    contentEditable: true
                }
            }
        },
        resolvedProjects: {
            type: 'array',
            visible: false,
            arrayFields: {}
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    resolveData: async ({ props }) => {
        return {
            props: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                resolvedProjects: await Promise.all((props.projects ?? []).map(async (item: any) => {
                    if (!item?.project?.id) return null
                    return {
                        quote: item.quote,
                        name: item.name,
                        link: getContentEntityURI(item.project.createdAt, item.project.slug),
                        linkText: item.linkText,
                        image: item.image == null ? null : convertDatesToStrings(await getImage(parseInt(item.image)))
                    }
                })),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        title: '精选项目'
    },
    render: ({ title, resolvedProjects, resolvedUploadPrefix }) =>
        <FeaturedProjects title={title} projects={resolvedProjects} uploadPrefix={resolvedUploadPrefix}/>
}

export default FeaturedProjectsConfig

import { EntityType } from '@/generated/prisma/browser'
import { ComponentConfig } from '@measured/puck'
import { getContentEntity, getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import Activities from '@/app/lib/puck/components/Activities'
import { convertDatesToStrings } from '@/app/lib/data-types'

const ActivitiesConfig: ComponentConfig = {
    label: '校园活动',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        activities: {
            label: '活动',
            type: 'array',
            arrayFields: {
                activity: {
                    label: '活动',
                    type: 'external',
                    fetchList: async ({ query }) => {
                        if (!query) {
                            return (await getPublishedContentEntities(0, EntityType.activity)).items.map(project => ({
                                id: project.id,
                                title: project.titlePublishedZH ?? '(无标题)'
                            }))
                        }
                        return (await getPublishedContentEntities(0, EntityType.activity, query)).items.map(project => ({
                            id: project.id,
                            title: project.titlePublishedZH ?? '(无标题)'
                        }))
                    },
                    placeholder: '选择',
                    showSearch: true
                }
            },
            max: 6
        },
        resolvedActivities: {
            type: 'array',
            visible: false,
            arrayFields: {
                activity: {
                    type: 'object',
                    objectFields: {}
                }
            }
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    defaultProps: {
        title: '校园活动'
    },
    resolveData: async ({ props }) => {
        return {
            props: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                resolvedActivities: await Promise.all((props.activities ?? []).map(async (item: any) => {
                    if (!item?.activity?.id) return null
                    return {
                        activity: convertDatesToStrings(await getContentEntity(item.activity.id))
                    }
                })),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ title, resolvedActivities, resolvedUploadPrefix }) =>
        <Activities title={title} resolvedActivities={resolvedActivities} uploadPrefix={resolvedUploadPrefix}/>
}

export default ActivitiesConfig

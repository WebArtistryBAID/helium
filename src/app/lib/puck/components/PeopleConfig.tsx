import People from '@/app/lib/puck/components/People'
import { convertDatesToStrings, getContentEntityURI } from '@/app/lib/data-types'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import { getPublishedContentEntities, getPublishedContentEntity } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/browser'
import { ComponentConfig } from '@puckeditor/core'

const PeopleConfig: ComponentConfig = {
    label: '人员',
    fields: {
        people: {
            label: '人员',
            type: 'array',
            arrayFields: {
                person: {
                    label: '人员',
                    type: 'external',
                    fetchList: async ({ query }) => {
                        if (!query) {
                            return (await getPublishedContentEntities(0, EntityType.faculty)).items.map(faculty => ({
                                id: faculty.id,
                                title: faculty.titlePublishedZH ?? '(无姓名)',
                                createdAt: faculty.createdAt,
                                slug: faculty.slug,
                                data: faculty
                            }))
                        }
                        return (await getPublishedContentEntities(0, EntityType.project, query)).items.map(faculty => ({
                            id: faculty.id,
                            title: faculty.titlePublishedZH ?? '(无姓名)',
                            createdAt: faculty.createdAt,
                            slug: faculty.slug,
                            data: faculty
                        }))
                    },
                    placeholder: '选择',
                    showSearch: true

                },
                title: {
                    label: '职称',
                    type: 'text',
                    contentEditable: true
                }
            }
        },
        resolvedPeople: {
            type: 'array',
            arrayFields: {},
            visible: false
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        return {
            props: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                resolvedPeople: (await Promise.all((props.people ?? []).map(async (item: any) => {
                    if (!item?.person?.id) return null
                    const entity = await getPublishedContentEntity(item.person.id)
                    if (!entity) return null
                    return {
                        id: item.person.id,
                        nameEN: entity.titlePublishedEN ?? '',
                        nameZH: entity.titlePublishedZH ?? '',
                        title: item.title,
                        descriptionEN: entity.shortContentPublishedEN ?? '',
                        descriptionZH: entity.shortContentPublishedZH ?? '',
                        link: getContentEntityURI(entity.createdAt, entity.slug),
                        image: convertDatesToStrings(entity.coverImagePublished)
                    }
                }))).filter(item => item != null),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ resolvedPeople, resolvedUploadPrefix }) =>
        <People people={resolvedPeople} uploadPrefix={resolvedUploadPrefix}/>
}

export default PeopleConfig

import { contentSortField } from '@/app/lib/content-sort'
import { ComponentConfig } from '@puckeditor/core'
import { getUploadServePath } from '@/app/lib/puck/resolve-resources'
import { getPublishedContentEntities } from '@/app/lib/puck/resolve-resources'
import { EntityType } from '@/generated/prisma/browser'
import Clubs from '@/app/lib/puck/components/Clubs'
import { convertDatesToStrings } from '@/app/lib/data-types'

const ClubsConfig: ComponentConfig = {
    label: '社团',
    fields: {
        clubs: {
            label: '社团（留空显示全部）',
            type: 'array',
            arrayFields: {
                club: {
                    label: '社团',
                    type: 'external',
                    fetchList: async ({ query }) => {
                        const firstPage = await getPublishedContentEntities(0, EntityType.club, query)
                        const clubs = [ ...firstPage.items ]
                        for (let page = 1; page < firstPage.pages; page++) {
                            const nextPage = await getPublishedContentEntities(page, EntityType.club, query)
                            clubs.push(...nextPage.items)
                        }
                        return clubs.map(club => ({
                            id: club.id,
                            title: club.titlePublishedZH ?? '(无名称)',
                            createdAt: club.createdAt,
                            slug: club.slug,
                            data: club
                        }))
                    },
                    placeholder: '选择',
                    showSearch: true
                }
            }
        },
        sort: contentSortField,
        title: {
            label: '标题',
            type: 'textarea',
            contentEditable: true
        },
        resolvedClubs: {
            visible: false,
            type: 'object',
            objectFields: {}
        },
        resolvedClubIds: {
            visible: false,
            type: 'array',
            arrayFields: {}
        },
        resolvedUploadPrefix: {
            visible: false,
            type: 'text'
        }
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const clubIds = (props.clubs ?? [])
            .map((item: { club?: { id?: number } | null } | null) => item?.club?.id)
            .filter((id: number | undefined): id is number => id != null)
        return {
            props: {
                resolvedClubs: convertDatesToStrings(await getPublishedContentEntities(0, EntityType.club, undefined, undefined, undefined, props.sort ?? 'title-en-asc', clubIds)),
                resolvedClubIds: clubIds,
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        clubs: [],
        sort: 'title-en-asc',
        title: '社团'
    },
    render: ({ sort, title, resolvedClubs, resolvedClubIds, resolvedUploadPrefix }) => {
        if (resolvedClubs == null) {
            return <></>
        }
        return <Clubs sort={sort} title={title} init={resolvedClubs} clubIds={resolvedClubIds} uploadPrefix={resolvedUploadPrefix}/>
    }
}

export default ClubsConfig

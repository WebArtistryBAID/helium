import { contentSortField } from '@/app/lib/content-sort'
import { ComponentConfig } from '@puckeditor/core'
import { getPublishedContentEntities } from '@/app/lib/puck/resolve-resources'
import { getUploadServePath } from '@/app/lib/puck/resolve-resources'
import { EntityType } from '@/generated/prisma/browser'
import NewsList from '@/app/lib/puck/components/NewsList'
import { convertDatesToStrings } from '@/app/lib/data-types'

const NewsListConfig: ComponentConfig = {
    label: '新闻列表',
    fields: {
        sort: contentSortField,
        category: {
            label: '筛选分类',
            type: 'text'
        },
        itemsPerPage: {
            label: '每页显示数量',
            type: 'number',
            min: 1,
            max: 100
        },
        resolvedEntitiesInit: {
            type: 'array',
            visible: false,
            arrayFields: {}
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    defaultProps: { sort: 'newest' },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const category = props.category?.trim() || undefined
        const itemsPerPage = Number.isFinite(props.itemsPerPage) ? Math.min(100, Math.max(1, Math.floor(props.itemsPerPage))) : undefined

        return {
            props: {
                resolvedEntitiesInit: convertDatesToStrings(await getPublishedContentEntities(0, EntityType.post, undefined, category, itemsPerPage, props.sort ?? 'newest')),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ sort, category, itemsPerPage, resolvedEntitiesInit, resolvedUploadPrefix }) => {
        if (resolvedEntitiesInit == null) {
            return <></>
        }
        return <NewsList sort={sort} init={resolvedEntitiesInit} uploadPrefix={resolvedUploadPrefix} category={category}
                         itemsPerPage={itemsPerPage}/>
    }
}

export default NewsListConfig

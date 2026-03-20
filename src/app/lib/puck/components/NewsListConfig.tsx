import { ComponentConfig } from '@measured/puck'
import { getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import { EntityType } from '@/generated/prisma/browser'
import NewsList from '@/app/lib/puck/components/NewsList'
import { convertDatesToStrings } from '@/app/lib/data-types'

const NewsListConfig: ComponentConfig = {
    label: '新闻列表',
    fields: {
        category: {
            label: '筛选分类',
            type: 'text'
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
    resolveData: async ({ props }) => {
        return {
            props: {
                resolvedEntitiesInit: convertDatesToStrings(await getPublishedContentEntities(0, EntityType.post, props.category)),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ resolvedEntitiesInit, resolvedUploadPrefix }) => {
        if (resolvedEntitiesInit == null) {
            return <></>
        }
        return <NewsList init={resolvedEntitiesInit} uploadPrefix={resolvedUploadPrefix}/>
    }
}

export default NewsListConfig

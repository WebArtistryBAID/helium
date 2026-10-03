import { ComponentConfig } from '@puckeditor/core'
import { getPublishedContentEntities } from '@/app/lib/puck/resolve-resources'
import { EntityType } from '@/generated/prisma/browser'
import { getUploadServePath } from '@/app/lib/puck/resolve-resources'
import LatestNews from '@/app/lib/puck/components/LatestNews'
import { convertDatesToStrings } from '@/app/lib/data-types'

const LatestNewsConfig: ComponentConfig = {
    label: '最新文章',
    fields: {
        category: {
            label: '筛选分类',
            type: 'text'
        },
        title: {
            label: '标题',
            type: 'text'
        },
        otherNewsText: {
            label: '其他文章头文字',
            type: 'text'
        },
        readMoreText: {
            label: '查看更多文字',
            type: 'text'
        },
        resolvedPosts: {
            type: 'array',
            arrayFields: {},
            visible: false
        },
        uploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    defaultProps: {
        title: 'BAID Stories',
        otherNewsText: '其他新闻',
        readMoreText: '了解更多'
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const category = props.category?.trim() || undefined
        const posts = convertDatesToStrings(await getPublishedContentEntities(0, EntityType.post, undefined, category))
        return {
            props: {
                uploadPrefix: await getUploadServePath(),
                resolvedPosts: posts.pages > 0 ? convertDatesToStrings(posts.items) : []
            }
        }
    },
    render: ({ title, otherNewsText, readMoreText, resolvedPosts, uploadPrefix }) => <LatestNews
        title={title}
        otherNewsText={otherNewsText}
        readMoreText={readMoreText}
        resolvedPosts={resolvedPosts}
        uploadPrefix={uploadPrefix}
    />
}

export default LatestNewsConfig

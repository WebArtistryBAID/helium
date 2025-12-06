import { ComponentConfig } from '@measured/puck'
import { getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/browser'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import LatestNews from '@/app/lib/puck/components/LatestNews'
import { convertDatesToStrings } from '@/app/lib/data-types'

const LatestNewsConfig: ComponentConfig = {
    label: '最新文章',
    fields: {
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
    resolveData: async () => {
        const posts = convertDatesToStrings(await getPublishedContentEntities(0, EntityType.post))
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

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
        sort: contentSortField,
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        resolvedClubs: {
            visible: false,
            type: 'object',
            objectFields: {}
        },
        resolvedUploadPrefix: {
            visible: false,
            type: 'text'
        }
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        return {
            props: {
                resolvedClubs: convertDatesToStrings(await getPublishedContentEntities(0, EntityType.club, undefined, undefined, undefined, props.sort ?? 'title-en-asc')),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        sort: 'title-en-asc',
        title: '社团'
    },
    render: ({ sort, title, resolvedClubs, resolvedUploadPrefix }) => {
        if (resolvedClubs == null) {
            return <></>
        }
        return <Clubs sort={sort} title={title} init={resolvedClubs} uploadPrefix={resolvedUploadPrefix}/>
    }
}

export default ClubsConfig

import { ComponentConfig } from '@measured/puck'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import { getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/browser'
import Clubs from '@/app/lib/puck/components/Clubs'
import { convertDatesToStrings } from '@/app/lib/data-types'

const ClubsConfig: ComponentConfig = {
    label: '社团',
    fields: {
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
    resolveData: async () => {
        return {
            props: {
                resolvedClubs: convertDatesToStrings(await getPublishedContentEntities(0, EntityType.club)),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        title: '社团'
    },
    render: ({ title, resolvedClubs, resolvedUploadPrefix }) => {
        if (resolvedClubs == null) {
            return <></>
        }
        return <Clubs title={title} init={resolvedClubs} uploadPrefix={resolvedUploadPrefix}/>
    }
}

export default ClubsConfig

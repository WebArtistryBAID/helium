import { ComponentConfig } from '@measured/puck'
import { imageTypeField } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import Accreditations from '@/app/lib/puck/components/Accreditations'
import { convertDatesToStrings } from '@/app/lib/data-types'

const AccreditationsConfig: ComponentConfig = {
    label: '认证',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        text: {
            label: '内容',
            type: 'textarea',
            contentEditable: true
        },
        accreditations: {
            label: '认证列表',
            type: 'array',
            arrayFields: {
                name: {
                    label: '名称',
                    type: 'text',
                    contentEditable: true
                },
                image: imageTypeField('图片')
            }
        },
        resolvedAccreditations: {
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
                resolvedUploadPrefix: await getUploadServePath(),
                resolvedAccreditations: await Promise.all((props.accreditations ?? []).map(async (accreditation: {
                    name: string | null;
                    image: string | null
                }) => {
                    if (!accreditation) return null
                    return {
                        name: accreditation.name,
                        image: accreditation.image == null ? null : convertDatesToStrings(await getImage(parseInt(accreditation.image)))
                    }
                }))
            }
        }
    },
    defaultProps: {
        title: '认证',
        text: '北京中学国际部获美国 College Board 认证，成为 AP 课程学校；是中国首家获得 CIS 认证的公立中学；同时获授权开设 ACT-GAC 和剑桥课程，并被评为“Apple 杰出学校”。'
    },
    render: ({ title, text, resolvedAccreditations, resolvedUploadPrefix }) =>
        <Accreditations title={title} text={text} accreditations={resolvedAccreditations}
                        uploadPrefix={resolvedUploadPrefix}/>
}

export default AccreditationsConfig

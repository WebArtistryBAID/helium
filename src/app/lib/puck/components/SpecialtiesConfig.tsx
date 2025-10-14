import { ComponentConfig } from '@measured/puck'
import { imageTypeField } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import Specialties from '@/app/lib/puck/components/Specialties'
import { convertDatesToStrings } from '@/app/lib/data-types'

const SpecialtiesConfig: ComponentConfig = {
    label: '学术特色卡片',
    fields: {
        items: {
            type: 'array',
            label: '项目',
            arrayFields: {
                name: {
                    label: '名称',
                    type: 'text',
                    contentEditable: true
                },
                description: {
                    label: '介绍',
                    type: 'textarea',
                    contentEditable: true
                },
                image: imageTypeField('图片')
            }
        },
        resolvedItems: {
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
                resolvedItems: await Promise.all((props.items ?? []).map(async (item: {
                    name: string | undefined;
                    description: string | undefined;
                    image: string | undefined
                }) => ({
                    name: item.name,
                    description: item.description,
                    image: item.image == null ? null : convertDatesToStrings(await getImage(parseInt(item.image)))
                }))),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        items: [
            {
                name: 'BA 大讲堂',
                description: 'BA 大讲堂邀请知名专家与杰出人物，为学生带来富有启发性的讲座，激发思考与灵感。'
            },
            {
                name: '阅历课程',
                description: '中华文化寻根阅历课程项目，通过一周省外实地考察的形式，深化同学们对中华文化丰富而独特内涵的理解。'
            },
            { name: '职业体验', description: '每年暑假，北京中学学生分赴各大知名企业，开展为期一周的深度职业体验活动。' },
            {
                name: '世界大课堂',
                description: '北京中学为期一个月的海外游学项目让学生沉浸于全球化学习与文化交流之中。'
            },
            {
                name: '北京文化探究项目',
                description: '“北京文化探究项目”，旨在探寻文化的力量，促进即将赴海外留学的高中生植根中华优秀传统文化，成为有根的人。'
            }
        ]
    },
    render: ({ resolvedItems, resolvedUploadPrefix }) => <Specialties items={resolvedItems}
                                                                      uploadPrefix={resolvedUploadPrefix}/>
}

export default SpecialtiesConfig

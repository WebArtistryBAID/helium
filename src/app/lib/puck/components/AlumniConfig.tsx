import { ComponentConfig } from '@measured/puck'
import { imageTypeField } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import Alumni from '@/app/lib/puck/components/Alumni'
import { convertDatesToStrings } from '@/app/lib/data-types'

const AlumniConfig: ComponentConfig = {
    label: '校友寄语',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        alumni: {
            label: '项目',
            type: 'array',
            arrayFields: {
                name: {
                    label: '姓名',
                    type: 'text',
                    contentEditable: true
                },
                quote: {
                    label: '寄语',
                    type: 'textarea',
                    contentEditable: true
                },
                image: imageTypeField('照片')
            }
        },
        resolvedAlumni: {
            visible: false,
            type: 'array',
            arrayFields: {}
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    defaultProps: {
        title: '校友寄语',
        alumni: [
            {
                name: '田学姐',
                quote: '这里是起点，是舞台，是被给予信任的空间。我在这里学会了成为一个全面发展的人，探索自我、理解他人、心怀社会。这里成就了中学的我，也会成就每一位北中人。'
            },
            {
                name: '王学长',
                quote: '我十分感谢北中对于学生个性化发展的支持和包容。在北京中学的这几年，我获得了兼收并蓄的思考方式、学会了如何培养以热情为导向的自主能动性、也发展了可以伴随我一生的兴趣和友谊。'
            },
            {
                name: '杨学姐',
                quote: '在我心中，北中的七年像一场温柔缱绻的梦。我在这里成长、蜕变，变成了我喜欢的模样。我永远珍视这里的每一段回忆；每每回首时，它们都能成为我继续前行的力量。'
            }
        ]
    },
    resolveData: async ({ props }) => {
        return {
            props: {
                resolvedAlumni: await Promise.all((props.alumni ?? []).map(async (alum: {
                    name: string | undefined;
                    quote: string | undefined;
                    image: string | undefined
                }) => {
                    if (!alum) return null
                    return {
                        name: alum.name,
                        quote: alum.quote,
                        image: alum.image == null ? null : convertDatesToStrings(await getImage(parseInt(alum.image)))
                    }
                })),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ title, resolvedAlumni, resolvedUploadPrefix }) =>
        <Alumni title={title} alumni={resolvedAlumni} uploadPrefix={resolvedUploadPrefix}/>
}

export default AlumniConfig

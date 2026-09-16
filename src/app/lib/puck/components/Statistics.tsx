import { ComponentConfig } from '@puckeditor/core'

interface StatsContent {
    name: string | undefined
    value: string | undefined
}

function Statistics({ title, content }: {
    title: string | undefined,
    content: (StatsContent | undefined)[] | undefined
}) {
    content = content?.filter((item) => item !== undefined && item.name !== undefined && item.value !== undefined)
    return <section aria-labelledby="statistics-heading" className="container !my-16 !py-12 md:!my-24 md:!py-16">
        <div className="flex flex-col gap-8 md:flex-row md:gap-10">
            <div className="w-full md:w-1/3">
                <h2 id="statistics-heading" className="text-3xl md:text-4xl font-bold">
                    {title}
                </h2>
            </div>
            <div
                aria-label="Statistics"
                className="grid w-full grid-cols-2 gap-6 md:w-2/3 md:grid-cols-2 md:gap-8"
                role="list">
                {content?.map((stat, index) => <div
                    key={index}
                    className="flex items-center"
                    aria-label={`${stat?.name}: ${stat?.value}`}
                    role="listitem">
                    <div>
                        <p aria-hidden className="break-words text-4xl text-red-900 sm:text-5xl lg:text-6xl">
                            {stat?.value}
                        </p>
                        <p className="text-base md:text-lg font-sans">
                            {stat?.name}
                        </p>
                    </div>
                </div>)}
            </div>
        </div>
    </section>
}

const StatisticsConfig: ComponentConfig = {
    label: '统计数据',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        content: {
            label: '内容',
            type: 'array',
            arrayFields: {
                name: {
                    label: '名称',
                    type: 'text',
                    contentEditable: true
                },
                value: {
                    label: '数值',
                    type: 'text',
                    contentEditable: true
                }
            }
        }
    },
    defaultProps: {
        title: '从数字看 BAID',
        content: [
            { name: '师生比', value: '1:7' },
            { name: '硕博教师比', value: '93%' },
            { name: '班额', value: '~20' }
        ]
    },
    render: ({ title, content }) => <Statistics title={title} content={content}/>
}

export default StatisticsConfig

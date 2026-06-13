import { ComponentConfig } from '@measured/puck'

interface StatsContent {
    name: string | undefined
    value: string | undefined
}

function Statistics({ title, content }: {
    title: string | undefined,
    content: (StatsContent | undefined)[] | undefined
}) {
    content = content?.filter((item) => item !== undefined && item.name !== undefined && item.value !== undefined)
    return <section aria-labelledby="statistics-heading" className="container !py-16 !my-24">
        <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 mb-8 md:mb-0">
                <h2 id="statistics-heading" className="text-3xl md:text-4xl font-bold">
                    {title}
                </h2>
            </div>
            <div
                aria-label="Statistics"
                className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-5"
                role="list">
                {content?.map((stat, index) => <div
                    key={index}
                    className="flex items-center"
                    aria-label={`${stat?.name}: ${stat?.value}`}
                    role="listitem">
                    <div>
                        <p aria-hidden className="text-5xl md:text-7xl text-red-900">
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

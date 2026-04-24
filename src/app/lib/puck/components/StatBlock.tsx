import { ComponentConfig } from '@measured/puck'

function StatItem({ prefix, value, labelEN, labelZH }: {
    prefix?: string
    value: string
    labelEN: string
    labelZH: string
}) {
    return (
        <div className="text-center p-4">
            <div className="text-4xl font-bold text-red-700 mb-1">
                {prefix}<span className="tabular-nums">{value}</span>
            </div>
            <p className="text-gray-600 font-medium">{labelEN}</p>
            <p className="text-gray-400 text-sm">{labelZH}</p>
        </div>
    )
}

function StatBlock({ titleEN, titleZH, items }: {
    titleEN: string
    titleZH: string
    items: Array<{ prefix?: string; value?: string; labelEN?: string; labelZH?: string }>
}) {
    return (
        <div className="my-8">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{titleEN}</h3>
            <p className="text-gray-500 text-sm text-center mb-6">{titleZH}</p>
            <div className={`grid gap-4 ${items?.length === 1 ? 'grid-cols-1' : items?.length === 2 ? 'grid-cols-2' : items?.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
                {items?.map((item, i) => (
                    <StatItem key={i} prefix={item.prefix} value={item.value ?? ''}
                              labelEN={item.labelEN ?? ''} labelZH={item.labelZH ?? ''}/>
                ))}
            </div>
        </div>
    )
}

const StatBlockConfig: ComponentConfig = {
    label: '统计数字',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        items: {
            label: '统计数据',
            type: 'array',
            arrayFields: {
                prefix: { label: '前缀（如 +、$）', type: 'text' },
                value: { label: '数值', type: 'text' },
                labelEN: { label: '标签（英文）', type: 'text' },
                labelZH: { label: '标签（中文）', type: 'text' }
            }
        }
    },
    defaultProps: {
        titleEN: 'At a Glance',
        titleZH: '一览',
        items: [
            { value: '6', labelEN: 'Learning areas', labelZH: '学习领域' },
            { value: '40+', labelEN: 'Student clubs', labelZH: '学生社团' },
            { value: '1:1', labelEN: 'Advisory support', labelZH: '个性化支持' }
        ]
    },
    render: ({ titleEN, titleZH, items }) => <StatBlock titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default StatBlockConfig

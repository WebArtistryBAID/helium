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
        titleEN: 'Statistics',
        titleZH: '统计数据',
        items: [
            { value: '100', labelEN: 'Students', labelZH: '学生' },
            { value: '20', labelEN: 'Teachers', labelZH: '教师' },
            { value: '50', labelEN: 'Clubs', labelZH: '社团' }
        ]
    },
    render: ({ titleEN, titleZH, items }) => <StatBlock titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default StatBlockConfig

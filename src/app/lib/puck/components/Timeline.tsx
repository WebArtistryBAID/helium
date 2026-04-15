import { ComponentConfig } from '@measured/puck'

function TimelineItem({ dateEN, dateZH, titleEN, titleZH, descriptionEN, descriptionZH }: {
    dateEN: string
    dateZH: string
    titleEN: string
    titleZH: string
    descriptionEN: string
    descriptionZH: string
}) {
    return (
        <div className="relative pl-8 pb-8 last:pb-0">
            <div className="absolute left-0 top-1 w-4 h-4 bg-red-700 rounded-full border-2 border-white shadow"/>
            <div className="absolute left-[7px] top-5 w-0.5 h-full bg-red-200 last:h-0"/>
            <div>
                <p className="text-sm font-bold text-red-700 mb-1">{dateEN} / {dateZH}</p>
                <p className="font-semibold text-gray-900">{titleEN}</p>
                <p className="text-sm text-gray-500 mb-1">{titleZH}</p>
                {descriptionEN && <p className="text-gray-600 text-sm">{descriptionEN}</p>}
                {descriptionZH && <p className="text-gray-500 text-sm">{descriptionZH}</p>}
            </div>
        </div>
    )
}

function Timeline({ titleEN, titleZH, items }: {
    titleEN: string
    titleZH: string
    items: Array<{ dateEN?: string; dateZH?: string; titleEN?: string; titleZH?: string; descriptionEN?: string; descriptionZH?: string }>
}) {
    return (
        <div className="my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{titleEN}</h2>
            <p className="text-gray-500 mb-6">{titleZH}</p>
            <div className="border-l-2 border-red-200 pl-4">
                {items?.map((item, i) => (
                    <TimelineItem key={i} dateEN={item.dateEN ?? ''} dateZH={item.dateZH ?? ''}
                                  titleEN={item.titleEN ?? ''} titleZH={item.titleZH ?? ''}
                                  descriptionEN={item.descriptionEN ?? ''} descriptionZH={item.descriptionZH ?? ''}/>
                ))}
            </div>
        </div>
    )
}

const TimelineConfig: ComponentConfig = {
    label: '时间线',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        items: {
            label: '时间节点',
            type: 'array',
            arrayFields: {
                dateEN: { label: '日期（英文）', type: 'text' },
                dateZH: { label: '日期（中文）', type: 'text' },
                titleEN: { label: '标题（英文）', type: 'text' },
                titleZH: { label: '标题（中文）', type: 'text' },
                descriptionEN: { label: '描述（英文）', type: 'text' },
                descriptionZH: { label: '描述（中文）', type: 'text' }
            }
        }
    },
    defaultProps: {
        titleEN: 'Timeline',
        titleZH: '时间线',
        items: []
    },
    render: ({ titleEN, titleZH, items }) => <Timeline titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default TimelineConfig

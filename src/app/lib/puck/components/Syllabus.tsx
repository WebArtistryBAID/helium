import { ComponentConfig } from '@measured/puck'

function SyllabusRow({ unitEN, unitZH, topicEN, topicZH, descriptionEN, descriptionZH, index }: {
    unitEN: string
    unitZH: string
    topicEN: string
    topicZH: string
    descriptionEN: string
    descriptionZH: string
    index: number
}) {
    return (
        <li className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                {index + 1}
            </span>
            <div className="flex-1">
                <div className="flex gap-2 items-baseline flex-wrap">
                    <span className="font-semibold text-gray-900">{unitEN}</span>
                    <span className="text-gray-400 text-sm">{unitZH}</span>
                    <span className="text-blue-600 font-medium">—</span>
                    <span className="text-gray-700">{topicEN}</span>
                    <span className="text-gray-400 text-sm">{topicZH}</span>
                </div>
                {(descriptionEN || descriptionZH) && (
                    <p className="text-sm text-gray-500 mt-1">{descriptionEN} {descriptionZH}</p>
                )}
            </div>
        </li>
    )
}

function Syllabus({ titleEN, titleZH, items }: {
    titleEN: string
    titleZH: string
    items: Array<{ unitEN?: string; unitZH?: string; topicEN?: string; topicZH?: string; descriptionEN?: string; descriptionZH?: string }>
}) {
    return (
        <div className="my-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">{titleZH}</p>
            <ol className="space-y-4 pl-2">
                {items?.map((item, i) => (
                    <SyllabusRow key={i} index={i} unitEN={item.unitEN ?? ''} unitZH={item.unitZH ?? ''}
                                 topicEN={item.topicEN ?? ''} topicZH={item.topicZH ?? ''}
                                 descriptionEN={item.descriptionEN ?? ''} descriptionZH={item.descriptionZH ?? ''}/>
                ))}
            </ol>
        </div>
    )
}

const SyllabusConfig: ComponentConfig = {
    label: '课程大纲',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        items: {
            label: '大纲条目',
            type: 'array',
            arrayFields: {
                unitEN: { label: '单元（英文）', type: 'text' },
                unitZH: { label: '单元（中文）', type: 'text' },
                topicEN: { label: '主题（英文）', type: 'text' },
                topicZH: { label: '主题（中文）', type: 'text' },
                descriptionEN: { label: '描述（英文，可选）', type: 'text' },
                descriptionZH: { label: '描述（中文，可选）', type: 'text' }
            }
        }
    },
    defaultProps: {
        titleEN: 'Syllabus',
        titleZH: '课程大纲',
        items: [
            { unitEN: 'Unit 1', unitZH: '第一单元', topicEN: 'Topic', topicZH: '主题' },
            { unitEN: 'Unit 2', unitZH: '第二单元', topicEN: 'Topic', topicZH: '主题' },
            { unitEN: 'Unit 3', unitZH: '第三单元', topicEN: 'Topic', topicZH: '主题' }
        ]
    },
    render: ({ titleEN, titleZH, items }) => <Syllabus titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default SyllabusConfig

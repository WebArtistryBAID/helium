import { ComponentConfig } from '@measured/puck'

type Milestone = {
    monthEN?: string
    monthZH?: string
    titleEN?: string
    titleZH?: string
    descriptionEN?: string
    descriptionZH?: string
}

function MilestoneCalendar({ eyebrow, titleEN, titleZH, items }: {
    eyebrow?: string
    titleEN?: string
    titleZH?: string
    items?: Milestone[]
}) {
    return <section className="section container !my-20">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
        <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{titleEN}</h2>
        <p className="mt-2 text-2xl font-bold text-gray-500">{titleZH}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {(items ?? []).map(item => <article key={`${item.monthEN}-${item.titleEN}`} className="border-t border-gray-200 pt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">{item.monthEN} / {item.monthZH}</p>
                <h3 className="mt-4 text-2xl font-serif font-bold text-gray-900">{item.titleEN}</h3>
                <p className="mt-1 text-lg font-bold text-gray-500">{item.titleZH}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">{item.descriptionEN}</p>
                <p className="text-sm leading-7 text-gray-500">{item.descriptionZH}</p>
            </article>)}
        </div>
    </section>
}

const MilestoneCalendarConfig: ComponentConfig = {
    label: '校历节点',
    fields: {
        eyebrow: { label: '上方小标题', type: 'text', contentEditable: true },
        titleEN: { label: '标题（英文）', type: 'text', contentEditable: true },
        titleZH: { label: '标题（中文）', type: 'text', contentEditable: true },
        items: {
            label: '节点',
            type: 'array',
            arrayFields: {
                monthEN: { label: '月份（英文）', type: 'text' },
                monthZH: { label: '月份（中文）', type: 'text' },
                titleEN: { label: '标题（英文）', type: 'text' },
                titleZH: { label: '标题（中文）', type: 'text' },
                descriptionEN: { label: '说明（英文）', type: 'textarea' },
                descriptionZH: { label: '说明（中文）', type: 'textarea' }
            },
            getItemSummary: item => item.titleZH || item.titleEN || '节点'
        }
    },
    defaultProps: {
        eyebrow: 'School Year',
        titleEN: 'Important moments through the year',
        titleZH: '一年中的重要节点',
        items: [
            { monthEN: 'September', monthZH: '九月', titleEN: 'New year begins', titleZH: '新学年开始', descriptionEN: 'Students enter courses, advisories, clubs, and community routines.', descriptionZH: '学生进入课程、导师制、社团和校园生活节奏。' },
            { monthEN: 'Winter', monthZH: '冬季', titleEN: 'Reflection and planning', titleZH: '反思与规划', descriptionEN: 'Students review learning progress and prepare for the next stage.', descriptionZH: '学生回顾学习进展，并为下一阶段做准备。' },
            { monthEN: 'Spring', monthZH: '春季', titleEN: 'Projects and exhibitions', titleZH: '项目与展示', descriptionEN: 'Learning becomes visible through presentations, projects, and community events.', descriptionZH: '学生通过展示、项目和校园活动呈现学习成果。' },
            { monthEN: 'June', monthZH: '六月', titleEN: 'Year-end growth', titleZH: '年度成长', descriptionEN: 'The school year closes with reflection, celebration, and next-step planning.', descriptionZH: '学年在反思、庆祝和后续规划中收束。' }
        ]
    },
    render: ({ eyebrow, titleEN, titleZH, items }) => (
        <MilestoneCalendar eyebrow={eyebrow} titleEN={titleEN} titleZH={titleZH} items={items}/>
    )
}

export default MilestoneCalendarConfig

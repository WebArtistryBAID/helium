import { ComponentConfig } from '@measured/puck'

type ProgramOption = {
    titleEN?: string
    titleZH?: string
    audienceEN?: string
    audienceZH?: string
    focusEN?: string
    focusZH?: string
    link?: string
    linkTextEN?: string
    linkTextZH?: string
}

function ProgramComparison({ eyebrow, titleEN, titleZH, descriptionEN, descriptionZH, options }: {
    eyebrow?: string
    titleEN?: string
    titleZH?: string
    descriptionEN?: string
    descriptionZH?: string
    options?: ProgramOption[]
}) {
    return <section className="section container !my-20 border-t border-gray-200 pt-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div>
                <h2 className="text-4xl font-serif font-bold text-gray-900 md:text-5xl">{titleEN}</h2>
                <p className="mt-2 text-2xl font-bold text-gray-500">{titleZH}</p>
            </div>
            <div className="space-y-3 text-base leading-8 text-gray-700">
                <p>{descriptionEN}</p>
                <p>{descriptionZH}</p>
            </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
            {(options ?? []).map(option => <article key={`${option.titleEN}-${option.titleZH}`} className="border-t border-gray-200 pt-6">
                <h3 className="text-2xl font-serif font-bold text-gray-900">{option.titleEN}</h3>
                <p className="mt-1 text-lg font-bold text-gray-500">{option.titleZH}</p>
                <div className="mt-5 space-y-4 text-sm leading-7 text-gray-700">
                    <div>
                        <p className="font-semibold uppercase tracking-[0.16em] text-[#7a1f1c]">Who It Serves / 适合对象</p>
                        <p className="mt-2">{option.audienceEN}</p>
                        <p className="text-gray-500">{option.audienceZH}</p>
                    </div>
                    <div>
                        <p className="font-semibold uppercase tracking-[0.16em] text-[#7a1f1c]">Focus / 项目重点</p>
                        <p className="mt-2">{option.focusEN}</p>
                        <p className="text-gray-500">{option.focusZH}</p>
                    </div>
                </div>
                {option.link ? <a href={option.link} className="mt-6 inline-block text-sm font-semibold text-[#7a1f1c] fancy-link">
                    {option.linkTextEN} / {option.linkTextZH}
                </a> : null}
            </article>)}
        </div>
    </section>
}

const ProgramComparisonConfig: ComponentConfig = {
    label: '项目对比',
    fields: {
        eyebrow: { label: '上方小标题', type: 'text', contentEditable: true },
        titleEN: { label: '标题（英文）', type: 'text', contentEditable: true },
        titleZH: { label: '标题（中文）', type: 'text', contentEditable: true },
        descriptionEN: { label: '简介（英文）', type: 'textarea', contentEditable: true },
        descriptionZH: { label: '简介（中文）', type: 'textarea', contentEditable: true },
        options: {
            label: '项目',
            type: 'array',
            arrayFields: {
                titleEN: { label: '项目名称（英文）', type: 'text' },
                titleZH: { label: '项目名称（中文）', type: 'text' },
                audienceEN: { label: '适合对象（英文）', type: 'textarea' },
                audienceZH: { label: '适合对象（中文）', type: 'textarea' },
                focusEN: { label: '项目重点（英文）', type: 'textarea' },
                focusZH: { label: '项目重点（中文）', type: 'textarea' },
                link: { label: '链接', type: 'text' },
                linkTextEN: { label: '链接文字（英文）', type: 'text' },
                linkTextZH: { label: '链接文字（中文）', type: 'text' }
            },
            getItemSummary: item => item.titleZH || item.titleEN || '项目'
        }
    },
    defaultProps: {
        eyebrow: 'Program Choices',
        titleEN: 'Choose the pathway that fits your family',
        titleZH: '选择适合家庭情况的申请路径',
        descriptionEN: 'Use this comparison to help families understand how different programs serve different student needs before they continue to application details.',
        descriptionZH: '这个模块帮助申请家庭先理解不同项目的对象和重点，再进入更具体的申请说明。',
        options: [
            {
                titleEN: 'Beijing Academy International Division',
                titleZH: '北京中学国际部',
                audienceEN: 'For eligible students seeking a high school pathway with international curriculum, inquiry, and college preparation.',
                audienceZH: '适合符合条件、希望进入高中阶段国际课程与升学准备路径的学生。',
                focusEN: 'Academic readiness, project-based learning, student life, and university preparation.',
                focusZH: '关注学术准备、项目式学习、校园生活与大学升学规划。',
                link: '/admissions/baid',
                linkTextEN: 'View program',
                linkTextZH: '查看项目'
            },
            {
                titleEN: 'International School of Beijing Academy',
                titleZH: '北中外籍人员子女学校',
                audienceEN: 'For families who need an international-school pathway that matches identity and enrollment requirements.',
                audienceZH: '适合需要按照外籍人员子女学校路径了解申请要求的家庭。',
                focusEN: 'Program fit, student identity requirements, and next-step admissions consultation.',
                focusZH: '关注项目匹配、身份要求与后续招生咨询。',
                link: '/admissions/isba',
                linkTextEN: 'View pathway',
                linkTextZH: '查看路径'
            }
        ]
    },
    render: ({ eyebrow, titleEN, titleZH, descriptionEN, descriptionZH, options }) => (
        <ProgramComparison
            eyebrow={eyebrow}
            titleEN={titleEN}
            titleZH={titleZH}
            descriptionEN={descriptionEN}
            descriptionZH={descriptionZH}
            options={options}
        />
    )
}

export default ProgramComparisonConfig

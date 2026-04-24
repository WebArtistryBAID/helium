import { ComponentConfig } from '@measured/puck'

type Outcome = {
    titleEN?: string
    titleZH?: string
    descriptionEN?: string
    descriptionZH?: string
}

function OutcomeShowcase({ eyebrow, titleEN, titleZH, descriptionEN, descriptionZH, outcomes }: {
    eyebrow?: string
    titleEN?: string
    titleZH?: string
    descriptionEN?: string
    descriptionZH?: string
    outcomes?: Outcome[]
}) {
    return <section className="section container !my-20 border-t border-gray-200 pt-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
                <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{titleEN}</h2>
                <p className="mt-2 text-2xl font-bold text-gray-500">{titleZH}</p>
                <p className="mt-6 text-base leading-8 text-gray-700">{descriptionEN}</p>
                <p className="text-base leading-8 text-gray-500">{descriptionZH}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
                {(outcomes ?? []).map(outcome => <article key={`${outcome.titleEN}-${outcome.titleZH}`} className="border-t border-gray-200 pt-5">
                    <h3 className="text-2xl font-serif font-bold text-gray-900">{outcome.titleEN}</h3>
                    <p className="mt-1 text-lg font-bold text-gray-500">{outcome.titleZH}</p>
                    <p className="mt-3 text-sm leading-7 text-gray-600">{outcome.descriptionEN}</p>
                    <p className="text-sm leading-7 text-gray-500">{outcome.descriptionZH}</p>
                </article>)}
            </div>
        </div>
    </section>
}

const OutcomeShowcaseConfig: ComponentConfig = {
    label: '成果展示',
    fields: {
        eyebrow: { label: '上方小标题', type: 'text', contentEditable: true },
        titleEN: { label: '标题（英文）', type: 'text', contentEditable: true },
        titleZH: { label: '标题（中文）', type: 'text', contentEditable: true },
        descriptionEN: { label: '简介（英文）', type: 'textarea', contentEditable: true },
        descriptionZH: { label: '简介（中文）', type: 'textarea', contentEditable: true },
        outcomes: {
            label: '成果',
            type: 'array',
            arrayFields: {
                titleEN: { label: '标题（英文）', type: 'text' },
                titleZH: { label: '标题（中文）', type: 'text' },
                descriptionEN: { label: '说明（英文）', type: 'textarea' },
                descriptionZH: { label: '说明（中文）', type: 'textarea' }
            },
            getItemSummary: item => item.titleZH || item.titleEN || '成果'
        }
    },
    defaultProps: {
        eyebrow: 'Student Outcomes',
        titleEN: 'What learning looks like when it becomes visible',
        titleZH: '当学习变得可见',
        descriptionEN: 'This block helps a school page show the outcomes families care about: student work, reflection, leadership, and readiness for the next stage.',
        descriptionZH: '这个模块适合展示家长关心的学习成果：学生作品、反思、领导力和面向下一阶段的准备。',
        outcomes: [
            { titleEN: 'Student work', titleZH: '学生作品', descriptionEN: 'Projects, writing, exhibitions, performances, or research that show how students think.', descriptionZH: '通过项目、写作、展览、演出或研究，看见学生如何思考。' },
            { titleEN: 'Reflection', titleZH: '反思能力', descriptionEN: 'Students learn to explain choices, evaluate progress, and plan next steps.', descriptionZH: '学生学习解释选择、评估进展，并规划下一步。' },
            { titleEN: 'Community contribution', titleZH: '社区参与', descriptionEN: 'Learning connects to real people, real needs, and a wider community.', descriptionZH: '学习连接真实的人、真实需求和更广阔的社区。' },
            { titleEN: 'Future readiness', titleZH: '面向未来', descriptionEN: 'Students build habits of inquiry, communication, and responsibility.', descriptionZH: '学生建立探究、沟通和责任感等面向未来的能力。' }
        ]
    },
    render: ({ eyebrow, titleEN, titleZH, descriptionEN, descriptionZH, outcomes }) => (
        <OutcomeShowcase
            eyebrow={eyebrow}
            titleEN={titleEN}
            titleZH={titleZH}
            descriptionEN={descriptionEN}
            descriptionZH={descriptionZH}
            outcomes={outcomes}
        />
    )
}

export default OutcomeShowcaseConfig

import { ComponentConfig } from '@measured/puck'

type Step = {
    title: string
    description: string
}

function PathwaySteps({
    eyebrow,
    title,
    steps
}: {
    eyebrow?: string
    title?: string
    steps?: Step[]
}) {
    return <section className="section container !my-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
        <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{title}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {(steps ?? []).map((step, index) => (
                <article key={`${step.title}-${index}`} className="border-t border-gray-200 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a1f1c]">
                        {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-4 text-2xl font-bold text-gray-900">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">{step.description}</p>
                </article>
            ))}
        </div>
    </section>
}

const PathwayStepsConfig: ComponentConfig = {
    label: '路径步骤',
    fields: {
        eyebrow: {
            label: '上方小标题',
            type: 'text',
            contentEditable: true
        },
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        steps: {
            label: '步骤',
            type: 'array',
            arrayFields: {
                title: {
                    label: '标题',
                    type: 'text'
                },
                description: {
                    label: '描述',
                    type: 'textarea'
                }
            },
            getItemSummary: item => item.title || '步骤'
        }
    },
    defaultProps: {
        eyebrow: 'Journey',
        title: 'Show how the experience unfolds over time',
        steps: [
            { title: 'Get to know the section', description: 'Use the first step to help visitors understand the purpose and context of this part of the school.' },
            { title: 'Join the experience', description: 'Explain how students, families, or community members participate here.' },
            { title: 'Grow through practice', description: 'Show what students build, rehearse, discuss, or create as they move through the experience.' },
            { title: 'See the outcomes', description: 'End with the visible results, reflections, performances, or next steps that come out of the process.' }
        ]
    },
    render: props => <PathwaySteps
        eyebrow={props.eyebrow}
        title={props.title}
        steps={props.steps}
    />
}

export default PathwayStepsConfig

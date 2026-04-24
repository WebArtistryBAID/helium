import { ComponentConfig } from '@measured/puck'

type GridItem = {
    title: string
    description: string
}

function KeyPointsGrid({
    eyebrow,
    title,
    items
}: {
    eyebrow?: string
    title?: string
    items?: GridItem[]
}) {
    return <section className="section container !my-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
        <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{title}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(items ?? []).map((item, index) => (
                <article key={`${item.title}-${item.description}`} className="border-t border-gray-200 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a1f1c]">
                        {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-4 text-2xl font-bold text-gray-900">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">{item.description}</p>
                </article>
            ))}
        </div>
    </section>
}

const KeyPointsGridConfig: ComponentConfig = {
    label: '特点卡片组',
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
        items: {
            label: '卡片',
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
            getItemSummary: item => item.title || '特点卡片'
        }
    },
    defaultProps: {
        eyebrow: 'Highlights',
        title: 'Show what visitors should notice first',
        items: [
            {
                title: 'Learning in context',
                description: 'Use a short card to explain how students experience this area of school life in practice.'
            },
            {
                title: 'People and culture',
                description: 'Highlight the tone, mentoring, collaboration, or community feeling that makes the section feel lived-in.'
            },
            {
                title: 'Visible outcomes',
                description: 'Point to the work, reflection, performances, projects, or growth visitors can expect to see here.'
            }
        ]
    },
    render: props => <KeyPointsGrid
        eyebrow={props.eyebrow}
        title={props.title}
        items={props.items}
    />
}

export default KeyPointsGridConfig

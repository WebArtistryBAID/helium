import { ComponentConfig } from '@measured/puck'

type IntroNote = {
    title?: string
    description?: string
}

function looksChinese(value: string | undefined) {
    return /[\u3400-\u9fff]/.test(value ?? '')
}

function SectionIntro({
    eyebrow,
    title,
    description,
    notes
}: {
    eyebrow: string
    title: string
    description: string
    notes?: IntroNote[]
}) {
    const items = (notes ?? []).filter(item => item?.title || item?.description)
    const isChinese = looksChinese(`${eyebrow} ${title} ${description}`)
    const asideLabel = isChinese ? '阅读提示' : 'Reading Guide'
    const asideText = isChinese
        ? '这一栏会把栏目定位、学习重点和访问路径梳理清楚，帮助第一次来到网站的人更快理解这部分内容。'
        : 'This section clarifies the purpose, learning focus, and browsing path so first-time visitors can understand this part of the school more quickly.'

    return <section className="section container !py-16 !my-16 border-t border-gray-200">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
                <h2 className="mt-3 text-4xl font-serif font-bold leading-tight text-gray-900 md:text-5xl">{title}</h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-gray-700 md:text-lg">{description}</p>
            </div>
            <div className="flex items-end">
                <div className="w-full border-l-4 border-[var(--standard-red)] pl-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">{asideLabel}</p>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                        {asideText}
                    </p>
                </div>
            </div>
        </div>
        {items.length > 0 && (
            <div className="mt-10 grid gap-8 md:grid-cols-3">
                {items.map(item => (
                    <div key={`${item.title}-${item.description}`} className="border-t border-gray-200 pt-5">
                        <p className="text-base font-bold text-gray-900">{item.title}</p>
                        {item.description && (
                            <p className="mt-2 text-sm leading-7 text-gray-600">{item.description}</p>
                        )}
                    </div>
                ))}
            </div>
        )}
    </section>
}

const SectionIntroConfig: ComponentConfig = {
    label: '栏目导语',
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
        description: {
            label: '简介',
            type: 'textarea',
            contentEditable: true
        },
        notes: {
            label: '补充说明',
            type: 'array',
            arrayFields: {
                title: {
                    label: '标题',
                    type: 'text'
                },
                description: {
                    label: '说明',
                    type: 'textarea'
                }
            },
            getItemSummary: item => item.title || '补充说明'
        }
    },
    defaultProps: {
        eyebrow: 'Overview',
        title: 'Introduce the purpose of this section clearly',
        description: 'Use this block to explain what visitors can discover here, how this part of the school fits into the larger experience, and why it matters for students and families.',
        notes: [
            {
                title: 'Who this is for',
                description: 'Clarify whether the page is most helpful for prospective families, current students, or the wider school community.'
            },
            {
                title: 'What to look for',
                description: 'Point readers toward the stories, programs, people, or pathways that best represent this section.'
            }
        ]
    },
    render: ({ eyebrow, title, description, notes }) => (
        <SectionIntro eyebrow={eyebrow} title={title} description={description} notes={notes}/>
    )
}

export default SectionIntroConfig

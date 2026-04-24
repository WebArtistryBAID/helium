import { ComponentConfig } from '@measured/puck'
import ReadMore from '@/app/lib/puck/components/ReadMore'

type HeroHighlight = {
    title?: string
    description?: string
}

function SectionHero({
    eyebrow,
    title,
    description,
    primaryLabel,
    primaryLink,
    secondaryLabel,
    secondaryLink,
    tone,
    highlights
}: {
    eyebrow?: string
    title?: string
    description?: string
    primaryLabel?: string
    primaryLink?: string
    secondaryLabel?: string
    secondaryLink?: string
    tone?: 'light' | 'dark'
    highlights?: HeroHighlight[]
}) {
    const dark = tone === 'dark'
    const items = (highlights ?? []).filter(item => item?.title || item?.description)

    return <section
        className={[
            'section border-t border-gray-200',
            dark ? 'bg-[#10233f] text-white' : 'bg-white text-black'
        ].join(' ')}
    >
        <div className="container py-20 md:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-end">
                <div className="max-w-4xl">
                    <p className={`uppercase tracking-[0.18em] text-sm ${dark ? 'text-white/70' : 'text-gray-500'}`}>
                        {eyebrow}
                    </p>
                    <h1 className={`mt-4 text-5xl md:text-6xl font-bold ${dark ? 'text-white' : 'font-serif'}`}>
                        {title}
                    </h1>
                    <p className={`mt-6 text-lg leading-8 max-w-3xl ${dark ? 'text-white/80' : 'text-gray-700'}`}>
                        {description}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-6">
                        {primaryLabel && primaryLink
                            ? <ReadMore
                                text={primaryLabel}
                                to={primaryLink}
                                color={dark ? '#ffffff' : '#82181a'}
                                iconColor={dark ? '#ffffff' : 'match'}
                            />
                            : null}
                        {secondaryLabel && secondaryLink
                            ? <ReadMore
                                text={secondaryLabel}
                                to={secondaryLink}
                                color={dark ? '#d9dfe8' : '#103c74'}
                                iconColor={dark ? '#d9dfe8' : '#103c74'}
                            />
                            : null}
                    </div>
                </div>

                {items.length > 0
                    ? <div className="grid gap-5">
                        {items.map(item => (
                            <div
                                key={`${item.title}-${item.description}`}
                                className={[
                                    'border-b pb-5',
                                    dark ? 'border-white/15' : 'border-gray-200'
                                ].join(' ')}
                            >
                                <p className={`text-2xl font-bold ${dark ? '' : 'font-serif'}`}>{item.title}</p>
                                {item.description
                                    ? <p className={`mt-2 leading-7 ${dark ? 'text-white/75' : 'text-gray-600'}`}>
                                        {item.description}
                                    </p>
                                    : null}
                            </div>
                        ))}
                    </div>
                    : null}
            </div>
        </div>
    </section>
}

const SectionHeroConfig: ComponentConfig = {
    label: '栏目首屏',
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
        primaryLabel: {
            label: '主按钮文字',
            type: 'text'
        },
        primaryLink: {
            label: '主按钮链接',
            type: 'text'
        },
        secondaryLabel: {
            label: '次按钮文字',
            type: 'text'
        },
        secondaryLink: {
            label: '次按钮链接',
            type: 'text'
        },
        highlights: {
            label: '补充亮点',
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
            getItemSummary: item => item.title || '亮点'
        },
        tone: {
            label: '色调',
            type: 'radio',
            options: [
                { label: '浅色', value: 'light' },
                { label: '深色', value: 'dark' }
            ]
        }
    },
    defaultProps: {
        eyebrow: 'Section Overview',
        title: 'Help visitors understand this part of the school at a glance',
        description: 'Use this opening area to introduce the section in a warm, public-facing way so families, students, and visitors quickly know what they can explore here.',
        primaryLabel: 'Start exploring',
        primaryLink: '#main-content',
        secondaryLabel: 'View highlights',
        secondaryLink: '#child-pages',
        highlights: [
            {
                title: 'Clear identity',
                description: 'Explain what makes this section distinctive in the life of the school.'
            },
            {
                title: 'Real student experience',
                description: 'Point visitors toward the people, programs, and stories that show this section in practice.'
            }
        ],
        tone: 'dark'
    },
    render: props => <SectionHero
        eyebrow={props.eyebrow}
        title={props.title}
        description={props.description}
        primaryLabel={props.primaryLabel}
        primaryLink={props.primaryLink}
        secondaryLabel={props.secondaryLabel}
        secondaryLink={props.secondaryLink}
        tone={props.tone}
        highlights={props.highlights}
    />
}

export default SectionHeroConfig

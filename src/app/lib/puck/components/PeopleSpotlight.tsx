import { ComponentConfig } from '@measured/puck'

type SpotlightPerson = {
    name: string
    role: string
    quote: string
    description?: string
}

function PeopleSpotlight({
    eyebrow,
    title,
    people
}: {
    eyebrow?: string
    title?: string
    people?: SpotlightPerson[]
}) {
    return <section className="section container !my-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
        <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{title}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(people ?? []).map((person, index) => (
                <article key={`${person.name}-${person.role}`} className="border-t border-gray-200 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">
                        {String(index + 1).padStart(2, '0')}
                    </p>
                    <p className="text-2xl font-serif font-bold text-gray-900">{person.name}</p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#7a1f1c]">
                        {person.role}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-gray-700">
                        {person.quote}
                    </p>
                    {person.description && (
                        <p className="mt-3 text-sm leading-7 text-gray-500">
                            {person.description}
                        </p>
                    )}
                </article>
            ))}
        </div>
    </section>
}

const PeopleSpotlightConfig: ComponentConfig = {
    label: '人物聚焦',
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
        people: {
            label: '人物',
            type: 'array',
            arrayFields: {
                name: {
                    label: '姓名',
                    type: 'text'
                },
                role: {
                    label: '角色',
                    type: 'text'
                },
                quote: {
                    label: '介绍',
                    type: 'textarea'
                },
                description: {
                    label: '补充说明',
                    type: 'textarea'
                }
            },
            getItemSummary: item => item.name || '人物'
        }
    },
    defaultProps: {
        eyebrow: 'Community Voices',
        title: 'Let visitors meet the people behind the experience',
        people: [
            {
                name: 'Faculty voice',
                role: 'Teacher or advisor',
                quote: 'Use this space for a short public-facing line that shows how this part of the school is guided and taught.',
                description: 'A teacher perspective works well when you want the page to feel thoughtful and grounded.'
            },
            {
                name: 'Student perspective',
                role: 'Student',
                quote: 'A brief student reflection can quickly make the section feel real, warm, and connected to lived experience.',
                description: 'This is especially useful on clubs, projects, activities, and pathways pages.'
            },
            {
                name: 'Community partner',
                role: 'Mentor or collaborator',
                quote: 'Use the third card for a program lead, coach, alumnus, or collaborator who helps visitors understand the wider impact of the section.',
                description: 'Keep the tone concise and outward-facing so it reads naturally on a public website.'
            }
        ]
    },
    render: props => <PeopleSpotlight
        eyebrow={props.eyebrow}
        title={props.title}
        people={props.people}
    />
}

export default PeopleSpotlightConfig

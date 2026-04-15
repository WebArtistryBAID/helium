import { ComponentConfig } from '@measured/puck'

function InstructorCard({ name, titleEN, titleZH, subjectEN, subjectZH, email, bioEN, bioZH, avatarUrl }: {
    name: string
    titleEN: string
    titleZH: string
    subjectEN: string
    subjectZH: string
    email?: string
    bioEN: string
    bioZH: string
    avatarUrl?: string
}) {
    return (
        <div className="bg-purple-50 rounded-2xl p-5 flex gap-4">
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover flex-shrink-0"/>
            ) : (
                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center text-purple-800 font-bold text-2xl flex-shrink-0">
                    {name[0]}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 text-lg">{name}</p>
                    <span className="text-purple-600 text-sm">{titleEN} / {titleZH}</span>
                </div>
                <p className="text-purple-700 text-sm font-medium">{subjectEN} / {subjectZH}</p>
                {email && <p className="text-gray-500 text-xs mt-1">{email}</p>}
                {(bioEN || bioZH) && <p className="text-gray-600 text-sm mt-2 line-clamp-3">{bioEN} {bioZH}</p>}
            </div>
        </div>
    )
}

function InstructorCardBlock({ titleEN, titleZH, items }: {
    titleEN: string
    titleZH: string
    items: Array<{ name?: string; titleEN?: string; titleZH?: string; subjectEN?: string; subjectZH?: string; email?: string; bioEN?: string; bioZH?: string; avatarUrl?: string }>
}) {
    return (
        <div className="my-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">{titleZH}</p>
            <div className="space-y-3">
                {items?.map((item, i) => (
                    <InstructorCard key={i} name={item.name ?? ''} titleEN={item.titleEN ?? ''} titleZH={item.titleZH ?? ''}
                                    subjectEN={item.subjectEN ?? ''} subjectZH={item.subjectZH ?? ''}
                                    email={item.email} bioEN={item.bioEN ?? ''} bioZH={item.bioZH ?? ''}
                                    avatarUrl={item.avatarUrl}/>
                ))}
            </div>
        </div>
    )
}

const InstructorCardConfig: ComponentConfig = {
    label: '任课教师',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        items: {
            label: '教师',
            type: 'array',
            arrayFields: {
                name: { label: '姓名', type: 'text' },
                titleEN: { label: '职称（英文）', type: 'text' },
                titleZH: { label: '职称（中文）', type: 'text' },
                subjectEN: { label: '科目（英文）', type: 'text' },
                subjectZH: { label: '科目（中文）', type: 'text' },
                email: { label: '邮箱（可选）', type: 'text' },
                bioEN: { label: '简介（英文）', type: 'text' },
                bioZH: { label: '简介（中文）', type: 'text' },
                avatarUrl: { label: '头像链接（可选）', type: 'text' }
            }
        }
    },
    defaultProps: {
        titleEN: 'Instructor',
        titleZH: '任课教师',
        items: [{ name: 'Kevin Li', titleEN: 'Professor', titleZH: '教授', subjectEN: '2013 - 2026', subjectZH: '2013 - 2026' }]
    },
    render: ({ titleEN, titleZH, items }) => <InstructorCardBlock titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default InstructorCardConfig

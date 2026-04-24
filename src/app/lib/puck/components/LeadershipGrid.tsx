import { ComponentConfig } from '@measured/puck'

function LeadershipCard({ name, roleEN, roleZH, period, avatarUrl }: {
    name: string
    roleEN: string
    roleZH: string
    period: string
    avatarUrl?: string
}) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full object-cover flex-shrink-0"/>
            ) : (
                <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center text-red-800 font-bold text-lg flex-shrink-0">
                    {name[0]}
                </div>
            )}
            <div>
                <p className="font-semibold text-gray-900">{name}</p>
                <p className="text-sm text-red-700">{roleEN} / {roleZH}</p>
                {period && <p className="text-xs text-gray-500">{period}</p>}
            </div>
        </div>
    )
}

function LeadershipGrid({ titleEN, titleZH, items }: {
    titleEN: string
    titleZH: string
    items: Array<{ name?: string; roleEN?: string; roleZH?: string; period?: string; avatarUrl?: string }>
}) {
    return (
        <div className="my-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">{titleZH}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items?.map((item, i) => (
                    <LeadershipCard key={i} name={item.name ?? ''} roleEN={item.roleEN ?? ''}
                                    roleZH={item.roleZH ?? ''} period={item.period ?? ''} avatarUrl={item.avatarUrl}/>
                ))}
            </div>
        </div>
    )
}

const LeadershipGridConfig: ComponentConfig = {
    label: '社团负责人',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        items: {
            label: '负责人',
            type: 'array',
            arrayFields: {
                name: { label: '姓名', type: 'text' },
                roleEN: { label: '职位（英文）', type: 'text' },
                roleZH: { label: '职位（中文）', type: 'text' },
                period: { label: '任期', type: 'text' },
                avatarUrl: { label: '头像链接（可选）', type: 'text' }
            }
        }
    },
    defaultProps: {
        titleEN: 'Student Leadership',
        titleZH: '学生负责人',
        items: [
            { name: 'Student Leader', roleEN: 'President', roleZH: '负责人', period: 'Current year' },
            { name: 'Faculty Advisor', roleEN: 'Advisor', roleZH: '指导教师', period: 'Ongoing' }
        ]
    },
    render: ({ titleEN, titleZH, items }) => <LeadershipGrid titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default LeadershipGridConfig

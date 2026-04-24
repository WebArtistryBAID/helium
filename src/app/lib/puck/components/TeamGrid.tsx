import { ComponentConfig } from '@measured/puck'

function TeamCard({ name, roleEN, roleZH, period, avatarUrl }: {
    name: string
    roleEN: string
    roleZH: string
    period: string
    avatarUrl?: string
}) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3"/>
            ) : (
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                    {name[0]}
                </div>
            )}
            <p className="font-semibold text-gray-900">{name}</p>
            <p className="text-blue-600 text-sm font-medium">{roleEN}</p>
            <p className="text-gray-500 text-xs">{roleZH}</p>
            {period && <p className="text-gray-400 text-xs mt-1">{period}</p>}
        </div>
    )
}

function TeamGrid({ titleEN, titleZH, items }: {
    titleEN: string
    titleZH: string
    items: Array<{ name?: string; roleEN?: string; roleZH?: string; period?: string; avatarUrl?: string }>
}) {
    return (
        <div className="my-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">{titleZH}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items?.map((item, i) => (
                    <TeamCard key={i} name={item.name ?? ''} roleEN={item.roleEN ?? ''}
                              roleZH={item.roleZH ?? ''} period={item.period ?? ''} avatarUrl={item.avatarUrl}/>
                ))}
            </div>
        </div>
    )
}

const TeamGridConfig: ComponentConfig = {
    label: '团队成员',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        items: {
            label: '成员',
            type: 'array',
            arrayFields: {
                name: { label: '姓名', type: 'text' },
                roleEN: { label: '角色（英文）', type: 'text' },
                roleZH: { label: '角色（中文）', type: 'text' },
                period: { label: '任期 / 期间', type: 'text' },
                avatarUrl: { label: '头像链接（可选）', type: 'text' }
            }
        }
    },
    defaultProps: {
        titleEN: 'People Behind the Program',
        titleZH: '项目中的人',
        items: [
            { name: 'Student Representative', roleEN: 'Student voice', roleZH: '学生代表', period: 'Current year' },
            { name: 'Faculty Advisor', roleEN: 'Program guide', roleZH: '项目指导', period: 'Ongoing' },
            { name: 'Community Partner', roleEN: 'Collaborator', roleZH: '合作伙伴', period: 'Project-based' }
        ]
    },
    render: ({ titleEN, titleZH, items }) => <TeamGrid titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default TeamGridConfig

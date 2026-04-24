import { ComponentConfig } from '@measured/puck'

function ContactItem({ icon, labelEN, labelZH, value, link }: {
    icon: string
    labelEN: string
    labelZH: string
    value: string
    link?: string
}) {
    const iconMap: Record<string, string> = {
        email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        wechat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
        phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
        website: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
        location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
    }
    const path = iconMap[icon] ?? iconMap.email
    const content = (
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path}/>
                </svg>
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{labelEN} / {labelZH}</p>
                <p className="text-gray-900 font-medium">{value}</p>
            </div>
        </div>
    )
    return link ? <a href={link} target="_blank" rel="noopener noreferrer" className="block hover:bg-gray-50 rounded-xl p-3 transition">{content}</a>
        : <div className="bg-gray-50 rounded-xl p-3">{content}</div>
}

function ContactCard({ titleEN, titleZH, items }: {
    titleEN: string
    titleZH: string
    items: Array<{ icon?: string; labelEN?: string; labelZH?: string; value?: string; link?: string }>
}) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 my-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">{titleZH}</p>
            <div className="space-y-3">
                {items?.map((item, i) => (
                    <ContactItem key={i} icon={item.icon ?? 'email'} labelEN={item.labelEN ?? ''}
                                 labelZH={item.labelZH ?? ''} value={item.value ?? ''} link={item.link}/>
                ))}
            </div>
        </div>
    )
}

const ContactCardConfig: ComponentConfig = {
    label: '联系方式',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        items: {
            label: '联系方式',
            type: 'array',
            arrayFields: {
                icon: {
                    label: '图标',
                    type: 'select',
                    options: [
                        { label: '邮箱', value: 'email' },
                        { label: '微信', value: 'wechat' },
                        { label: '电话', value: 'phone' },
                        { label: '网站', value: 'website' },
                        { label: '地址', value: 'location' }
                    ]
                },
                labelEN: { label: '标签（英文）', type: 'text' },
                labelZH: { label: '标签（中文）', type: 'text' },
                value: { label: '内容', type: 'text' },
                link: { label: '链接（可选）', type: 'text' }
            }
        }
    },
    defaultProps: {
        titleEN: 'Admissions Contact',
        titleZH: '招生咨询方式',
        items: [
            { icon: 'email', labelEN: 'Email', labelZH: '邮箱', value: 'admissions@beijing.academy' },
            { icon: 'website', labelEN: 'Online inquiry', labelZH: '线上咨询', value: 'Submit an inquiry through the admissions page', link: '/admissions' },
            { icon: 'location', labelEN: 'Campus', labelZH: '校园地址', value: 'Beijing Academy International Division' }
        ]
    },
    render: ({ titleEN, titleZH, items }) => <ContactCard titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default ContactCardConfig

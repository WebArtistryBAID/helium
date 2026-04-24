import { ComponentConfig } from '@measured/puck'

function QuoteBlock({ quoteEN, quoteZH, authorEN, authorZH, titleEN, titleZH, avatarUrl }: {
    quoteEN: string
    quoteZH: string
    authorEN: string
    authorZH: string
    titleEN: string
    titleZH: string
    avatarUrl?: string
}) {
    return (
        <blockquote className="my-8 bg-gray-50 rounded-2xl p-8 border-l-4 border-red-700 relative">
            <svg className="absolute top-4 right-4 w-8 h-8 text-red-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            <div className="flex gap-4 items-start">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={authorEN}
                         className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white shadow"/>
                ) : (
                    <div className="w-12 h-12 bg-red-200 text-red-800 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                        {authorEN[0] ?? '?'}
                    </div>
                )}
                <div>
                    <p className="text-gray-800 text-lg italic leading-relaxed mb-3">"{quoteEN}"</p>
                    <p className="text-gray-500 text-base italic leading-relaxed mb-3">{quoteZH}</p>
                    <footer className="text-sm">
                        <span className="font-semibold text-gray-900">{authorEN}</span>
                        {titleEN && <span className="text-gray-500 ml-2">{titleEN}</span>}
                        {(authorZH || titleZH) && (
                            <span className="text-gray-400 block mt-0.5">{authorZH} {titleZH}</span>
                        )}
                    </footer>
                </div>
            </div>
        </blockquote>
    )
}

const QuoteBlockConfig: ComponentConfig = {
    label: '引言块',
    fields: {
        quoteEN: { label: '引言（英文）', type: 'textarea' },
        quoteZH: { label: '引言（中文）', type: 'textarea' },
        authorEN: { label: '作者（英文）', type: 'text' },
        authorZH: { label: '作者（中文）', type: 'text' },
        titleEN: { label: '职位/头衔（英文）', type: 'text' },
        titleZH: { label: '职位/头衔（中文）', type: 'text' },
        avatarUrl: { label: '头像链接（可选）', type: 'text' }
    },
    defaultProps: {
        quoteEN: 'At BAID, students are encouraged to ask better questions, work with others, and turn learning into meaningful action.',
        quoteZH: '在北京中学国际部，学生被鼓励提出更好的问题，与他人协作，并把学习转化为有意义的行动。',
        authorEN: 'BAID Faculty',
        authorZH: '北京中学国际部教师',
        titleEN: 'Teacher perspective',
        titleZH: '教师视角',
        avatarUrl: ''
    },
    render: ({ quoteEN, quoteZH, authorEN, authorZH, titleEN, titleZH, avatarUrl }) =>
        <QuoteBlock quoteEN={quoteEN} quoteZH={quoteZH} authorEN={authorEN} authorZH={authorZH}
                    titleEN={titleEN} titleZH={titleZH} avatarUrl={avatarUrl}/>
}

export default QuoteBlockConfig

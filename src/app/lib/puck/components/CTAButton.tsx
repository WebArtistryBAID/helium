import { ComponentConfig } from '@measured/puck'

function CTAButton({ textEN, textZH, link, style }: {
    textEN: string
    textZH: string
    link: string
    style: string
}) {
    const base = style === 'secondary'
        ? 'bg-white border-2 border-red-700 text-red-700 hover:bg-red-50'
        : 'bg-red-700 text-white hover:bg-red-800'
    return (
        <div className="my-8 flex justify-center">
            <a href={link || '#'}
               className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-colors ${base}`}>
                <span>{textEN}</span>
                <span className="opacity-70">/</span>
                <span>{textZH}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
            </a>
        </div>
    )
}

const CTAButtonConfig: ComponentConfig = {
    label: '行动按钮',
    fields: {
        textEN: { label: '按钮文字（英文）', type: 'text' },
        textZH: { label: '按钮文字（中文）', type: 'text' },
        link: { label: '链接', type: 'text' },
        style: {
            label: '样式',
            type: 'select',
            options: [
                { label: '主要（红色填充）', value: 'primary' },
                { label: '次要（红色描边）', value: 'secondary' }
            ]
        }
    },
    defaultProps: {
        textEN: 'Explore This Section',
        textZH: '继续了解',
        link: '/admissions',
        style: 'primary'
    },
    render: ({ textEN, textZH, link, style }) => <CTAButton textEN={textEN} textZH={textZH} link={link} style={style}/>
}

export default CTAButtonConfig

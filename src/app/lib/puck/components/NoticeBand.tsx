import { ComponentConfig } from '@measured/puck'

function NoticeBand({ labelEN, labelZH, textEN, textZH, link, linkTextEN, linkTextZH }: {
    labelEN?: string
    labelZH?: string
    textEN?: string
    textZH?: string
    link?: string
    linkTextEN?: string
    linkTextZH?: string
}) {
    return <section className="section container !my-16">
        <div className="border-y border-gray-200 py-6 md:flex md:items-center md:justify-between md:gap-8">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a1f1c]">{labelEN} / {labelZH}</p>
                <p className="mt-3 text-xl font-serif font-bold text-gray-900">{textEN}</p>
                <p className="mt-1 text-base font-bold text-gray-500">{textZH}</p>
            </div>
            {link ? <a href={link} className="mt-5 inline-block text-sm font-semibold text-[#7a1f1c] fancy-link md:mt-0">
                {linkTextEN} / {linkTextZH}
            </a> : null}
        </div>
    </section>
}

const NoticeBandConfig: ComponentConfig = {
    label: '提示横条',
    fields: {
        labelEN: { label: '标签（英文）', type: 'text', contentEditable: true },
        labelZH: { label: '标签（中文）', type: 'text', contentEditable: true },
        textEN: { label: '正文（英文）', type: 'textarea', contentEditable: true },
        textZH: { label: '正文（中文）', type: 'textarea', contentEditable: true },
        link: { label: '链接', type: 'text' },
        linkTextEN: { label: '链接文字（英文）', type: 'text' },
        linkTextZH: { label: '链接文字（中文）', type: 'text' }
    },
    defaultProps: {
        labelEN: 'Important Note',
        labelZH: '重要提示',
        textEN: 'Admissions information may change from year to year. Please use the current official notice as the final reference.',
        textZH: '招生信息可能每年调整，请以当年官方通知为最终依据。',
        link: '/admissions',
        linkTextEN: 'View current admissions',
        linkTextZH: '查看当前招生'
    },
    render: ({ labelEN, labelZH, textEN, textZH, link, linkTextEN, linkTextZH }) => (
        <NoticeBand
            labelEN={labelEN}
            labelZH={labelZH}
            textEN={textEN}
            textZH={textZH}
            link={link}
            linkTextEN={linkTextEN}
            linkTextZH={linkTextZH}
        />
    )
}

export default NoticeBandConfig

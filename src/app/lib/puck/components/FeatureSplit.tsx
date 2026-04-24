import { ComponentConfig } from '@measured/puck'

function FeatureSplit({ eyebrow, titleEN, titleZH, bodyEN, bodyZH, sideTitleEN, sideTitleZH, sideBodyEN, sideBodyZH, link, linkTextEN, linkTextZH }: {
    eyebrow?: string
    titleEN?: string
    titleZH?: string
    bodyEN?: string
    bodyZH?: string
    sideTitleEN?: string
    sideTitleZH?: string
    sideBodyEN?: string
    sideBodyZH?: string
    link?: string
    linkTextEN?: string
    linkTextZH?: string
}) {
    return <section className="section container !my-20 border-t border-gray-200 pt-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
                <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{titleEN}</h2>
                <p className="mt-2 text-2xl font-bold text-gray-500">{titleZH}</p>
                <p className="mt-6 text-base leading-8 text-gray-700">{bodyEN}</p>
                <p className="text-base leading-8 text-gray-500">{bodyZH}</p>
                {link ? <a href={link} className="mt-6 inline-block text-sm font-semibold text-[#7a1f1c] fancy-link">
                    {linkTextEN} / {linkTextZH}
                </a> : null}
            </div>
            <aside className="border-l-4 border-[var(--standard-red)] pl-6">
                <h3 className="text-3xl font-serif font-bold text-gray-900">{sideTitleEN}</h3>
                <p className="mt-2 text-xl font-bold text-gray-500">{sideTitleZH}</p>
                <p className="mt-5 text-sm leading-7 text-gray-700">{sideBodyEN}</p>
                <p className="text-sm leading-7 text-gray-500">{sideBodyZH}</p>
            </aside>
        </div>
    </section>
}

const FeatureSplitConfig: ComponentConfig = {
    label: '双栏重点介绍',
    fields: {
        eyebrow: { label: '上方小标题', type: 'text', contentEditable: true },
        titleEN: { label: '主标题（英文）', type: 'text', contentEditable: true },
        titleZH: { label: '主标题（中文）', type: 'text', contentEditable: true },
        bodyEN: { label: '正文（英文）', type: 'textarea', contentEditable: true },
        bodyZH: { label: '正文（中文）', type: 'textarea', contentEditable: true },
        sideTitleEN: { label: '侧栏标题（英文）', type: 'text', contentEditable: true },
        sideTitleZH: { label: '侧栏标题（中文）', type: 'text', contentEditable: true },
        sideBodyEN: { label: '侧栏正文（英文）', type: 'textarea', contentEditable: true },
        sideBodyZH: { label: '侧栏正文（中文）', type: 'textarea', contentEditable: true },
        link: { label: '链接', type: 'text' },
        linkTextEN: { label: '链接文字（英文）', type: 'text' },
        linkTextZH: { label: '链接文字（中文）', type: 'text' }
    },
    defaultProps: {
        eyebrow: 'School Experience',
        titleEN: 'A page section for explaining what matters most',
        titleZH: '说明学校最重要的体验',
        bodyEN: 'Use this block to introduce a program, pathway, student experience, or value in a warmer and more readable way.',
        bodyZH: '这个模块适合用更清楚、更有温度的方式介绍项目、路径、学生体验或学校价值。',
        sideTitleEN: 'What families should notice',
        sideTitleZH: '家长可以关注什么',
        sideBodyEN: 'Point families toward the evidence they can see: student work, teacher guidance, campus culture, and future readiness.',
        sideBodyZH: '引导家长关注能看见的证据：学生作品、教师指导、校园文化和未来准备。',
        link: '/about',
        linkTextEN: 'Learn more',
        linkTextZH: '了解更多'
    },
    render: ({
        eyebrow,
        titleEN,
        titleZH,
        bodyEN,
        bodyZH,
        sideTitleEN,
        sideTitleZH,
        sideBodyEN,
        sideBodyZH,
        link,
        linkTextEN,
        linkTextZH
    }) => (
        <FeatureSplit
            eyebrow={eyebrow}
            titleEN={titleEN}
            titleZH={titleZH}
            bodyEN={bodyEN}
            bodyZH={bodyZH}
            sideTitleEN={sideTitleEN}
            sideTitleZH={sideTitleZH}
            sideBodyEN={sideBodyEN}
            sideBodyZH={sideBodyZH}
            link={link}
            linkTextEN={linkTextEN}
            linkTextZH={linkTextZH}
        />
    )
}

export default FeatureSplitConfig

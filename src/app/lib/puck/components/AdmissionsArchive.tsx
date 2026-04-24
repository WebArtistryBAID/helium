import { ComponentConfig } from '@measured/puck'

type ArchiveItem = {
    year?: string
    titleEN?: string
    titleZH?: string
    summaryEN?: string
    summaryZH?: string
    statusEN?: string
    statusZH?: string
    link?: string
}

function AdmissionsArchive({ eyebrow, titleEN, titleZH, descriptionEN, descriptionZH, items }: {
    eyebrow?: string
    titleEN?: string
    titleZH?: string
    descriptionEN?: string
    descriptionZH?: string
    items?: ArchiveItem[]
}) {
    return <section className="section container !my-20">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
                <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{titleEN}</h2>
                <p className="mt-2 text-2xl font-bold text-gray-500">{titleZH}</p>
            </div>
            <div className="max-w-xl text-sm leading-7 text-gray-600">
                <p>{descriptionEN}</p>
                <p>{descriptionZH}</p>
            </div>
        </div>
        <div className="divide-y divide-gray-200 border-y border-gray-200">
            {(items ?? []).map(item => <a key={`${item.year}-${item.titleEN}`} href={item.link || '#'} className="group grid gap-4 py-6 md:grid-cols-[8rem_minmax(0,1fr)_10rem] md:items-center">
                <p className="text-3xl font-serif font-bold text-[#7a1f1c]">{item.year}</p>
                <div>
                    <h3 className="text-2xl font-serif font-bold text-gray-900 fancy-link">{item.titleEN}</h3>
                    <p className="mt-1 text-lg font-bold text-gray-500">{item.titleZH}</p>
                    <p className="mt-3 text-sm leading-7 text-gray-600">{item.summaryEN}</p>
                    <p className="text-sm leading-7 text-gray-500">{item.summaryZH}</p>
                </div>
                <p className="text-sm font-semibold text-[#7a1f1c] md:text-right">{item.statusEN} / {item.statusZH}</p>
            </a>)}
        </div>
    </section>
}

const AdmissionsArchiveConfig: ComponentConfig = {
    label: '往年申请列表',
    fields: {
        eyebrow: { label: '上方小标题', type: 'text', contentEditable: true },
        titleEN: { label: '标题（英文）', type: 'text', contentEditable: true },
        titleZH: { label: '标题（中文）', type: 'text', contentEditable: true },
        descriptionEN: { label: '简介（英文）', type: 'textarea', contentEditable: true },
        descriptionZH: { label: '简介（中文）', type: 'textarea', contentEditable: true },
        items: {
            label: '年份',
            type: 'array',
            arrayFields: {
                year: { label: '年份', type: 'text' },
                titleEN: { label: '标题（英文）', type: 'text' },
                titleZH: { label: '标题（中文）', type: 'text' },
                summaryEN: { label: '说明（英文）', type: 'textarea' },
                summaryZH: { label: '说明（中文）', type: 'textarea' },
                statusEN: { label: '状态（英文）', type: 'text' },
                statusZH: { label: '状态（中文）', type: 'text' },
                link: { label: '链接', type: 'text' }
            },
            getItemSummary: item => item.year || '年份'
        }
    },
    defaultProps: {
        eyebrow: 'Admissions Archive',
        titleEN: 'Previous admissions information',
        titleZH: '往年申请信息',
        descriptionEN: 'Keep past admissions notices in one place so families can understand previous timelines and prepare questions for the current year.',
        descriptionZH: '集中整理往年招生信息，帮助家庭了解过去的时间安排，并为当年咨询准备问题。',
        items: [
            {
                year: '2025',
                titleEN: 'High School Admissions Reference',
                titleZH: '高中项目招生参考',
                summaryEN: 'A reference entry for families reviewing previous admissions rhythms and information categories.',
                summaryZH: '供家庭了解往年招生节奏和信息类别，具体要求请以当年官方通知为准。',
                statusEN: 'Reference',
                statusZH: '参考',
                link: '/admissions/baid'
            },
            {
                year: '2024',
                titleEN: 'Program Information Reference',
                titleZH: '项目说明参考',
                summaryEN: 'Use older information only as context; the current admissions page remains the authoritative source.',
                summaryZH: '往年信息仅供了解背景，最新要求以当前招生页面和官方通知为准。',
                statusEN: 'Archive',
                statusZH: '归档',
                link: '/admissions'
            }
        ]
    },
    render: ({ eyebrow, titleEN, titleZH, descriptionEN, descriptionZH, items }) => (
        <AdmissionsArchive
            eyebrow={eyebrow}
            titleEN={titleEN}
            titleZH={titleZH}
            descriptionEN={descriptionEN}
            descriptionZH={descriptionZH}
            items={items}
        />
    )
}

export default AdmissionsArchiveConfig

import { ComponentConfig } from '@measured/puck'

type ResourceItem = {
    titleEN?: string
    titleZH?: string
    descriptionEN?: string
    descriptionZH?: string
    link?: string
    typeEN?: string
    typeZH?: string
}

function ResourceDownloads({ eyebrow, titleEN, titleZH, items }: {
    eyebrow?: string
    titleEN?: string
    titleZH?: string
    items?: ResourceItem[]
}) {
    return <section className="section container !my-20 border-t border-gray-200 pt-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
        <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{titleEN}</h2>
        <p className="mt-2 text-2xl font-bold text-gray-500">{titleZH}</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
            {(items ?? []).map(item => <a key={`${item.titleEN}-${item.titleZH}`} href={item.link || '#'} className="group border-t border-gray-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">{item.typeEN} / {item.typeZH}</p>
                <h3 className="mt-3 text-2xl font-serif font-bold text-gray-900 fancy-link">{item.titleEN}</h3>
                <p className="mt-1 text-lg font-bold text-gray-500">{item.titleZH}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">{item.descriptionEN}</p>
                <p className="text-sm leading-7 text-gray-500">{item.descriptionZH}</p>
            </a>)}
        </div>
    </section>
}

const ResourceDownloadsConfig: ComponentConfig = {
    label: '资料下载/链接',
    fields: {
        eyebrow: { label: '上方小标题', type: 'text', contentEditable: true },
        titleEN: { label: '标题（英文）', type: 'text', contentEditable: true },
        titleZH: { label: '标题（中文）', type: 'text', contentEditable: true },
        items: {
            label: '资料',
            type: 'array',
            arrayFields: {
                titleEN: { label: '标题（英文）', type: 'text' },
                titleZH: { label: '标题（中文）', type: 'text' },
                descriptionEN: { label: '说明（英文）', type: 'textarea' },
                descriptionZH: { label: '说明（中文）', type: 'textarea' },
                link: { label: '链接', type: 'text' },
                typeEN: { label: '类型（英文）', type: 'text' },
                typeZH: { label: '类型（中文）', type: 'text' }
            },
            getItemSummary: item => item.titleZH || item.titleEN || '资料'
        }
    },
    defaultProps: {
        eyebrow: 'Resources',
        titleEN: 'Helpful links and materials',
        titleZH: '常用资料与链接',
        items: [
            {
                titleEN: 'Admissions overview',
                titleZH: '招生总览',
                descriptionEN: 'Start with the current admissions page for the latest program pathway information.',
                descriptionZH: '请先查看当前招生页面，了解最新项目路径信息。',
                link: '/admissions',
                typeEN: 'Page',
                typeZH: '页面'
            },
            {
                titleEN: 'High school program',
                titleZH: '高中项目',
                descriptionEN: 'Learn how curriculum, student life, and college preparation connect in the high school years.',
                descriptionZH: '了解高中阶段课程、校园生活和升学准备如何连接。',
                link: '/academics/high-school',
                typeEN: 'Program',
                typeZH: '项目'
            }
        ]
    },
    render: ({ eyebrow, titleEN, titleZH, items }) => (
        <ResourceDownloads eyebrow={eyebrow} titleEN={titleEN} titleZH={titleZH} items={items}/>
    )
}

export default ResourceDownloadsConfig

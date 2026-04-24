import { ComponentConfig } from '@measured/puck'
import { getSiteStructureChildren } from '@/app/lib/site-structure-actions'
import LocalizedLink from '@/app/[[...slug]]/LocalizedLink'
import If from '@/app/lib/If'

type ResolvedChildPage = {
    id: number
    slug: string
    titleEN: string
    titleZH: string
    jumpLabelEN: string | null
    jumpLabelZH: string | null
    jumpDescriptionEN: string | null
    jumpDescriptionZH: string | null
    pageTitleEN: string | null
    pageTitleZH: string | null
    shortContentEN: string | null
    shortContentZH: string | null
}

function ChildPageLinks({
    eyebrow,
    title,
    parentSlug,
    emptyState,
    resolvedItems
}: {
    eyebrow?: string
    title?: string
    parentSlug?: string
    emptyState?: string
    resolvedItems?: ResolvedChildPage[]
}) {
    const items = resolvedItems ?? []

    return <section id="child-pages" className="section container !my-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
                <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{title}</h2>
            </div>
        </div>

        <If condition={items.length > 0}>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map(item => {
                    const labelZH = item.jumpLabelZH || item.pageTitleZH || item.titleZH
                    const labelEN = item.jumpLabelEN || item.pageTitleEN || item.titleEN
                    const descriptionZH = item.jumpDescriptionZH || item.shortContentZH || ''
                    const descriptionEN = item.jumpDescriptionEN || item.shortContentEN || ''

                    return <LocalizedLink
                        key={item.id}
                        slug={item.slug}
                        className="group block border-t border-gray-200 pt-6"
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">
                            {parentSlug}
                        </p>
                        <h3 className="mt-3 text-2xl font-serif font-bold leading-tight text-gray-900 fancy-link">
                            {labelZH}
                        </h3>
                        <p className="mt-2 text-sm font-medium text-gray-500">{labelEN}</p>
                        <p className="mt-3 text-sm leading-7 text-gray-600">{descriptionZH}</p>
                        <If condition={descriptionEN !== ''}>
                            <p className="text-sm leading-7 text-gray-500">{descriptionEN}</p>
                        </If>
                        <div className="mt-5 text-sm font-semibold text-[#7a1f1c]">查看详情</div>
                        <span className="sr-only">{labelZH}{descriptionZH ? ` - ${descriptionZH}` : ''}</span>
                    </LocalizedLink>
                })}
            </div>
        </If>

        <If condition={items.length < 1}>
            <div className="mt-8 rounded-[1.75rem] border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-gray-600">
                {emptyState}
            </div>
        </If>
    </section>
}

const ChildPageLinksConfig: ComponentConfig = {
    label: '子页面跳转组',
    fields: {
        eyebrow: {
            label: '上方小标题',
            type: 'text',
            contentEditable: true
        },
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        parentSlug: {
            label: '父级结构 slug',
            type: 'text'
        },
        emptyState: {
            label: '空状态文案',
            type: 'textarea'
        },
        resolvedItems: {
            type: 'array',
            arrayFields: {},
            visible: false
        }
    },
    resolveData: async ({ props }) => {
        const parentSlug = typeof props.parentSlug === 'string' ? props.parentSlug.trim() : ''

        return {
            props: {
                ...props,
                resolvedItems: parentSlug ? await getSiteStructureChildren(parentSlug) : []
            }
        }
    },
    defaultProps: {
        eyebrow: 'Explore More',
        title: 'Continue into related pages',
        parentSlug: '',
        emptyState: '当前栏目下还没有补充页面，更多内容会继续更新。'
    },
    render: props => <ChildPageLinks
        eyebrow={props.eyebrow}
        title={props.title}
        parentSlug={props.parentSlug}
        emptyState={props.emptyState}
        resolvedItems={props.resolvedItems}
    />
}

export default ChildPageLinksConfig

import { ComponentConfig } from '@measured/puck'
import { convertDatesToStrings, getContentEntityURI } from '@/app/lib/data-types'
import { getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import { EntityType, Image } from '@/generated/prisma/browser'
import If from '@/app/lib/If'
import LocalizedLink from '@/app/[[...slug]]/LocalizedLink'

type ResolvedItem = {
    id: number
    slug: string
    titlePublishedZH: string | null
    titlePublishedEN: string | null
    shortContentPublishedZH: string | null
    shortContentPublishedEN: string | null
    createdAt: string | Date
    categoryZH: string | null
    categoryEN: string | null
    coverImagePublished: Image | null
}

function normalizeSelectedIds(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return []
    }

    return value
        .map(item => Number(item))
        .filter(item => Number.isFinite(item))
}

function getEntityTypeDisplay(entityType?: EntityType) {
    switch (entityType) {
        case EntityType.club:
            return '社团 / Club'
        case EntityType.course:
            return '课程 / Course'
        case EntityType.activity:
            return '校园活动 / Activity'
        case EntityType.project:
            return '自主项目 / Project'
        case EntityType.faculty:
            return '教职工 / Faculty'
        case EntityType.post:
            return '文章 / Article'
        default:
            return '内容 / Content'
    }
}

function EntityFilterWall({
    eyebrow,
    title,
    entityType,
    emptyState,
    categoryEN,
    categoryZH,
    resolvedItems,
    resolvedUploadPrefix
}: {
    eyebrow?: string
    title?: string
    entityType?: EntityType
    emptyState?: string
    categoryEN?: string
    categoryZH?: string
    resolvedItems?: ResolvedItem[]
    resolvedUploadPrefix?: string
}) {
    const items = resolvedItems ?? []
    const detailLabel = 'View details / 查看详情'

    return <section className="section container !my-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
                <h2 className="mt-3 text-4xl font-serif font-bold text-gray-900 md:text-5xl">{title}</h2>
            </div>
            <p className="text-sm font-medium text-gray-500">
                {categoryZH || categoryEN || getEntityTypeDisplay(entityType)}
            </p>
        </div>

        <If condition={items.length > 0}>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map(item => (
                    <LocalizedLink
                        key={item.id}
                        slug={getContentEntityURI(item.createdAt, item.slug)}
                        className="group block"
                    >
                        <div className="h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-[#e5eef9] via-[#f3ede4] to-[#ecd5c9]">
                            {item.coverImagePublished?.sha1 ? (
                                <img
                                    src={`${resolvedUploadPrefix ?? ''}/${item.coverImagePublished.sha1}.webp`}
                                    alt={item.coverImagePublished.altText}
                                    className="h-full w-full object-cover group-hover-scale"
                                />
                            ) : (
                                <div className="flex h-full items-end bg-[linear-gradient(135deg,rgba(16,35,63,0.92),rgba(122,31,28,0.76))] p-6">
                                    <p className="text-xl font-bold leading-tight text-white">
                                        {item.titlePublishedZH ?? item.titlePublishedEN}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3 pt-5">
                            <div className="flex items-center justify-between gap-3">
                                <If condition={!!item.categoryZH || !!item.categoryEN}>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">
                                        {item.categoryZH ?? item.categoryEN}
                                    </p>
                                </If>
                                <span className="text-xs text-gray-400">{getEntityTypeDisplay(entityType)}</span>
                            </div>
                            <h3 className="text-2xl font-serif font-bold leading-tight text-gray-900 fancy-link">
                                {item.titlePublishedZH ?? item.titlePublishedEN}
                            </h3>
                            <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                                {item.shortContentPublishedZH ?? item.shortContentPublishedEN}
                            </p>
                            <div className="pt-1 text-sm font-semibold text-[#7a1f1c]">
                                {detailLabel}
                            </div>
                        </div>
                    </LocalizedLink>
                ))}
            </div>
        </If>

        <If condition={items.length < 1}>
            <div className="mt-8 rounded-[1.75rem] border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-gray-600">
                {emptyState}
            </div>
        </If>
    </section>
}

const EntityFilterWallConfig: ComponentConfig = {
    label: '内容筛选墙',
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
        entityType: {
            label: '内容类型',
            type: 'select',
            options: [
                { label: '社团', value: EntityType.club },
                { label: '课程', value: EntityType.course },
                { label: '活动', value: EntityType.activity },
                { label: '项目', value: EntityType.project },
                { label: '教职工', value: EntityType.faculty },
                { label: '文章', value: EntityType.post }
            ]
        },
        emptyState: {
            label: '空状态文案',
            type: 'textarea'
        },
        categoryZH: {
            label: '分类（中文）',
            type: 'text'
        },
        categoryEN: {
            label: '分类（英文）',
            type: 'text'
        },
        selectedEntityIds: {
            label: '指定内容 ID',
            type: 'array',
            arrayFields: {
                value: {
                    label: '内容 ID',
                    type: 'number'
                }
            },
            getItemSummary: item => item?.value?.toString() || '内容 ID'
        },
        resolvedItems: {
            type: 'array',
            arrayFields: {},
            visible: false
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    resolveData: async ({ props }) => {
        const selectedIds = normalizeSelectedIds(
            Array.isArray(props.selectedEntityIds)
                ? props.selectedEntityIds.map(item => item?.value)
                : []
        )
        const category = props.categoryEN?.trim() || undefined
        const items = (await getPublishedContentEntities(0, props.entityType ?? EntityType.post, undefined, category)).items
        const resolvedItems = selectedIds.length > 0
            ? items
                .filter(item => selectedIds.includes(item.id))
                .sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id))
            : items.slice(0, 9)

        return {
            props: {
                ...props,
                resolvedItems: convertDatesToStrings(resolvedItems),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        eyebrow: 'Browse',
        title: 'Let visitors explore the latest entries',
        entityType: EntityType.post,
        emptyState: '还没有可展示的已发布内容，请先在内容库里发布几条内容。',
        categoryEN: '',
        categoryZH: '',
        selectedEntityIds: []
    },
    render: props => <EntityFilterWall
        eyebrow={props.eyebrow}
        title={props.title}
        entityType={props.entityType}
        emptyState={props.emptyState}
        categoryEN={props.categoryEN}
        categoryZH={props.categoryZH}
        resolvedItems={props.resolvedItems}
        resolvedUploadPrefix={props.resolvedUploadPrefix}
    />
}

export default EntityFilterWallConfig

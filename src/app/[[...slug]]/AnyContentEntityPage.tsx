import { HydratedContentEntity, SimplifiedContentEntity, getContentEntityURI } from '@/app/lib/data-types'
import { EntityType } from '@/generated/prisma/browser'
import { notFound, redirect } from 'next/navigation'
import If from '@/app/lib/If'
import { Render } from '@measured/puck'
import { resolveAllData } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import { getRelatedPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { prisma } from '@/app/lib/prisma'
import { buildLocalizedPath } from './route-utils'

function getEntityTypeLabel(type: EntityType, locale: string) {
    const labels = {
        post: { zh: '文章', en: 'Article' },
        page: { zh: '页面', en: 'Page' },
        club: { zh: '社团', en: 'Club' },
        activity: { zh: '校园活动', en: 'Activity' },
        project: { zh: '自主项目', en: 'Project' },
        course: { zh: '课程', en: 'Course' },
        faculty: { zh: '教职工', en: 'Faculty' }
    }

    return locale === 'en' ? labels[type].en : labels[type].zh
}

function formatEntityDate(value: Date | string, locale: string) {
    const date = typeof value === 'string' ? new Date(value) : value

    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

function CategoryBadge({ category }: { category: string }) {
    return (
        <span className="inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#7a1f1c] shadow-sm">
            {category}
        </span>
    )
}

function DetailStat({ label, value }: { label: string, value: string }) {
    return <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{label}</p>
        <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
}

function RelatedCard({ item, locale, uploadPrefix }: {
    item: SimplifiedContentEntity
    locale: string
    uploadPrefix: string
}) {
    const title = locale === 'en'
        ? item.titlePublishedEN ?? item.titleDraftEN
        : item.titlePublishedZH ?? item.titleDraftZH
    const category = locale === 'en' ? item.categoryEN : item.categoryZH
    const shortContent = locale === 'en'
        ? item.shortContentPublishedEN ?? item.shortContentDraftEN
        : item.shortContentPublishedZH ?? item.shortContentDraftZH
    const href = buildLocalizedPath(locale, getContentEntityURI(item.createdAt, item.slug))
    const entityLabel = getEntityTypeLabel(item.type, locale)
    const cta = locale === 'en' ? 'Open page' : '查看页面'

    return <Link
        href={href}
        className="group overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
        <div className="h-52 overflow-hidden bg-gradient-to-br from-[#dbe7f7] via-[#f3efe8] to-[#f9d3cf]">
            <If condition={item.coverImagePublished != null}>
                <img
                    src={`${uploadPrefix}/${item.coverImagePublished?.sha1}.webp`}
                    alt={item.coverImagePublished?.altText}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </If>
        </div>
        <div className="space-y-3 p-6">
            <div className="flex items-center justify-between gap-3">
                <If condition={!!category}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">
                        {category}
                    </p>
                </If>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                    {entityLabel}
                </p>
            </div>
            <h3 className="text-2xl font-bold leading-tight text-gray-900">{title}</h3>
            <If condition={!!shortContent}>
                <p className="line-clamp-3 text-sm leading-6 text-gray-600">{shortContent!}</p>
            </If>
            <div className="pt-2 text-sm font-semibold text-[#7a1f1c]">{cta}</div>
        </div>
    </Link>
}

function EntityHero({ entity, locale, uploadPrefix }: {
    entity: HydratedContentEntity
    locale: string
    uploadPrefix: string
}) {
    const title = locale === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH
    const category = locale === 'en' ? entity.categoryEN : entity.categoryZH
    const shortContent = locale === 'en' ? entity.shortContentPublishedEN : entity.shortContentPublishedZH
    const heroImage = entity.coverImagePublished
        ? `${uploadPrefix}/${entity.coverImagePublished.sha1}.webp`
        : null

    return (
        <section className="relative overflow-hidden bg-[#10233f] text-white">
            <If condition={heroImage != null}>
                <img
                    className="absolute inset-0 h-full w-full object-cover"
                    alt={entity.coverImagePublished?.altText}
                    src={heroImage ?? undefined}
                />
            </If>
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(10,20,38,0.92),rgba(16,35,63,0.78)_45%,rgba(16,35,63,0.42))]"/>
            <div className="relative container px-5 py-18 md:py-24">
                <div className="max-w-4xl space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
                            {getEntityTypeLabel(entity.type, locale)}
                        </span>
                        <If condition={!!category}>
                            <CategoryBadge category={category!}/>
                        </If>
                    </div>
                    <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-6xl">
                        {title}
                    </h1>
                    <If condition={!!shortContent}>
                        <p className="max-w-3xl text-lg leading-8 text-white/82 md:text-xl">
                            {shortContent!}
                        </p>
                    </If>
                    <div className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailStat
                            label={locale === 'en' ? 'Published' : '发布时间'}
                            value={formatEntityDate(entity.createdAt, locale)}
                        />
                        <DetailStat
                            label={locale === 'en' ? 'Section' : '内容类型'}
                            value={getEntityTypeLabel(entity.type, locale)}
                        />
                        <DetailStat
                            label={locale === 'en' ? 'Language' : '语言'}
                            value={locale === 'en' ? 'English' : '中文'}
                        />
                        <DetailStat
                            label={locale === 'en' ? 'Author' : '创建者'}
                            value={entity.creator.name}
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}

function DetailSidebar({ entity, locale }: {
    entity: HydratedContentEntity
    locale: string
}) {
    const category = locale === 'en' ? entity.categoryEN : entity.categoryZH
    const sectionLinks = {
        [EntityType.club]: locale === 'en' ? '/life/clubs' : '/life/clubs',
        [EntityType.activity]: locale === 'en' ? '/life/activities' : '/life/activities',
        [EntityType.course]: locale === 'en' ? '/academics/high-school' : '/academics/high-school',
        [EntityType.project]: locale === 'en' ? '/projects' : '/projects',
        [EntityType.faculty]: locale === 'en' ? '/faculty' : '/faculty',
        [EntityType.post]: locale === 'en' ? '/news' : '/news',
        [EntityType.page]: '/'
    }
    const sectionLink = buildLocalizedPath(locale, sectionLinks[entity.type])
    const guidanceCopy = locale === 'en'
        ? {
            eyebrow: 'About This Page',
            title: 'How to read this page',
            paragraph: 'This detail page is meant to help families and visitors understand the people, programs, and learning experiences that shape the school, not just scan isolated facts.',
            browseLabel: 'Browse this section',
            browseDescription: 'Jump back to the main section page for more related stories, profiles, and overview content.',
            browseCta: 'Open section page'
        }
        : {
            eyebrow: '阅读提示',
            title: '怎么看这条内容',
            paragraph: '这个详情页不是只给人看零散信息，而是帮助家长和访问者更完整地理解学校里的课程、活动、项目与人物。',
            browseLabel: '返回栏目页',
            browseDescription: '回到对应栏目入口页，可以继续浏览同一主题下的介绍、人物与相关内容。',
            browseCta: '查看栏目页'
        }

    return <aside className="space-y-4 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="border-b border-gray-100 pb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">
                {guidanceCopy.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">
                {guidanceCopy.title}
            </h2>
        </div>
        <div className="space-y-4">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {locale === 'en' ? 'Content Type' : '内容类型'}
                </p>
                <p className="mt-2 text-base font-semibold text-gray-900">
                    {getEntityTypeLabel(entity.type, locale)}
                </p>
            </div>
            <If condition={!!category}>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        {locale === 'en' ? 'Category' : '分类'}
                    </p>
                    <p className="mt-2 text-base font-semibold text-gray-900">{category}</p>
                </div>
            </If>
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {locale === 'en' ? 'Published' : '发布时间'}
                </p>
                <p className="mt-2 text-base font-semibold text-gray-900">
                    {formatEntityDate(entity.createdAt, locale)}
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {locale === 'en' ? 'Created By' : '创建者'}
                </p>
                <p className="mt-2 text-base font-semibold text-gray-900">{entity.creator.name}</p>
            </div>
            <div className="rounded-2xl border border-[#e1d7cb] bg-[#f7f1e7] p-4 text-sm leading-7 text-gray-700">
                {guidanceCopy.paragraph}
            </div>
            <Link
                href={sectionLink}
                className="block rounded-[1.5rem] border border-[#d8c6b2] bg-[#fffaf3] p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a1f1c]">
                    {guidanceCopy.browseLabel}
                </p>
                <p className="mt-3 text-lg font-bold text-gray-900">
                    {getEntityTypeLabel(entity.type, locale)}
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                    {guidanceCopy.browseDescription}
                </p>
                <div className="mt-4 text-sm font-semibold text-[#7a1f1c]">{guidanceCopy.browseCta}</div>
            </Link>
        </div>
    </aside>
}

function looksLikePuckJson(value: string | null | undefined) {
    if (value == null) {
        return false
    }

    const trimmed = value.trim()
    return trimmed.startsWith('{') && trimmed.includes('"root"') && trimmed.includes('"content"')
}

async function replaceImagePlaceholders(markdown: string, uploadPrefix: string) {
    const matches = Array.from(markdown.matchAll(/\[IMAGE:\s*(\d+)\s*\]/g))

    if (matches.length < 1) {
        return markdown
    }

    const uniqueIds = Array.from(new Set(matches.map(match => Number(match[1]))))
    const images = await prisma.image.findMany({
        where: {
            id: { in: uniqueIds }
        }
    })
    const imagesById = new Map(images.map(image => [ image.id, image ]))

    return markdown.replace(/\[IMAGE:\s*(\d+)\s*\]/g, (_, rawId: string) => {
        const image = imagesById.get(Number(rawId))
        if (!image) {
            return ''
        }

        const altText = (image.altText ?? image.name ?? '').replace(/]/g, '\\]')
        return `![${altText}](${uploadPrefix}/${image.sha1}.webp)`
    })
}

function isVideoUrl(url: string) {
    return /(youtube\.com\/watch\?v=|youtu\.be\/|bilibili\.com\/video\/|player\.bilibili\.com|vimeo\.com\/|\.mp4($|\?)|\.webm($|\?)|\.ogg($|\?))/i.test(url)
}

function toVideoEmbedUrl(url: string) {
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (youtubeMatch) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}`
    }

    const bilibiliMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i)
    if (bilibiliMatch) {
        return `https://player.bilibili.com/player.html?bvid=${bilibiliMatch[1]}&page=1`
    }

    const bilibiliPlayerMatch = url.match(/player\.bilibili\.com\/player\.html\?[^\\s]+/)
    if (bilibiliPlayerMatch) {
        return url
    }

    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    }

    return url
}

function expandStandaloneVideoLinks(markdown: string) {
    return markdown
        .split('\n')
        .map(line => {
            const trimmed = line.trim()

            if (/^https?:\/\/\S+$/.test(trimmed) && isVideoUrl(trimmed)) {
                return `[${trimmed}](${trimmed})`
            }

            return line
        })
        .join('\n')
}

function DetailMarkdown({ content }: { content: string }) {
    const preparedContent = expandStandaloneVideoLinks(content)

    return (
        <article className="prose prose-gray max-w-none prose-headings:font-bold prose-p:text-gray-700 prose-li:text-gray-700">
            <ReactMarkdown
                components={{
                    a({ href, children }) {
                        const url = href ?? ''
                        const text = String(children).trim()

                        if (isVideoUrl(url)) {
                            if (/\.(mp4|webm|ogg)(?:$|\?)/i.test(url)) {
                                return <figure className="my-8">
                                    <video className="w-full rounded-2xl bg-black" controls preload="metadata" src={url}>
                                        <a href={url} target="_blank" rel="noreferrer">{text || url}</a>
                                    </video>
                                    <figcaption className="mt-2 text-sm text-gray-500">{text && text !== url ? text : '视频预览'}</figcaption>
                                </figure>
                            }

                            return <figure className="my-8">
                                <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                                    <iframe
                                        className="h-full w-full"
                                        src={toVideoEmbedUrl(url)}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={text || 'Embedded video'}
                                    />
                                </div>
                                <figcaption className="mt-2 text-sm text-gray-500">{text && text !== url ? text : '视频预览'}</figcaption>
                            </figure>
                        }

                        return <a href={url} target="_blank" rel="noreferrer">{children}</a>
                    },
                    img({ src, alt }) {
                        if (!src) {
                            return null
                        }

                        return <figure className="my-8">
                            <img
                                src={src}
                                alt={alt ?? ''}
                                className="mx-auto w-full !max-w-none rounded-2xl"
                            />
                            {alt
                                ? <figcaption className="mt-2 text-center text-sm text-gray-500">{alt}</figcaption>
                                : null}
                        </figure>
                    }
                }}
            >
                {preparedContent}
            </ReactMarkdown>
        </article>
    )
}

export default async function AnyContentEntityPage({ entity, params }: {
    entity: HydratedContentEntity
    params: Promise<{ slug: string[] | undefined }>
}) {
    if (entity.contentPublishedEN == null) {
        notFound()
    }
    if (entity.type === EntityType.page) {
        redirect(`/${entity.slug}`)
    }

    const slug = ((await params).slug) ?? []
    const uploadPrefix = await getUploadServePath()
    const locale = slug[0]
    const rawPublishedContent = locale === 'en'
        ? entity.contentPublishedEN ?? ''
        : entity.contentPublishedZH ?? entity.contentPublishedEN ?? ''
    const isPuckContent = looksLikePuckJson(rawPublishedContent)
    const publishedContent = isPuckContent
        ? rawPublishedContent
        : await replaceImagePlaceholders(rawPublishedContent, uploadPrefix)
    const resolvedData = isPuckContent
        ? await resolveAllData(JSON.parse(publishedContent), PUCK_CONFIG)
        : null
    const related = await getRelatedPublishedContentEntities(entity, 3)

    return <>
        <EntityHero entity={entity} locale={locale} uploadPrefix={uploadPrefix}/>

        <section className="bg-[#faf7f2]">
            <div className="container px-5 py-16 md:py-20">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
                    <article className="min-w-0 rounded-[2rem] bg-white px-6 py-8 shadow-sm md:px-10 md:py-12">
                        {resolvedData != null
                            ? <Render config={PUCK_CONFIG} data={resolvedData}/>
                            : <DetailMarkdown content={publishedContent}/>}
                    </article>
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <DetailSidebar entity={entity} locale={locale}/>
                    </div>
                </div>
            </div>
        </section>

        <If condition={related.length > 0}>
            <section className="bg-white py-16 md:py-20">
                <div className="container px-5">
                    <div className="mb-8 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">
                                {locale === 'en' ? 'Keep Exploring' : '继续探索'}
                            </p>
                            <h2 className="mt-3 text-4xl font-bold text-gray-900">
                                {locale === 'en' ? 'Related stories and pages' : '相关内容推荐'}
                            </h2>
                        </div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {related.map(item => (
                            <RelatedCard
                                key={item.id}
                                item={item}
                                locale={locale}
                                uploadPrefix={uploadPrefix}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </If>
    </>
}

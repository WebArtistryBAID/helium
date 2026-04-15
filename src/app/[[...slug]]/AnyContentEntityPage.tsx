import { HydratedContentEntity } from '@/app/lib/data-types'
import { EntityType } from '@/generated/prisma/browser'
import { notFound, redirect } from 'next/navigation'
import If from '@/app/lib/If'
import { Render } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import { getUploadServePath } from '@/app/studio/media/media-actions'

function CategoryBadge({ category }: { category: string }) {
    return (
        <span className="inline-block px-3 py-1 text-sm font-semibold bg-red-100 text-red-800 rounded-full">
            {category}
        </span>
    )
}

function EntityHero({ entity, locale, uploadPrefix }: {
    entity: HydratedContentEntity,
    locale: string,
    uploadPrefix: string
}) {
    const title = locale === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH
    const category = locale === 'en' ? entity.categoryEN : entity.categoryZH
    const shortContent = locale === 'en' ? entity.shortContentPublishedEN : entity.shortContentPublishedZH

    if (!entity.coverImagePublished) {
        return (
            <div className="bg-red-900 text-white py-16">
                <div className="container px-5">
                    <If condition={!!category}>
                        <CategoryBadge category={category!}/>
                    </If>
                    <h1 className="text-5xl font-bold mt-4">{title}</h1>
                    <If condition={!!shortContent}>
                        <p className="text-xl text-white/80 mt-3 max-w-2xl">{shortContent!}</p>
                    </If>
                </div>
            </div>
        )
    }

    if (entity.type === EntityType.faculty) {
        return (
            <div className="relative w-full min-h-[65vh] overflow-hidden">
                <img
                    className="w-full h-[65vh] object-cover object-top"
                    alt={entity.coverImagePublished.altText}
                    src={`${uploadPrefix}/${entity.coverImagePublished.sha1}.webp`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end">
                    <div className="container px-5 pb-14">
                        <If condition={!!category}>
                            <CategoryBadge category={category!}/>
                        </If>
                        <h1 className="text-6xl font-bold text-white mt-4">{title}</h1>
                        <If condition={!!shortContent}>
                            <p className="text-xl text-white/80 mt-2">{shortContent!}</p>
                        </If>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full min-h-[50vh] overflow-hidden">
            <img
                className="w-full h-[50vh] object-cover"
                alt={entity.coverImagePublished.altText}
                src={`${uploadPrefix}/${entity.coverImagePublished.sha1}.webp`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="container px-5 pb-12">
                    <If condition={!!category}>
                        <CategoryBadge category={category!}/>
                    </If>
                    <h1 className="text-5xl font-bold text-white mt-4">{title}</h1>
                </div>
            </div>
        </div>
    )
}

export default async function AnyContentEntityPage({ entity, params }: {
    entity: HydratedContentEntity,
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
    const data = locale === 'en'
        ? JSON.parse(entity.contentPublishedEN ?? '{}')
        : JSON.parse(entity.contentPublishedZH ?? entity.contentPublishedEN ?? '{}')

    return <>
        <EntityHero entity={entity} locale={locale} uploadPrefix={uploadPrefix}/>

        <article className="container px-5 my-16">
            <Render config={PUCK_CONFIG} data={data}/>
        </article>
    </>
}

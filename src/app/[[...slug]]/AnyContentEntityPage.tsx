import { HydratedContentEntity } from '@/app/lib/data-types'
import { EntityType } from '@/generated/prisma/browser'
import { notFound, redirect } from 'next/navigation'
import If from '@/app/lib/If'
import ContentEntityBody from '@/app/lib/ContentEntityBody'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { extractContentImageIds } from '@/app/lib/plate/plate-types'

export default async function AnyContentEntityPage({ entity, params }: {
    entity: HydratedContentEntity,
    params: Promise<{ slug: string[] | undefined }>
}) {
    if (entity.contentPublishedEN == null) {
        notFound() // Not published yet
    }
    if (entity.type === EntityType.page) {
        redirect(`/${entity.slug}`) // Redirect to the appropriate page route
    }

    const slug = ((await params).slug) ?? []
    const uploadPrefix = await getUploadServePath()
    const locale = slug[0]

    const base = locale === 'en' ? entity.contentPublishedEN ?? entity.contentPublishedEN! : entity.contentPublishedZH ?? entity.contentPublishedEN!
    const imageIds = extractContentImageIds(base)
    const images = await Promise.all(imageIds.map(getImage))
    return <>
        <If condition={entity.coverImagePublished != null}>
            <div className="mx-auto w-full max-w-5xl px-4 pt-24 sm:px-8 sm:pt-28">
                <img className="max-h-[24rem] h-auto w-full rounded-2xl object-cover"
                     alt={entity.coverImagePublished?.altText ?? ''}
                     src={`${uploadPrefix}/${entity.coverImagePublished?.sha1}.webp`}/>
            </div>
        </If>
        <div className={`mx-auto mb-14 w-full max-w-3xl px-6 sm:mb-20 sm:px-10 ${
            entity.coverImagePublished == null ? 'pt-32 sm:pt-40' : 'pt-12 sm:pt-16'
        }`}>
            <article className="content-entity-article">
                <If condition={entity.type === EntityType.post}>
                    <header className="mb-10 border-b border-gray-200 pb-8">
                        <h1>{locale === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH}</h1>
                        <time className="mt-4 block text-sm text-gray-600"
                              dateTime={(entity.createdAt as Date).toISOString()}>
                            {(entity.createdAt as Date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                        </time>
                    </header>
                </If>
                <If condition={entity.type !== EntityType.post}>
                    <h1 className="text-5xl text-center">{locale === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH}</h1>
                </If>
                <ContentEntityBody content={base} images={images.filter(image => image !== null)} uploadPrefix={uploadPrefix}/>
            </article>
        </div>
    </>
}

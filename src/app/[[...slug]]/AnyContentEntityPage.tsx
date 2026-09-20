import { HydratedContentEntity } from '@/app/lib/data-types'
import { EntityType } from '@/generated/prisma/browser'
import { notFound, redirect } from 'next/navigation'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { extractContentImageIds } from '@/app/lib/plate/plate-types'
import ContentEntityDisplay from '@/app/lib/ContentEntityDisplay'

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
    const displayLocale = locale === 'en' ? 'en' : 'zh'

    const base = locale === 'en' ? entity.contentPublishedEN ?? entity.contentPublishedEN! : entity.contentPublishedZH ?? entity.contentPublishedEN!
    const imageIds = extractContentImageIds(base)
    const images = await Promise.all(imageIds.map(getImage))
    return <ContentEntityDisplay
        type={entity.type}
        title={displayLocale === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH}
        subtitle={displayLocale === 'en' ? entity.titlePublishedZH : entity.titlePublishedEN}
        content={base}
        coverImage={entity.coverImagePublished}
        createdAt={entity.createdAt}
        locale={displayLocale}
        images={images.filter(image => image !== null)}
        uploadPrefix={uploadPrefix}/>
}

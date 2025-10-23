import { HydratedContentEntity } from '@/app/lib/data-types'
import { EntityType } from '@prisma/client'
import { notFound, redirect } from 'next/navigation'
import If from '@/app/lib/If'
import Markdown from 'react-markdown'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'

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
    const regex = /\[IMAGE:\s*(\d+)\]/g
    const matches = Array.from(base.matchAll(regex))
    const ids = matches.map(m => m[1])
    const images = await Promise.all(ids.map(id => getImage(parseInt(id))))
    const imageMap = new Map(ids.map((id, i) => [ id, images[i] ]))
    const renderedContent = base.replace(regex, (_, id) => {
        const image = imageMap.get(id)
        if (!image) return ''
        return `![${image.altText}](${uploadPrefix}/${image.sha1}.webp)`
    })

    return <>
        <If condition={entity.coverImagePublished != null}>
            <img className="mb-8 w-screen min-h-72 h-[33vh] object-cover" alt={entity.coverImagePublished?.altText}
                 src={`${uploadPrefix}/${entity.coverImagePublished?.sha1}.webp`}/>
        </If>
        <article className="container px-5 my-16">
            <article>
                <If condition={entity.type === EntityType.post}>
                    <h1>{locale === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH}</h1>
                    <p className="secondary text-sm">{(entity.createdAt as Date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}</p>
                </If>
                <If condition={entity.type !== EntityType.post}>
                    <h1 className="text-5xl text-center">{locale === 'en' ? entity.titlePublishedEN : entity.titlePublishedZH}</h1>
                </If>
                <Markdown>{renderedContent}</Markdown>
            </article>
        </article>
    </>
}

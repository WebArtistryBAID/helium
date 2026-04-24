'use client'

import { getContentEntityURI, HydratedContentEntity, prefixLink } from '@/app/lib/data-types'
import Link from 'next/link'
import { Image } from '@/generated/prisma/browser'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

function ActivityTextBlock({ name, description, background, light }: {
    name: string,
    description: string,
    background: string,
    light: boolean
}) {
    return <section
        style={{
            background: background,
            color: light ? 'white' : 'black'
        }} className="w-full h-80 p-8" aria-labelledby="activity-heading" role="region">
        <h3 id="activity-heading" className="text-xl mb-3 font-bold">
            {name}
        </h3>
        <p className="no-size text-sm" tabIndex={0}>{description}</p>
    </section>
}

function ActivityBlock({ name, description, createdAt, slug, image, background, light, textAlign, uploadPrefix }: {
    name: string,
    description: string,
    createdAt: Date | string | null | undefined,
    slug: string | null | undefined,
    image: Image | undefined,
    background: string,
    light: boolean,
    textAlign: 'left' | 'right',
    uploadPrefix: string | undefined
}) {
    const language = useLanguage()

    const imageSrc = image?.sha1 ? `${uploadPrefix}/${image.sha1}.webp` : null

    return <Link href={prefixLink(language, getContentEntityURI(createdAt, slug))}>
        <section aria-label={name} role="region">
            <div className="hidden sm:grid grid-cols-2">
                {textAlign === 'left' &&
                    <ActivityTextBlock background={background} description={description} light={light} name={name}/>}
                {imageSrc ? (
                    <img alt={image?.altText} src={imageSrc}
                         className="w-full h-80 object-cover object-center"/>
                ) : (
                    <div className="flex h-80 items-end bg-[linear-gradient(135deg,rgba(16,35,63,0.92),rgba(122,31,28,0.76))] p-8 text-white">
                        <p className="text-2xl font-bold leading-tight">{name}</p>
                    </div>
                )}
                {textAlign === 'right' &&
                    <ActivityTextBlock background={background} description={description} light={light} name={name}/>}
            </div>

            <div className="block sm:hidden">
                {imageSrc ? (
                    <img alt={image?.altText} src={imageSrc}
                         className="w-full h-48 object-cover object-center"/>
                ) : (
                    <div className="flex h-48 items-end bg-[linear-gradient(135deg,rgba(16,35,63,0.92),rgba(122,31,28,0.76))] p-6 text-white">
                        <p className="text-xl font-bold leading-tight">{name}</p>
                    </div>
                )}
                <ActivityTextBlock background={background} description={description} light={light} name={name}/>
            </div>
        </section>
    </Link>
}

export default function Activities({ title, resolvedActivities, uploadPrefix }: {
    title: string | undefined,
    resolvedActivities: ({ activity: HydratedContentEntity } | undefined)[] | undefined,
    uploadPrefix: string | undefined
}) {
    const language = useLanguage()
    const activities = resolvedActivities?.map(a => a?.activity).filter(a => a !== undefined) ?? [] as HydratedContentEntity[]
    return <section aria-labelledby="activities-heading" className="section container">
        <div className="flex justify-end">
            <h2 id="activities-heading" className="text-4xl font-bold mb-5">
                {title}
            </h2>
        </div>
        <div aria-label="Activities"
             className="sm:grid grid-cols-1 lg:grid-cols-2 gap-0 shadow-xl rounded-3xl overflow-clip" role="list">
            {activities?.length > 0 && <ActivityBlock
                name={(language === 'en' ? activities[0]!.titlePublishedEN : activities[0]!.titlePublishedZH) ?? ''}
                description={(language === 'en' ? activities[0]!.shortContentPublishedEN : activities[0]!.shortContentPublishedZH) ?? ''}
                createdAt={activities[0]?.createdAt}
                slug={activities[0]?.slug}
                image={activities[0]!.coverImagePublished ?? undefined}
                background="var(--standard-blue)"
                light={true}
                textAlign="right"
                uploadPrefix={uploadPrefix}/>}
            {activities?.length > 1 && <ActivityBlock
                name={(language === 'en' ? activities[1]!.titlePublishedEN : activities[1]!.titlePublishedZH) ?? ''}
                description={(language === 'en' ? activities[1]!.shortContentPublishedEN : activities[1]!.shortContentPublishedZH) ?? ''}
                createdAt={activities[1]?.createdAt}
                slug={activities[1]?.slug}
                image={activities[1]!.coverImagePublished ?? undefined}
                background="var(--standard-red)"
                light={true}
                textAlign="right"
                uploadPrefix={uploadPrefix}/>}
            {activities?.length > 2 && <ActivityBlock
                name={(language === 'en' ? activities[2]!.titlePublishedEN : activities[2]!.titlePublishedZH) ?? ''}
                description={(language === 'en' ? activities[2]!.shortContentPublishedEN : activities[2]!.shortContentPublishedZH) ?? ''}
                createdAt={activities[2]?.createdAt}
                slug={activities[2]?.slug}
                image={activities[2]!.coverImagePublished ?? undefined}
                background="var(--standard-red)"
                light={true}
                textAlign="left"
                uploadPrefix={uploadPrefix}/>}
            {activities?.length > 3 && <ActivityBlock
                name={(language === 'en' ? activities[3]!.titlePublishedEN : activities[3]!.titlePublishedZH) ?? ''}
                description={(language === 'en' ? activities[3]!.shortContentPublishedEN : activities[3]!.shortContentPublishedZH) ?? ''}
                createdAt={activities[3]?.createdAt}
                slug={activities[3]?.slug}
                image={activities[3]!.coverImagePublished ?? undefined}
                background="#d3d3d3"
                light={false}
                textAlign="left"
                uploadPrefix={uploadPrefix}/>}
            {activities?.length > 4 && <ActivityBlock
                name={(language === 'en' ? activities[4]!.titlePublishedEN : activities[4]!.titlePublishedZH) ?? ''}
                description={(language === 'en' ? activities[4]!.shortContentPublishedEN : activities[4]!.shortContentPublishedZH) ?? ''}
                createdAt={activities[4]?.createdAt}
                slug={activities[4]?.slug}
                image={activities[4]!.coverImagePublished ?? undefined}
                background="var(--standard-blue)"
                light={true}
                textAlign="right"
                uploadPrefix={uploadPrefix}/>}
            {activities?.length > 5 && <ActivityBlock
                name={(language === 'en' ? activities[5]!.titlePublishedEN : activities[5]!.titlePublishedZH) ?? ''}
                description={(language === 'en' ? activities[5]!.shortContentPublishedEN : activities[5]!.shortContentPublishedZH) ?? ''}
                createdAt={activities[5]?.createdAt}
                slug={activities[5]?.slug}
                image={activities[5]!.coverImagePublished ?? undefined}
                background="var(--standard-red)"
                light={true}
                textAlign="right"
                uploadPrefix={uploadPrefix}/>}
        </div>
    </section>
}

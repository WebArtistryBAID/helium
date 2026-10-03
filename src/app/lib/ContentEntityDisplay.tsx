import FocusImage from '@/app/lib/FocusImage'
import { EntityType, Image } from '@/generated/prisma/browser'
import If from '@/app/lib/If'
import ContentEntityBody from '@/app/lib/ContentEntityBody'

export default function ContentEntityDisplay({
                                                 type,
                                                 title,
                                                 subtitle,
                                                 content,
                                                 coverImage,
                                                 createdAt,
                                                 locale,
                                                 images,
                                                 uploadPrefix
                                             }: {
    type: EntityType
    title: string | null
    subtitle: string | null
    content: string
    coverImage: Image | null
    createdAt: Date | string
    locale: 'en' | 'zh'
    images: Image[]
    uploadPrefix: string
}) {
    const isPeoplePage = type === EntityType.faculty
    const displayDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt

    return <>
        <If condition={isPeoplePage}>
            <header className="mx-auto w-full max-w-5xl px-6 pt-32 sm:px-10 sm:pt-40">
                <div
                    className="flex flex-col gap-7 border-b border-gray-900 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
                    <h1 className="min-w-0 text-left text-4xl leading-tight tracking-tight sm:text-6xl">
                        <p lang={locale}
                           className={`font-bold ${locale === 'zh' ? 'text-[0.85em] tracking-wide' : ''}`}>{title}</p>
                        {subtitle && <p lang={locale === 'en' ? 'zh' : 'en'}
                                        className={`mt-2 opacity-80 ${locale === 'en' ? 'text-[0.425em] tracking-normal' : 'text-[0.5em]'}`}>{subtitle}</p>}
                    </h1>
                    {coverImage && <img
                        className="mx-auto h-auto w-auto max-h-80 max-w-[min(100%,18rem)] shrink-0 object-contain sm:mx-0 sm:max-h-56 sm:max-w-48"
                        alt={coverImage.altText ?? ''}
                        src={`${uploadPrefix}/${coverImage.sha1}.webp`}/>}
                </div>
            </header>
        </If>
        <If condition={!isPeoplePage && coverImage != null}>
            <div className="mx-auto w-full max-w-5xl px-4 pt-24 sm:px-8 sm:pt-28">
                <FocusImage image={coverImage} className="max-h-[24rem] h-auto w-full rounded-2xl object-cover"
                     alt={coverImage?.altText ?? ''}
                     src={`${uploadPrefix}/${coverImage?.sha1}.webp`}/>
            </div>
        </If>
        <div className={`mx-auto mb-14 w-full px-6 sm:mb-20 sm:px-10 ${isPeoplePage ? 'max-w-5xl' : 'max-w-3xl'} ${
            isPeoplePage ? '' : coverImage == null ? 'pt-32 sm:pt-40' : 'pt-12 sm:pt-16'
        }`}>
            <article className="content-entity-article">
                <If condition={type === EntityType.post}>
                    <header className="mb-10 border-b border-gray-200 pb-8">
                        <h1>{title}</h1>
                        <time className="mt-4 block text-sm text-gray-600"
                              dateTime={displayDate.toISOString()}>
                            {displayDate.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                        </time>
                    </header>
                </If>
                <If condition={!isPeoplePage && type !== EntityType.post}>
                    <h1 className="text-5xl text-center">{title}</h1>
                </If>
                <ContentEntityBody content={content} images={images} uploadPrefix={uploadPrefix}/>
            </article>
        </div>
    </>
}

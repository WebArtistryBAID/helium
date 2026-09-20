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
        <If condition={coverImage != null}>
            <div className="mx-auto w-full max-w-5xl px-4 pt-24 sm:px-8 sm:pt-28">
                <img className={isPeoplePage
                    ? 'mx-auto h-72 w-72 rounded-full object-cover'
                    : 'max-h-[24rem] h-auto w-full rounded-2xl object-cover'}
                     alt={coverImage?.altText ?? ''}
                     src={`${uploadPrefix}/${coverImage?.sha1}.webp`}/>
            </div>
        </If>
        <div className={`mx-auto mb-14 w-full max-w-3xl px-6 sm:mb-20 sm:px-10 ${
            coverImage == null ? 'pt-32 sm:pt-40' : 'pt-12 sm:pt-16'
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
                <If condition={type !== EntityType.post}>
                    <h1 className="text-5xl text-center">{title}</h1>
                    <If condition={isPeoplePage && subtitle != null}>
                        <p className="mt-3 text-center text-2xl text-gray-600">{subtitle}</p>
                    </If>
                </If>
                <ContentEntityBody content={content} images={images} uploadPrefix={uploadPrefix}/>
            </article>
        </div>
    </>
}

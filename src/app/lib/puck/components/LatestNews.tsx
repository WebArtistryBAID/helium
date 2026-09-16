'use client'

import { getContentEntityURI, prefixLink, SimplifiedContentEntity } from '@/app/lib/data-types'
import Link from 'next/link'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

export default function LatestNews({ title, otherNewsText, readMoreText, resolvedPosts, uploadPrefix }: {
    title: string | null,
    otherNewsText: string | null,
    readMoreText: string | null,
    resolvedPosts: SimplifiedContentEntity[] | null,
    uploadPrefix: string | null
}) {
    resolvedPosts = resolvedPosts ?? []
    const language = useLanguage()

    return <>
        <section aria-labelledby="news-heading" className="mt-16 border-black md:mt-24">
            <div className="container mb-8 flex flex-col items-start gap-3 px-5 sm:flex-row sm:items-center md:px-0">
                <h2 id="news-heading"
                    className="mr-auto min-w-0 break-words text-3xl font-bold sm:text-4xl lg:text-5xl">
                    {title}
                </h2>

                <Link href={prefixLink(language, '/news')}
                      className="flex shrink-0 items-center gap-1 text-black decoration-none opacity-80 transition hover:opacity-100">
                    <span className="!font-sans">{readMoreText}</span>
                    <svg
                        height="25"
                        viewBox="0 0 16 16"
                        width="25"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M2 8a.75.75 0 0 1 .75-.75h8.787L8.25 4.309a.75.75 0 0 1 1-1.118L14 7.441a.75.75 0 0 1 0 1.118l-4.75 4.25a.75.75 0 1 1-1-1.118l3.287-2.941H2.75A.75.75 0 0 1 2 8Z"
                            fill="currentColor"
                        />
                    </svg>
                </Link>
            </div>
        </section>

        <section aria-labelledby="news-heading" className="section container !mb-16 md:!mb-24">
            <div className="flex w-full flex-col gap-8 lg:flex-row">
                {resolvedPosts.length > 0 ?
                    <Link
                        href={prefixLink(language, getContentEntityURI(resolvedPosts[0].createdAt, resolvedPosts[0].slug))}
                        className="group block w-full lg:w-2/3">
                        <div className="mb-3 h-56 w-full overflow-hidden rounded-3xl sm:h-72 md:h-96">
                        <img alt={resolvedPosts[0].coverImagePublished?.altText ?? ''}
                             src={`${uploadPrefix}/${resolvedPosts[0].coverImagePublished?.sha1}.webp`}
                             className="object-cover w-full h-full rounded-t-3xl transform transition-transform duration-300 ease-in-out group-hover:scale-105"/>
                    </div>
                        <p className="fancy-link break-words font-serif text-2xl sm:text-3xl">
                        {language === 'en' ? resolvedPosts[0].titlePublishedEN : resolvedPosts[0].titlePublishedZH}
                    </p>
                </Link> : null}
                <div className="w-full lg:w-1/3">
                    {resolvedPosts.length > 1 ? resolvedPosts.slice(1, 4).map(news => <div
                        className="pb-3 border-b border-black mb-5"
                        key={news.id}>
                        <p
                            aria-hidden="true"
                            className="uppercase text-gray-600 !mb-2 text-sm"
                        >
                            {otherNewsText}
                        </p>
                        <Link href={prefixLink(language, getContentEntityURI(news.createdAt, news.slug))}
                              className="block group">
                            <p className="text-xl font-bold fancy-link">
                                {language === 'en' ? news.titlePublishedEN : news.titlePublishedZH}
                            </p>
                        </Link>
                    </div>) : null}
                </div>
            </div>
        </section>
    </>
}

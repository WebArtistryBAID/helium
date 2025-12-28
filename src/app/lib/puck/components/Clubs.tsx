'use client'

import { getContentEntityURI, Paginated, prefixLink, SimplifiedContentEntity } from '@/app/lib/data-types'
import { useEffect, useState } from 'react'
import { getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/browser'
import Link from 'next/link'
import If from '@/app/lib/If'
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi2'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import Card from '@/app/lib/puck/components/Card'

export default function Clubs({ title, init, uploadPrefix }: {
    title: string,
    init: Paginated<SimplifiedContentEntity>,
    uploadPrefix: string
}) {
    const language = useLanguage()
    const [ page, setPage ] = useState<Paginated<SimplifiedContentEntity>>(init)
    const [ currentPage, setCurrentPage ] = useState(0)

    useEffect(() => {
        (async () => {
            setPage(await getPublishedContentEntities(currentPage, EntityType.club))
        })()
    }, [ currentPage ])

    return <section aria-labelledby="clubs-heading" className="py-24 border-b border-gray-200">
        <div className="container">
            <h2 id="clubs-heading" className="mb-5 text-4xl font-bold">
                {title}
            </h2>

            <div className="grid grid-cols-3 2xl:grid-cols-4 gap-4 mb-3">
                {page.items.map(club => <Card
                    key={club.id}
                    href={prefixLink(language, getContentEntityURI(club.createdAt, club.slug))}
                    title={language === 'en' ? club.titlePublishedEN : club.titlePublishedZH}
                    shortContent={language === 'en' ? club.shortContentPublishedEN : club.shortContentPublishedZH}
                    image={club.coverImagePublished}
                    uploadPrefix={uploadPrefix}/>)}
            </div>

            <div className="flex items-center justify-center gap-3">
                <If condition={currentPage < page.pages - 1}>
                    <button className="p-2 !h-8 !w-8 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="上一页"
                            onClick={() => setCurrentPage(currentPage - 1)}>
                        <HiArrowLeft className="text-white text-xs"/>
                    </button>
                </If>

                <span>{currentPage + 1} / {page.pages}</span>

                <If condition={currentPage > 0}>
                    <button className="p-2 !h-8 !w-8 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="下一页"
                            onClick={() => setCurrentPage(currentPage + 1)}>
                        <HiArrowRight className="text-white text-xs"/>
                    </button>
                </If>
            </div>
        </div>
    </section>
}

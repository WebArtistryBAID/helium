'use client'

import { getContentEntityURI, Paginated, prefixLink, SimplifiedContentEntity } from '@/app/lib/data-types'
import { useEffect, useState } from 'react'
import { getPublishedContentEntities } from '@/app/studio/editor/entity-actions'
import If from '@/app/lib/If'
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi2'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import { EntityType } from '@/generated/prisma/browser'
import Card from '@/app/lib/puck/components/Card'

export default function NewsList({ init, uploadPrefix, category: rawCategory }: {
    init: Paginated<SimplifiedContentEntity>,
    uploadPrefix: string,
    category?: string | null
}) {
    const language = useLanguage()
    const [ page, setPage ] = useState<Paginated<SimplifiedContentEntity>>(init)
    const [ currentPage, setCurrentPage ] = useState(0)
    const category = rawCategory?.trim() || undefined

    useEffect(() => {
        setPage(init)
        setCurrentPage(0)
    }, [ init ])

    useEffect(() => {
        if (currentPage === 0) {
            return
        }

        (async () => {
            setPage(await getPublishedContentEntities(currentPage, EntityType.post, undefined, category))
        })()
    }, [ category, currentPage ])

    return <section className="container my-24 section">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-3">
            {page.items.map(post => <Card href={prefixLink(language, getContentEntityURI(post.createdAt, post.slug))}
                                          image={post.coverImagePublished}
                                          title={language === 'en' ? post.titlePublishedEN : post.titlePublishedZH}
                                          shortContent={language === 'en' ? post.shortContentPublishedEN : post.shortContentPublishedZH}
                                          uploadPrefix={uploadPrefix} key={post.id}/>)}
        </div>

        <div className="flex items-center justify-center gap-3">
            <If condition={currentPage > 0}>
                <button className="p-2 !h-8 !w-8 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="上一页"
                        onClick={() => setCurrentPage(currentPage - 1)}>
                    <HiArrowLeft className="text-white text-xs"/>
                </button>
            </If>

            <span>{currentPage + 1} / {page.pages}</span>

            <If condition={currentPage < page.pages - 1}>
                <button className="p-2 !h-8 !w-8 bg-blue-500 hover:bg-blue-600 transition-colors
                             duration-100 rounded-full flex justify-center items-center" aria-label="下一页"
                        onClick={() => setCurrentPage(currentPage + 1)}>
                    <HiArrowRight className="text-white text-xs"/>
                </button>
            </If>
        </div>
    </section>
}

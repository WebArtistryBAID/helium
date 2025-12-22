'use client'

import { getContentEntityURI, Paginated, prefixLink, SimplifiedContentEntity } from '@/app/lib/data-types'
import { useEffect, useState } from 'react'
import { getPublishedProjectsByCategory } from '@/app/studio/editor/entity-actions'
import Link from 'next/link'
import If from '@/app/lib/If'
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi2'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import Card from '@/app/lib/puck/components/Card'

export default function ProjectCategory({ titleEN, titleZH, init, uploadPrefix }: {
    titleEN: string,
    titleZH: string,
    init: Paginated<SimplifiedContentEntity>,
    uploadPrefix: string
}) {
    const language = useLanguage()
    const [ page, setPage ] = useState<Paginated<SimplifiedContentEntity>>(init)
    const [ currentPage, setCurrentPage ] = useState(0)

    useEffect(() => {
        (async () => {
            setPage(await getPublishedProjectsByCategory(currentPage, titleEN))
        })()
    }, [ currentPage, titleEN ])

    return <section className="container my-24 section">
        <h2 className="text-3xl font-bold mb-5">{language === 'en' ? titleEN : titleZH}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-3">
            {page.items.map(project => <Card
                key={project.id}
                href={prefixLink(language, getContentEntityURI(project.createdAt, project.slug))}
                title={language === 'en' ? project.titlePublishedEN : project.titlePublishedZH}
                shortContent={language === 'en' ? project.shortContentPublishedEN : project.shortContentPublishedZH}
                image={project.coverImagePublished}
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
    </section>
}

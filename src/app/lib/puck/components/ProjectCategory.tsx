'use client'

import { getContentEntityURI, Paginated, prefixLink, SimplifiedContentEntity } from '@/app/lib/data-types'
import { useEffect, useState } from 'react'
import { getPublishedProjectsByCategory } from '@/app/studio/editor/entity-actions'
import Link from 'next/link'
import If from '@/app/lib/If'
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi2'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

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
            {page.items.map(project => <Link
                href={prefixLink(language, getContentEntityURI(project.createdAt, project.slug))}
                className="block rounded-3xl bg-gray-50 hover:bg-gray-100 hover:shadow-lg transition-all duration-100 group cursor-pointer"
                key={project.id}>
                <If condition={project.coverImagePublished != null}>
                    <img src={`${uploadPrefix}/${project.coverImagePublished?.sha1}_thumb.webp`}
                         alt={project.coverImagePublished?.altText}
                         className="object-cover w-full rounded-3xl h-48 group-hover-scale"/>
                </If>
                <If condition={project.coverImagePublished == null}>
                    <div
                        className="w-full h-32 rounded-3xl from-blue-300 to-blue-500 bg-gradient-to-tr group-hover-scale"/>
                </If>

                <div className="p-8">
                    <p className="text-xl font-bold mb-1 fancy-link">{language === 'en' ? project.titlePublishedEN : project.titlePublishedZH}</p>
                    <p className="text-sm secondary">{language === 'en' ? project.shortContentPublishedEN : project.shortContentPublishedZH}</p>
                </div>
            </Link>)}
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

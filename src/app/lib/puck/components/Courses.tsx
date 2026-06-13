'use client'

import { getContentEntityURI, prefixLink, SimplifiedContentEntity } from '@/app/lib/data-types'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import Link from 'next/link'

export default function Courses({ title, courses }: {
    title: string | undefined,
    courses: { [courseName: string]: (SimplifiedContentEntity | undefined)[] | undefined }
}) {
    const language = useLanguage()
    const tabNames = useMemo(() => Object.keys(courses || {}), [ courses ])
    const [ selected, setSelected ] = useState<string | null>(null)

    // Initialize selected to first tab when data arrives/changes
    useEffect(() => {
        if (tabNames.length) setSelected((prev) => (prev && tabNames.includes(prev) ? prev : tabNames[0]))
        else setSelected(null)
    }, [ tabNames ])

    const change = useCallback((name: string) => setSelected(name), [])

    const currentItems = useMemo(() => {
        if (!selected) return [] as (SimplifiedContentEntity | undefined)[]
        return courses?.[selected] ?? []
    }, [ courses, selected ])

    // Keyboard navigation (Left/Right arrows)
    const onTabKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!tabNames.length || !selected) return
        const idx = tabNames.findIndex((n) => n === selected)
        if (idx < 0) return
        if (e.key === 'ArrowRight') {
            const next = tabNames[(idx + 1) % tabNames.length]
            setSelected(next)
            e.preventDefault()
        } else if (e.key === 'ArrowLeft') {
            const prev = tabNames[(idx - 1 + tabNames.length) % tabNames.length]
            setSelected(prev)
            e.preventDefault()
        }
    }, [ tabNames, selected ])

    return (
        <section aria-labelledby="courses-heading" className="section !my-16 container">
            <h2 id="courses-heading" className="text-4xl font-bold md:text-right mb-5">
                {title}
            </h2>

            <div
                aria-label="Course categories"
                className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mb-5"
                role="tablist"
                onKeyDown={onTabKeyDown}
            >
                {tabNames.map((name) => {
                    const isSelected = selected === name
                    return (
                        <button
                            id={`tab-${name}`}
                            key={name}
                            aria-controls={`panel-${name}`}
                            aria-selected={isSelected}
                            tabIndex={isSelected ? 0 : -1}
                            role="tab"
                            type="button"
                            className={[
                                'w-full h-full p-3 rounded-md transition-colors duration-300 cursor-pointer',
                                isSelected ? 'bg-red-900 text-white' : ''
                            ].join(' ')}
                            onClick={() => change(name)}
                        >
                            {language === 'en' ? courses[name]?.[0]?.categoryEN ?? name : courses[name]?.[0]?.categoryZH ?? name}
                        </button>
                    )
                })}
            </div>

            {selected && (
                <div
                    id={`panel-${selected}`}
                    key={selected}
                    aria-labelledby={`tab-${selected}`}
                    aria-label="Courses list"
                    role="tabpanel"
                    tabIndex={0}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-5 mb-5 transition-opacity duration-200"
                >
                    {currentItems?.map((item) => (
                        <Link href={prefixLink(language, getContentEntityURI(item?.createdAt, item?.slug))}
                            key={item?.id ?? Math.random()}
                            role="listitem"
                              className="block text-2xl border-l-4 border-red-800 pl-3 col-span-1 md:col-span-2">
                            {language === 'en' ? (item?.titlePublishedEN ?? '') : (item?.titlePublishedZH ?? '')}
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

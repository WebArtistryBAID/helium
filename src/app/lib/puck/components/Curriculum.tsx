'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import LocalizedLink from '@/app/[[...slug]]/LocalizedLink'

export interface CurriculumCourseLink {
    name: string | undefined
    description?: string | undefined
    href?: string | undefined
}

export interface CurriculumItem {
    title: string | undefined
    description: string | undefined
    courses: (CurriculumCourseLink | undefined)[] | undefined
    primaryLabel?: string | undefined
    primaryLink?: string | undefined
}

export default function Curriculum({ title, curricula }: { title: string, curricula: CurriculumItem[] }) {
    const [ activeDesktopItem, setActiveDesktopItem ] = useState(0)
    const [ activeMobileItem, setActiveMobileItem ] = useState<number | null>(null)

    // Guarded lists for safe rendering
    const safeCurricula = useMemo(() => Array.isArray(curricula) ? curricula : [], [ curricula ])

    // Keep desktop selection in range when data changes
    useEffect(() => {
        if (!safeCurricula.length) {
            setActiveDesktopItem(0)
            setActiveMobileItem(null)
            return
        }
        if (activeDesktopItem >= safeCurricula.length) setActiveDesktopItem(0)
    }, [ safeCurricula, activeDesktopItem ])

    const handleTabKey = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const count = safeCurricula.length
        if (!count) return
        if (e.key === 'ArrowRight') {
            setActiveDesktopItem((index + 1) % count)
            e.preventDefault()
        } else if (e.key === 'ArrowLeft') {
            setActiveDesktopItem((index - 1 + count) % count)
            e.preventDefault()
        }
    }, [ safeCurricula.length ])

    const handleAccordionToggle = useCallback((e: React.SyntheticEvent<HTMLDetailsElement, Event>, index: number) => {
        const el = e.currentTarget
        setActiveMobileItem(el.open ? index : null)
    }, [])

    return (
        <section id="curriculum" className="section container" aria-labelledby="curriculum-heading">
            <h2 id="curriculum-heading" className="text-4xl font-bold !mb-8">
                {title}
            </h2>

            {/* Mobile (accordion) */}
            <div className="md:hidden">
                {safeCurricula.map((item, index) => (
                    <div key={index} className="mb-4">
                        <details
                            open={activeMobileItem === index}
                            className="!rounded-lg"
                            onToggle={(e) => handleAccordionToggle(e, index)}
                        >
                            <summary className="rounded-lg border border-[#e1d7cb] bg-[#f7f1e7] p-4 cursor-pointer font-medium">
                                {item?.title}
                            </summary>
                            <div className="p-4">
                                <h3 className="text-2xl font-semibold mb-3">{item?.title}</h3>
                                <div className="mb-5">{item?.description}</div>
                                <div className="grid grid-cols-1 gap-3">
                                    {(item?.courses ?? []).map((content, contentIndex) => (
                                        content?.href
                                            ? <LocalizedLink key={contentIndex} slug={content.href} className="block rounded-lg border border-[#e1d7cb] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                                                <p className="text-lg font-semibold text-gray-900">{content?.name}</p>
                                                {content?.description ? <p className="mt-2 text-sm leading-6 text-gray-600">{content.description}</p> : null}
                                            </LocalizedLink>
                                            : <div key={contentIndex} className="rounded-lg border border-[#ece2d6] bg-gray-100 p-4">
                                                <p className="text-lg font-semibold text-gray-900">{content?.name}</p>
                                                {content?.description ? <p className="mt-2 text-sm leading-6 text-gray-600">{content.description}</p> : null}
                                            </div>
                                    ))}
                                </div>
                                {item?.primaryLabel && item?.primaryLink ? (
                                    <div className="mt-5">
                                        <LocalizedLink slug={item.primaryLink} className="inline-flex rounded-full bg-[#7a1f1c] px-5 py-3 text-sm font-semibold text-white">
                                            {item.primaryLabel}
                                        </LocalizedLink>
                                    </div>
                                ) : null}
                            </div>
                        </details>
                    </div>
                ))}
            </div>

            {/* Desktop (tabs) */}
            <div className="hidden md:flex">
                <div aria-label="Curriculum sections" className="w-1/4" role="tablist">
                    {safeCurricula.map((item, index) => {
                        const isActive = activeDesktopItem === index
                        return (
                            <button
                                id={`curriculum-tab-${index}`}
                                key={index}
                                aria-controls={`curriculum-panel-${index}`}
                                aria-selected={isActive}
                                tabIndex={isActive ? 0 : -1}
                                role="tab"
                                className={`desktop-section-title cursor-pointer mb-5 block text-left ${isActive ? 'active' : ''}`}
                                onClick={() => setActiveDesktopItem(index)}
                                onKeyDown={(e) => handleTabKey(e, index)}
                            >
                                {item?.title}
                            </button>
                        )
                    })}
                </div>
                <div className="w-3/4">
                    {safeCurricula.map((item, index) => (
                        <div
                            id={`curriculum-panel-${index}`}
                            key={index}
                            aria-labelledby={`curriculum-tab-${index}`}
                            hidden={activeDesktopItem !== index}
                            role="tabpanel"
                            tabIndex={0}
                        >
                            <h3 className="mb-3 text-2xl font-semibold">{item?.title}</h3>
                            <div className="mb-5 max-w-3xl text-base leading-8 text-gray-700">{item?.description}</div>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                                {(item?.courses ?? []).map((content, contentIndex) => (
                                    content?.href
                                        ? <LocalizedLink
                                            key={contentIndex}
                                            slug={content.href}
                                            className="group rounded-[1.5rem] border border-[#e1d7cb] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                                        >
                                            <p className="text-lg font-semibold text-gray-900">{content?.name}</p>
                                            {content?.description ? (
                                                <p className="mt-3 text-sm leading-7 text-gray-600">{content.description}</p>
                                            ) : null}
                                            <div className="mt-4 inline-flex items-center rounded-full bg-[#7a1f1c] px-4 py-2 text-sm font-semibold text-white">
                                                查看课程
                                            </div>
                                        </LocalizedLink>
                                        : <div
                                            key={contentIndex}
                                            className="rounded-[1.5rem] border border-[#ece2d6] bg-gray-100 p-5 transition-shadow duration-200 hover:shadow-md"
                                        >
                                            <p className="text-lg font-semibold text-gray-900">{content?.name}</p>
                                            {content?.description ? (
                                                <p className="mt-3 text-sm leading-7 text-gray-600">{content.description}</p>
                                            ) : null}
                                        </div>
                                ))}
                            </div>
                            {item?.primaryLabel && item?.primaryLink ? (
                                <div className="mt-6">
                                    <LocalizedLink slug={item.primaryLink} className="inline-flex rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white">
                                        {item.primaryLabel}
                                    </LocalizedLink>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .desktop-section-title {
                    border-left-width: 4px;
                    border-left-color: #d5c6b8;
                    color: #b9ab9c;
                    transition-property: all;
                    transition-duration: 200ms;
                    font-size: 1.5rem;
                    padding-left: 1rem;
                }

                .desktop-section-title:hover {
                    border-left-color: #7a1f1c;
                    color: #4b5563;
                }

                .desktop-section-title.active {
                    border-left-color: #7a1f1c;
                    color: black;
                }
            `}</style>
        </section>
    )
}

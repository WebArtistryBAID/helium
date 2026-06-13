'use client'

export interface CurriculumItem {
    title: string | undefined
    description: string | undefined
    courses: ({ name: string | undefined } | undefined)[] | undefined
}

import { useCallback, useEffect, useMemo, useState } from 'react'

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
                            <summary className="p-4 bg-gray-100 rounded-lg cursor-pointer font-medium">
                                {item?.title}
                            </summary>
                            <div className="p-4">
                                <h3 className="text-2xl font-semibold mb-3">{item?.title}</h3>
                                <div className="mb-5">{item?.description}</div>
                                <div className="grid grid-cols-1 gap-3">
                                    {(item?.courses ?? []).map((content, contentIndex) => (
                                        <div key={contentIndex} className="bg-gray-100 p-3 rounded-lg">
                                            {content?.name}
                                        </div>
                                    ))}
                                </div>
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
                                type="button"
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
                            <h3 className="text-2xl font-semibold mb-3">{item?.title}</h3>
                            <div className="mb-5">{item?.description}</div>
                            <div className="grid grid-cols-3 gap-3">
                                {(item?.courses ?? []).map((content, contentIndex) => (
                                    <div
                                        key={contentIndex}
                                        className="bg-gray-100 p-3 rounded-lg transition-shadow duration-200 hover:shadow-md"
                                    >
                                        {content?.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .desktop-section-title {
                    border-left-width: 4px;
                    border-left-color: lightgray;
                    color: lightgray;
                    transition-property: all;
                    transition-duration: 200ms;
                    font-size: 1.5rem;
                    padding-left: 1rem;
                }

                .desktop-section-title:hover {
                    border-left-color: gray;
                    color: gray;
                }

                .desktop-section-title.active {
                    border-left-color: oklch(50.5% 0.213 27.518);
                    color: black;
                }

                .desktop-section-title:focus-visible {
                    color: black;
                }
            `}</style>
        </section>
    )
}

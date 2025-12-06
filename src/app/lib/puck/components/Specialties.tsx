'use client'

import { Image } from '@/generated/prisma/browser'
import { useCallback, useState } from 'react'

export interface SpecialtyItem {
    name: string | undefined
    description: string | undefined
    image: Image | undefined
}

export default function Specialties({ items, uploadPrefix }: {
    items: (SpecialtyItem | undefined)[] | undefined,
    uploadPrefix: string
}) {
    const list = (items ?? []).filter(Boolean) as SpecialtyItem[]

    const [ current, setCurrent ] = useState(0)
    const [ transition, setTransition ] = useState(false)

    const change = useCallback((index: number) => {
        if (index === current || transition) return
        setTransition(true)
        window.setTimeout(() => {
            setCurrent(index)
            window.setTimeout(() => setTransition(false), 150)
        }, 300)
    }, [ current, transition ])

    if (!list.length) return null

    const active = list[current]

    return (
        <section aria-label="Specialties section" aria-labelledby="specialties-heading" className="section container">
            <h2 id="specialties-heading" className="sr-only">Specialties</h2>

            <div className="md:hidden">
                <div className="relative">
                    <img
                        className={`w-full h-64 object-cover transition-opacity duration-300 ${transition ? 'opacity-60' : ''}`}
                        src={`${uploadPrefix}/${active?.image?.sha1}.webp`}
                        alt={active?.image?.altText}
                    />
                    <div
                        className={`absolute bottom-0 left-0 right-0 p-5 text-white special-bg transition-opacity duration-300 ${transition ? 'opacity-0' : ''}`}
                    >
                        <h2 className="text-2xl font-bold mb-2">{active?.name}</h2>
                    </div>
                </div>

                <div
                    aria-label="Specialties carousel"
                    aria-roledescription="carousel"
                    className="flex gap-1 overflow-x-auto mt-4 pb-4"
                    role="region"
                >
                    {list.map((method, index) => (
                        <div key={method?.name ?? index} className="flex-shrink-0">
                            <img
                                alt={`Learning Experience: ${method?.name ?? ''}`}
                                className={`w-32 h-32 object-cover block opacity-60 transition-all cursor-pointer ${current === index ? '!opacity-100' : (!transition ? 'hover:opacity-100 active:brightness-90' : '')}`}
                                src={`${uploadPrefix}/${method?.image?.sha1}.webp`}
                                role="button"
                                aria-label={`Show specialty ${method?.name ?? ''}`}
                                aria-pressed={current === index}
                                tabIndex={0}
                                onClick={() => change(index)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:grid gap-1" style={{ gridTemplateColumns: '3fr 1fr' }}>
                <div className="relative">
                    <img
                        src={`${uploadPrefix}/${active?.image?.sha1}.webp`}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${transition ? 'opacity-60' : ''}`}
                        alt={`Specialty: ${active?.name ?? ''}`}
                        aria-live="polite"
                    />
                    <div
                        className={`absolute bottom-0 p-10 pt-20 text-white from-red-900/70 to-transparent bg-gradient-to-t w-full transition-opacity duration-300 ${transition ? 'opacity-0' : ''}`}
                    >
                        <h2 className="text-4xl font-bold mb-2">{active?.name}</h2>
                        <p className="text-xl" dangerouslySetInnerHTML={{ __html: active?.description ?? '' }}/>
                    </div>
                </div>
                <div
                    aria-label="Specialties carousel"
                    aria-roledescription="carousel"
                    className="grid gap-1"
                    role="region"
                >
                    {list.map((method, index) => (
                        <div key={method?.name ?? index}>
                            <img
                                className={`w-full h-full object-cover block opacity-60 transition-all cursor-pointer ${current === index ? '!opacity-100' : (!transition ? 'hover:opacity-100 active:brightness-90' : '')}`}
                                src={`${uploadPrefix}/${method?.image?.sha1}.webp`}
                                alt={`Learning Experience: ${method?.name ?? ''}`}
                                role="button"
                                aria-label={`Show specialty ${method?.name ?? ''}`}
                                aria-pressed={current === index}
                                tabIndex={0}
                                onClick={() => change(index)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

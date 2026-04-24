'use client'

import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { buildLocalizedPath, getCurrentSlugFromPathname, isSectionActive } from '@/app/[[...slug]]/route-utils'

export default function RouterLinks({ pages }: {
    pages: { id: number, titleEN: string, titleZH: string, slug: string, subPages?: { slug: string }[] }[]
}) {
    const language = useLanguage()
    const pathname = usePathname()
    const path = getCurrentSlugFromPathname(pathname)
    const [ showBlock, setShowBlock ] = useState(false)
    const [ blockLeft, setBlockLeft ] = useState(0)

    function updateBlock(index: number) {
        setShowBlock(true)
        setBlockLeft(7.5 * index)
    }

    return <nav className="flex p-0 relative h-full m-0 links" aria-label="Main navigation" role="navigation"
                onMouseLeave={() => setShowBlock(false)}>
        {pages.map((page, index) => <div key={index} className="h-full text-lg" tabIndex={0}
                                         onBlur={() => setShowBlock(false)} onClick={() => updateBlock(index)}
                                         onFocus={() => updateBlock(index)} onMouseOver={() => updateBlock(index)}>
            <Link href={buildLocalizedPath(language, page.slug)}
                  className={`inline-block w-30 h-full decoration-none opacity-50 transition-colors text-inherit hover:opacity-100 active:opacity-60 
                  ${isSectionActive(path, page.slug, page.subPages?.map(subPage => subPage.slug) ?? [])
        ? (path === 'life' || path === 'projects' ? 'opacity-100' : 'opacity-100 text-red-900')
        : ''}`}>
                <div className="flex items-center justify-center w-full h-full">
                    {language === 'zh' ? page.titleZH : page.titleEN}
                </div>
            </Link>
        </div>)}

        <div
            className={`${showBlock ? 'opacity-10' : 'opacity-0'} absolute w-30 h-full bg-black opacity-0 z-10 pointer-events-none transition-all duration-300`}
            style={{ left: blockLeft + 'rem' }}/>
    </nav>

}

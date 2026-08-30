'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WebsiteLink } from '@/app/lib/website-metadata-types'

export default function RouterLinks({ items }: {
    items: WebsiteLink[]
}) {
    const pathSegments = usePathname().split('/').filter(Boolean)
    const path = `/${([ 'en', 'zh' ].includes(pathSegments[0]) ? pathSegments.slice(1) : pathSegments).join('/')}`
    const [ showBlock, setShowBlock ] = useState(false)
    const [ blockLeft, setBlockLeft ] = useState(0)

    function updateBlock(index: number) {
        setShowBlock(true)
        setBlockLeft(7.5 * index)
    }

    return <div className="flex p-0 relative h-full m-0 links"
                onBlur={event => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setShowBlock(false)
                }}
                onMouseLeave={() => setShowBlock(false)}>
        {items.map((item, index) => <div key={item.id} className="h-full text-lg">
            <Link href={item.url || '/'}
                  aria-current={path === item.url ? 'page' : undefined}
                  onFocus={() => updateBlock(index)}
                  onMouseOver={() => updateBlock(index)}
                  className={`inline-block w-30 h-full decoration-none opacity-80 transition-colors text-inherit hover:opacity-100 active:opacity-70
                  ${path === item.url ? ((path === '/life' || path === '/projects') ? 'opacity-100' : 'opacity-100 text-red-900') : ''}`}>
                <div className="flex items-center justify-center w-full h-full">
                    {item.name}
                </div>
            </Link>
        </div>)}

        <div
            className={`${showBlock ? 'opacity-10' : 'opacity-0'} absolute w-30 h-full bg-black opacity-0 z-10 pointer-events-none transition-all duration-300`}
            style={{ left: blockLeft + 'rem' }}/>
    </div>

}

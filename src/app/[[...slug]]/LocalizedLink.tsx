'use client'

import Link, { LinkProps } from 'next/link'
import { ReactNode } from 'react'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import { buildLocalizedPath } from '@/app/[[...slug]]/route-utils'

export default function LocalizedLink({
    slug,
    children,
    ...props
}: Omit<LinkProps, 'href'> & {
    slug: string
    children: ReactNode
    className?: string
}) {
    const language = useLanguage()

    return (
        <Link href={buildLocalizedPath(language, slug)} {...props}>
            {children}
        </Link>
    )
}

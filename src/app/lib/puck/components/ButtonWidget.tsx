'use client'

import { Button } from 'flowbite-react'
import { prefixLink } from '@/app/lib/data-types'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

export default function ButtonWidget({ text, link, color, size, align, blank }: {
    text: string,
    link: string,
    color: string,
    size: string,
    align: string,
    blank: boolean
}) {
    const language = useLanguage()
    return <div className={`w-full flex ${align != null ? `justify-${align}` : ''}`}>
        <Button as={'a'} href={prefixLink(language, link)} target={blank ? '_blank' : undefined}
                color={color} size={size}
                pill>{text}</Button>
    </div>
}

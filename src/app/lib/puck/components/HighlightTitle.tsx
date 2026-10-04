'use client'

import { useLanguage } from '@/app/[[...slug]]/useLanguage'

export default function HighlightTitle({ title }: { title: string }) {
    const language = useLanguage()
    return <p
        className={`fancy-link mb-1 break-words font-serif font-bold ${language === 'zh' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
        {title}
    </p>
}

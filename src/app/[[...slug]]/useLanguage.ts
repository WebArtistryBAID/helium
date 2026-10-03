'use client'

import { usePathname } from 'next/navigation'
import { createContext, createElement, useContext, type ReactNode } from 'react'

const LanguageContext = createContext<'en' | 'zh' | null>(null)

export function LanguageProvider({ language, children }: { language: 'en' | 'zh'; children: ReactNode }) {
    return createElement(LanguageContext.Provider, { value: language }, children)
}

export function useLanguage(): 'en' | 'zh' {
    const language = useContext(LanguageContext)
    const pathname = usePathname()
    if (language) return language
    if (!pathname) return 'en'

    const firstPart = pathname.split('/')[1]
    if (firstPart === 'zh') return 'zh'
    return 'en'
}

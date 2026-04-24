import type { Metadata } from 'next'
import './globals.css'
import { ReactNode } from 'react'
import NextTopLoader from 'nextjs-toploader'
import { ThemeInit } from '../../.flowbite-react/init'
import { cookies, headers } from 'next/headers'

import ScrollLock from '@/app/lib/ScrollLock'

export const metadata: Metadata = {
    title: 'Beijing Academy International Division',
    description: 'Beijing Academy International Division (BAID) is a CIS-member international high school program in Beijing offering AP and Cambridge curricula.'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
    const pathname = (await headers()).get('x-pathname') || '/'
    const locale =
        pathname.startsWith('/zh') ||
        (await cookies()).get('lang')?.value === 'zh'
            ? 'zh'
            : 'en'

    return (
        <html lang={locale} suppressHydrationWarning>
        <head><ThemeInit/></head>
        <body className="antialiased">
        <ScrollLock/>
        <NextTopLoader showSpinner={false}/>
        {children}
        <p aria-hidden className="fixed bottom-2 right-2 secondary text-xs"><a
            href="https://beian.miit.gov.cn">{process.env.BOTTOM_TEXT}</a></p>
        </body>
        </html>
    )
}

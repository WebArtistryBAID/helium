import type { Metadata } from 'next'
import './globals.css'
import { ReactNode } from 'react'
import NextTopLoader from 'nextjs-toploader'
import { ThemeInit } from '../../.flowbite-react/init'
import { cookies, headers } from 'next/headers'
import { ThemeProvider } from 'flowbite-react'
import { getPublishedWebsiteMetadata } from '@/app/lib/metadata/website-metadata.server'

async function getRequestLocale(): Promise<'en' | 'zh'> {
    const pathname = (await headers()).get('X-Invoke-Path') || '/'
    return pathname.startsWith('/zh') || (await cookies()).get('lang')?.value === 'zh' ? 'zh' : 'en'
}

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRequestLocale()
    const websiteMetadata = await getPublishedWebsiteMetadata()
    return {
        title: websiteMetadata[locale].title,
        description: websiteMetadata[locale].description
    }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
    const locale = await getRequestLocale()

    return (
        <html lang={locale} suppressHydrationWarning>
        <head><ThemeInit/></head>
        <body className="antialiased">
        <NextTopLoader showSpinner={false}/>
        <ThemeProvider props={{ modal: { dismissible: true } }} theme={{
            modal: {
                content: { inner: 'rounded-3xl shadow-none' },
                header: {
                    base: 'rounded-t-3xl',
                    popup: 'border-b-0 px-6 pb-3 pt-6'
                },
            footer: { base: 'rounded-b-3xl' }
        } }}>
            {children}
        </ThemeProvider>
        <p className="fixed bottom-2 right-2 secondary text-xs"><a
            href="https://beian.miit.gov.cn">{process.env.BOTTOM_TEXT}</a></p>
        </body>
        </html>
    )
}

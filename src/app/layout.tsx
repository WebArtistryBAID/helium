import type { Metadata } from 'next'
import './globals.css'
import { ReactNode } from 'react'
import NextTopLoader from 'nextjs-toploader'
import { ThemeInit } from '../../.flowbite-react/init'
import { cookies, headers } from 'next/headers'
import { ThemeProvider } from 'flowbite-react'
import { getPublishedWebsiteMetadata } from '@/app/lib/metadata/website-metadata.server'
import parse from 'html-react-parser'

export async function generateMetadata(): Promise<Metadata> {
    const websiteMetadata = await getPublishedWebsiteMetadata()
    const googleSiteVerification = websiteMetadata.en.googleSiteVerification || websiteMetadata.zh.googleSiteVerification

    return {
        title: 'Helium',
        description: 'Helium is the new content management system for the website of Beijing Academy International Division (BAID) and the International School of Beijing Academy (ISBA).',
        verification: googleSiteVerification ? { google: googleSiteVerification } : undefined
    }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
    const websiteMetadata = await getPublishedWebsiteMetadata()
    const pathname = (await headers()).get('X-Invoke-Path') || '/'
    const isStudio = pathname === '/studio' || pathname.startsWith('/studio/')
    const extraHeadHtml = isStudio ? '' : websiteMetadata.en.extraHeadHtml || websiteMetadata.zh.extraHeadHtml
    const locale =
        pathname.startsWith('/zh') ||
        (await cookies()).get('lang')?.value === 'zh'
            ? 'zh'
            : 'en'

    return (
        <html lang={locale} suppressHydrationWarning>
        {/* Keep Next.js stylesheet links under React's control during hydration. */}
        <head>{parse(extraHeadHtml)}</head>
        <body className="antialiased">
        <ThemeInit/>
        <NextTopLoader showSpinner={false}/>
        <ThemeProvider props={{ modal: { dismissible: true } }} theme={{
            modal: {
                content: { inner: 'rounded-3xl shadow-none' },
                header: {
                    base: 'rounded-t-3xl',
                    popup: 'border-b-0 px-6 pb-3 pt-6'
                },
                footer: { base: 'rounded-b-3xl' }
            }
        }}>
            {children}
        </ThemeProvider>
        </body>
        </html>
    )
}

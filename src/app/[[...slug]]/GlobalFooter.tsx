'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import { WebsiteMetadataDraft } from '@/app/lib/website-metadata-types'

const locales = {
    en: {
        nav: 'Footer Navigation',
        backend: 'Open Administrative Interface'
    },
    zh: {
        nav: '页脚导航',
        backend: '打开管理后台'
    }
}

export default function GlobalFooter({ websiteMetadata }: {
    websiteMetadata: WebsiteMetadataDraft
}) {
    const language = useLanguage()
    const content = websiteMetadata[language]
    const phoneHref = `tel:${content.footer.phoneText.replace(/[^\d+]/g, '')}`

    return <footer className="w-full !font-sans py-16 px-5 !text-white bg-red-900">
        <div className="container mb-5">
            <p className="uppercase tracking-[0.3em] !mb-5 font-sans text-lg">
                BEIJING ACADEMY
            </p>

            <nav aria-label={locales[language].nav} role="navigation"
                 className="lg:flex lg:justify-between lg:gap-3 space-y-3 mb-5">
                {content.footer.items.map(item =>
                    <div key={item.id}>
                        <Link href={item.url || '/'} className="fancy-link link-white mb-2">
                            <h3 className="text-lg font-bold">
                                {item.name}
                            </h3>
                        </Link>
                        <div className="flex flex-col">
                            {item.subItems.map(subItem =>
                                <Link href={subItem.url || '/'} className="link-white"
                                      key={subItem.id}>
                                    {subItem.name}
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            <address className="mb-5">
                <p><a href={phoneHref}>{content.footer.phoneText}</a></p>
                <p><a href={`mailto:${content.footer.emailText.trim()}`}>{content.footer.emailText}</a></p>
            </address>

            <p>{content.footer.copyrightText}</p>
            <p className="break-words"><a href={content.footer.chineseWebsiteUrl}>{content.footer.chineseWebsiteText}</a></p>
            <p><a href="https://beian.miit.gov.cn">{content.footer.icpNumber}</a></p>
        </div>
    </footer>
}

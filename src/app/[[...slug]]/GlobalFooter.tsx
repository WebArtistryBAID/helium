'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import { resolveWebsiteHref, WebsiteMetadataDraft } from '@/app/lib/metadata/website-metadata-types'

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
            <p className="uppercase tracking-[0.3em] !mb-5 font-sans text-lg"
               style={{ fontFamily: 'Lato; sans-serif' }}>
                BEIJING ACADEMY
            </p>

            <nav aria-label={locales[language].nav} role="navigation"
                 className="lg:flex lg:justify-between lg:gap-3 space-y-3 mb-5">
                {content.footer.items.map(item =>
                    <div key={item.id}>
                        <Link href={resolveWebsiteHref(item.url)} className="fancy-link link-white mb-2">
                            <h3 className="text-lg font-bold">
                                {item.name}
                            </h3>
                        </Link>
                        <div className="flex flex-col">
                            {item.subItems.map(subItem =>
                                <Link href={resolveWebsiteHref(subItem.url)} className="link-white"
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
            <p className="break-words"><a
                href={content.footer.chineseWebsiteUrl}>{content.footer.chineseWebsiteText}</a></p>
            <p className="mb-5"><a href="https://beian.miit.gov.cn">{content.footer.icpNumber}</a></p>

            <p className="max-w-lg">This website is powered by <a className="fancy-link link-white"
                                                                  href="https://github.com/WebArtistryBAID/helium">Helium</a> and
                created by <a className="fancy-link link-white" href="https://dreta.dev">Lin Donglai</a> and <a
                    className="fancy-link link-white" href="https://github.com/WebArtistryBAID">Team WebArtistry</a>.
                Content is compiled by Beijing Academy students & faculty. Thank you to all <a
                    className="fancy-link link-white"
                    href="https://github.com/WebArtistryBAID/helium/contributors">contributors</a>.</p>
        </div>
    </footer>
}

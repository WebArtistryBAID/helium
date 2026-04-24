'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import SchoolLogo from '@/app/[[...slug]]/SchoolLogo'
import RouterLinks from '@/app/[[...slug]]/RouterLinks'
import GlobalFooter from '@/app/[[...slug]]/GlobalFooter'
import { switchLocalePath } from '@/app/[[...slug]]/route-utils'

const locales = {
    en: {
        a11y: 'Skip to Main Content',
        language: 'Switch Language',
        close: 'Close',
        menu: 'Menu',
        open: 'Open Menu',
        nav: 'Primary Navigation'
    },
    zh: {
        a11y: '跳至主内容',
        language: '切换语言',
        close: '关闭',
        menu: '菜单',
        open: '打开菜单',
        nav: '主导航'
    }
}

export default function GlobalHeader({ pages, headerAnimate = false }: {
    pages: {
        id: number,
        titleEN: string,
        titleZH: string,
        slug: string,
        subPages: { id: number, titleEN: string, titleZH: string, slug: string }[]
    }[],
    headerAnimate?: boolean
}) {
    const pathname = usePathname() || '/'
    const language = useLanguage()
    const router = useRouter()

    // ----- Scroll + visibility state -----
    const [ scrollY, setScrollY ] = useState<number>(0)
    const [ headerVisible, setHeaderVisible ] = useState(true)
    const [ mounted, setMounted ] = useState(false)

    useEffect(() => {
        setMounted(true)
        setScrollY(window.scrollY)
    }, [])

    useEffect(() => {
        if (!mounted) return
        let lastY = window.scrollY
        const onScroll = () => {
            const y = window.scrollY
            setScrollY(y)
            // Always show header when close to top
            if (y <= 1) {
                setHeaderVisible(true)
            } else {
                // Show on upward scroll, hide on downward
                setHeaderVisible(y < lastY)
            }
            lastY = y
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [ mounted ])

    // ----- Styling derived state -----
    const backgroundClass = useMemo(() => {
        if (!headerAnimate) return 'bg-white'
        if (!mounted) return 'bg-white'
        return scrollY < window.innerHeight ? 'bg-transparent' : 'bg-white'
    }, [ headerAnimate, mounted, scrollY ])

    const isTransparent = useMemo(() => {
        return headerAnimate && mounted && scrollY < window.innerHeight
    }, [ headerAnimate, mounted, scrollY ])

    // ----- Mobile menu state / a11y -----
    const [ mobileOpen, setMobileOpen ] = useState(false)
    const closeButtonRef = useRef<HTMLButtonElement | null>(null)

    const [ useBlackText, setUseBlackText ] = useState(true)

    useEffect(() => {
        if (mobileOpen) {
            const prev = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            requestAnimationFrame(() => closeButtonRef.current?.focus())
            return () => {
                document.body.style.overflow = prev
            }
        } else {
            document.body.style.overflow = ''
        }
    }, [ mobileOpen ])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileOpen) setMobileOpen(false)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [ mobileOpen ])

    useEffect(() => {
        setMobileOpen(false)
    }, [ pathname ])

    useEffect(() => {
        const update = () => {
            // 1) If header background is white (i.e., not transparent), always use black text
            if (!isTransparent) {
                setUseBlackText(true)
                return
            }
            // 2) Otherwise detect underlying surface
            const x = Math.floor(window.innerWidth / 2)
            const y = 1 // just below the top edge
            const stack = document.elementsFromPoint(x, y)
            const firstBelow = stack.find((n) => {
                if (!(n instanceof HTMLElement)) return false
                // exclude the header itself and its descendants
                return !n.closest('header[role="banner"]')
            }) as HTMLElement | undefined

            let cur: HTMLElement | null = firstBelow ?? null
            let surface: string | null = null
            while (cur && !surface) {
                surface = cur.getAttribute('data-surface')
                cur = cur.parentElement
            }
            // Default to black text if we can't determine
            setUseBlackText(surface !== 'dark')
        }

        update()
        window.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
        }
    }, [ isTransparent ])

    return (
        <>
            <a className="sr-only" href="#main-content">
                {locales[language].a11y}
            </a>

            <header
                role="banner"
                className={[
                    'fixed top-0 left-0 w-screen px-4 sm:px-8 gap-3 flex z-50 transform transition-all duration-300',
                    headerVisible ? 'translate-y-0' : '-translate-y-full',
                    backgroundClass
                ].join(' ')}>
                <div className="mr-auto py-4 transition-colors duration-300">
                    <SchoolLogo color={useBlackText ? 'black' : 'white'}/>
                </div>

                <nav
                    aria-label={locales[language].nav}
                    className={[
                        'hidden lg:flex transition-colors duration-300',
                        useBlackText ? 'text-black' : 'text-white'
                    ].join(' ')}
                >
                    <RouterLinks pages={pages}/>
                    <div className="flex items-center justify-center text-lg ml-3">
                        <a className="bg-red-900 rounded-full p-2 text-white" href="https://link.beijing.academy"
                           target="_blank" rel="noreferrer">
                            LinkBAID
                        </a>
                    </div>
                </nav>

                <div className="h-18 w-24 flex items-center justify-center gap-2">
                    <button
                        className="lg:hidden transition-colors duration-100 opacity-50 hover:opacity-100 active:opacity-80 pt-1.5"
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-menu"
                        aria-haspopup="true"
                        aria-label={mobileOpen ? locales[language].close : locales[language].open}
                        onClick={() => setMobileOpen((o) => !o)}>
                        <svg
                            stroke={useBlackText ? '#000' : '#fff'}
                            aria-hidden="true"
                            className="h-6 w-6 transition-colors duration-300"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M4 6h16M4 12h16M4 18h16"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                            />
                        </svg>
                    </button>

                    <button
                        onClick={() => {
                            const newLang = language === 'zh' ? 'en' : 'zh'
                            document.cookie = `lang=${newLang}; path=/; max-age=${60 * 60 * 24 * 30}`
                            router.push(switchLocalePath(pathname, newLang))
                        }}
                        aria-label={locales[language].language}
                        className="decoration-none transition-colors duration-100 opacity-50 hover:opacity-100 active:opacity-80"
                        style={{ color: useBlackText ? 'black' : 'white' }}>
                        <svg className="w-6 h-10" height="32" viewBox="0 0 24 18" width="32"
                             aria-label={locales[language].language}>
                            <path
                                d="m12.87 15.07l-2.54-2.51l.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35C8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5l3.11 3.11l.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24Z"
                                fill="currentColor"/>
                        </svg>
                    </button>
                </div>

                {mobileOpen && (
                    <div
                        id="mobile-menu"
                        aria-label={locales[language].menu}
                        aria-modal="true"
                        role="dialog"
                        className="fixed inset-0 bg-red-900 h-screen overflow-y-auto z-50">
                        <button
                            ref={closeButtonRef}
                            aria-label={locales[language].close}
                            className="lg:hidden transition-colors text-white duration-100 opacity-50 hover:opacity-100 active:opacity-80 absolute top-4 right-4"
                            onClick={() => setMobileOpen(false)}>
                            <svg aria-hidden="true" height="24" stroke="currentColor" strokeLinecap="round"
                                 strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                                <line x1="18" x2="6" y1="6" y2="18"/>
                                <line x1="6" x2="18" y1="6" y2="18"/>
                            </svg>
                        </button>

                        <GlobalFooter pages={pages}/>
                    </div>
                )}
            </header>
        </>
    )
}

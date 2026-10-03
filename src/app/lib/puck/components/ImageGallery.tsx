'use client'

import { Image } from '@/generated/prisma/browser'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay, Pagination } from 'swiper/modules'
import { useEffect, useRef } from 'react'
import ReadMore from '@/app/lib/puck/components/ReadMore'

export const TITLE_SIZE_CLASSES: Record<string, string> = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-3xl sm:text-4xl',
    '5xl': 'text-3xl sm:text-4xl lg:text-5xl',
    '6xl': 'text-4xl sm:text-5xl lg:text-6xl',
    '7xl': 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl'
}

export interface GallerySlide {
    title: string | undefined
    titleSize: string | undefined
    content: string | undefined
    link: string | undefined
    linkText: string | undefined
    image: Image | null
}

export default function ImageGallery({
                                         title,
                                         slides,
                                         uploadPrefix,
                                         autoplay = false,
                                         autoplayDuration = 5,
                                         scrollable = false
                                     }: {
    title: string | undefined,
    slides: (GallerySlide | null | undefined)[] | undefined,
    uploadPrefix: string | undefined,
    autoplay?: boolean,
    autoplayDuration?: number,
    scrollable?: boolean
}) {
    const resolvedSlides = (slides ?? []).filter((slide): slide is GallerySlide =>
        slide != null && slide.image != null
    )
    const autoplayEnabled = !scrollable && autoplay && resolvedSlides.length > 1
    const delay = (Number.isFinite(autoplayDuration) ? Math.max(1, autoplayDuration) : 5) * 1000
    const swiperKey = `${scrollable}-${autoplayEnabled}-${scrollable ? 0 : delay}-${resolvedSlides.map(slide => slide.image?.id ?? slide.image?.sha1 ?? '').join('|')}`
    const isEmbeddedEditor = typeof window !== 'undefined' && window.parent !== window

    if (resolvedSlides.length === 0) {
        return null
    }

    if (scrollable) {
        return <ScrollGallery title={title} slides={resolvedSlides} uploadPrefix={uploadPrefix}/>
    }

    return <section data-surface="gradient" aria-label={title} className="w-full overflow-hidden">
        <h2 className="sr-only">{title}</h2>

        {isEmbeddedEditor ? <GallerySlideView slide={resolvedSlides[0]} uploadPrefix={uploadPrefix}/> :
            <Swiper key={swiperKey} aria-live={autoplayEnabled ? 'off' : 'polite'} spaceBetween={0} slidesPerView={1}
                modules={[ A11y, Autoplay, Pagination ]} pagination={{ clickable: true }} grabCursor={true}
                autoplay={autoplayEnabled ? { delay, disableOnInteraction: false, pauseOnMouseEnter: true } : false}>
            {resolvedSlides.map((slide, index) =>
                <SwiperSlide key={slide.image?.id ?? slide.image?.sha1 ?? `slide-${index}`}>
                    <GallerySlideView slide={slide} uploadPrefix={uploadPrefix}/>
                </SwiperSlide>
            )}</Swiper>}
    </section>
}

function ScrollGallery({ title, slides, uploadPrefix }: {
    title: string | undefined,
    slides: GallerySlide[],
    uploadPrefix: string | undefined
}) {
    const sectionRef = useRef<HTMLElement | null>(null)
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const trackRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const section = sectionRef.current
        const viewport = viewportRef.current
        const track = trackRef.current
        if (!section || !viewport || !track) return
        // Puck portals render in the preview document while the component runs in the host window.
        const ownerDocument = section.ownerDocument
        const ownerWindow = ownerDocument.defaultView
        if (!ownerWindow) return
        let scrollContainer: HTMLElement | null = section.parentElement
        while (scrollContainer && scrollContainer !== ownerDocument.body && scrollContainer !== ownerDocument.documentElement) {
            if (/auto|scroll|overlay/.test(ownerWindow.getComputedStyle(scrollContainer).overflowY)) break
            scrollContainer = scrollContainer.parentElement
        }
        const scrollElement = scrollContainer && scrollContainer !== ownerDocument.body && scrollContainer !== ownerDocument.documentElement
            ? scrollContainer : null
        const scrollTarget = scrollElement ?? ownerWindow
        const pinTop = () => scrollElement ? scrollElement.getBoundingClientRect().top + scrollElement.clientTop : 0
        let frame = 0
        let travel = 0
        let buffer = 0
        const mobileQuery = ownerWindow.matchMedia('(max-width: 767px)')
        const update = () => {
            frame = 0
            const distance = Math.max(0, Math.min(travel, pinTop() - section.getBoundingClientRect().top - buffer))
            track.style.transform = mobileQuery.matches
                ? `translate3d(0, ${-distance}px, 0)`
                : `translate3d(${-distance}px, 0, 0)`
        }
        const scheduleUpdate = () => {
            if (!frame) frame = ownerWindow.requestAnimationFrame(update)
        }
        const measure = () => {
            travel = (mobileQuery.matches ? viewport.clientHeight : viewport.clientWidth) * (slides.length - 1)
            buffer = slides.length > 1 ? viewport.clientHeight * 0.25 : 0
            // The extra page height supplies the slide travel while the viewport stays pinned.
            section.style.height = `${viewport.clientHeight + travel + buffer * 2}px`
            scheduleUpdate()
        }
        const onWheel = (event: WheelEvent) => {
            if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
            const bounds = section.getBoundingClientRect()
            const top = pinTop()
            if (bounds.top > top + 1 || bounds.bottom < top + viewport.clientHeight - 1) return
            event.preventDefault()
            const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1
            // Horizontal trackpad input advances the same page position as vertical input, including exit overshoot.
            scrollTarget.scrollBy({ top: event.deltaX * scale, behavior: 'instant' })
        }
        const resizeObserver = new ResizeObserver(measure)
        resizeObserver.observe(viewport)
        mobileQuery.addEventListener('change', measure)
        scrollTarget.addEventListener('scroll', scheduleUpdate, { passive: true })
        section.addEventListener('wheel', onWheel, { passive: false })
        measure()
        return () => {
            resizeObserver.disconnect()
            mobileQuery.removeEventListener('change', measure)
            scrollTarget.removeEventListener('scroll', scheduleUpdate)
            section.removeEventListener('wheel', onWheel)
            ownerWindow.cancelAnimationFrame(frame)
        }
    }, [ slides.length ])

    return <section ref={sectionRef} data-surface="gradient" aria-label={title} className="relative w-full"
                    style={{ height: `${slides.length * 100}dvh` }}>
        <h2 className="sr-only">{title}</h2>
        <div ref={viewportRef} className="sticky top-0 h-dvh w-full overflow-hidden">
            <div ref={trackRef} className="flex h-full w-full flex-col md:flex-row will-change-transform">
                {slides.map((slide, index) =>
                    <div key={slide.image?.id ?? `slide-${index}`} className="h-full min-w-0 w-full shrink-0">
                        <GallerySlideView slide={slide} uploadPrefix={uploadPrefix} fillViewport/>
                    </div>
                )}
            </div>
        </div>
    </section>
}

function GallerySlideView({ slide, uploadPrefix, fillViewport = false }: {
    slide: GallerySlide,
    uploadPrefix: string | undefined,
    fillViewport?: boolean
}) {
    return <div
        className={fillViewport ? 'relative h-full w-full' : 'relative h-[100svh] min-h-[100vh] w-full md:h-screen md:min-h-0'}>
        <img src={`${uploadPrefix}/${slide.image?.sha1}.webp`} alt={slide.image?.altText ?? ''}
             className="h-full w-full object-cover"/>
        <FullscreenMediaText title={slide.title} titleSize={slide.titleSize} content={slide.content}
                             link={slide.link} linkText={slide.linkText}/>
    </div>
}

export function FullscreenMediaText({ title, titleSize, content, link, linkText }: {
    title: string | undefined,
    titleSize: string | undefined,
    content: string | undefined,
    link: string | undefined,
    linkText: string | undefined
}) {
    return <>
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"/>
        <div
            className="absolute inset-x-0 bottom-0 w-full px-6 pb-10 pt-6 sm:px-10 sm:pb-12 sm:pt-8 md:px-16 md:pb-16 md:pt-10">
            <h3 className={`mb-1 max-w-4xl break-words font-bold leading-tight text-white ${titleSize == null ? 'text-2xl sm:text-3xl' : (TITLE_SIZE_CLASSES[titleSize] ?? 'text-3xl')}`}>
                {title}
            </h3>
            <p className="max-w-3xl text-sm text-white/90 sm:text-base">{content}</p>
            {link && linkText &&
                <div className="mt-5"><ReadMore text={linkText} to={link} color="white"/></div>}
        </div>
    </>
}

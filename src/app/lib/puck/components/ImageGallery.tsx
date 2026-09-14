'use client'

import { Image } from '@/generated/prisma/browser'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay, Pagination } from 'swiper/modules'
import ReadMore from '@/app/lib/puck/components/ReadMore'

const TITLE_SIZE_CLASSES: Record<string, string> = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
    '5xl': 'text-5xl',
    '6xl': 'text-6xl',
    '7xl': 'text-7xl'
}

export interface GallerySlide {
    title: string | undefined
    titleSize: string | undefined
    content: string | undefined
    link: string | undefined
    linkText: string | undefined
    image: Image | null
}

export default function ImageGallery({ title, slides, uploadPrefix, autoplay = false, autoplayDuration = 5 }: {
    title: string | undefined,
    slides: (GallerySlide | null | undefined)[] | undefined,
    uploadPrefix: string | undefined,
    autoplay?: boolean,
    autoplayDuration?: number
}) {
    const resolvedSlides = (slides ?? []).filter((slide): slide is GallerySlide =>
        slide != null && slide.image != null
    )
    const autoplayEnabled = autoplay && resolvedSlides.length > 1
    const delay = (Number.isFinite(autoplayDuration) ? Math.max(1, autoplayDuration) : 5) * 1000

    if (resolvedSlides.length === 0) {
        return null
    }

    return <section data-surface="gradient" aria-label={title} className="w-full overflow-hidden">
        <h2 className="sr-only">{title}</h2>

        <Swiper key={`${autoplayEnabled}-${delay}`} aria-live={autoplayEnabled ? 'off' : 'polite'} spaceBetween={0} slidesPerView={1}
                modules={[ A11y, Autoplay, Pagination ]} pagination={{ clickable: true }} grabCursor={true}
                autoplay={autoplayEnabled ? { delay, disableOnInteraction: false, pauseOnMouseEnter: true } : false}>
            {resolvedSlides.map((slide, index) =>
                <SwiperSlide key={index}>
                    <div className="relative h-[70svh] min-h-[28rem] w-full md:h-screen">
                        <img src={`${uploadPrefix}/${slide.image?.sha1}.webp`} alt={slide.image?.altText ?? ''}
                             className="h-full w-full object-cover"/>
                        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"/>
                        <div
                            className="absolute inset-x-0 bottom-0 w-full px-6 pb-10 pt-6 sm:px-10 sm:pb-12 sm:pt-8 md:px-16 md:pb-16 md:pt-10">
                            <h3 className={`mb-1 max-w-4xl font-bold text-white ${
                                slide.titleSize == null
                                    ? 'text-2xl sm:text-3xl'
                                    : (TITLE_SIZE_CLASSES[slide.titleSize] ?? 'text-3xl')
                            }`}>
                                {slide.title}
                            </h3>
                            <p className="max-w-3xl text-sm text-white/90 sm:text-base">
                                {slide.content}
                            </p>
                            {slide.link && slide.linkText && <div className="mt-5">
                                <ReadMore text={slide.linkText} to={slide.link} color="white"/>
                            </div>}
                        </div>
                    </div>
                </SwiperSlide>
            )}
        </Swiper>
    </section>
}

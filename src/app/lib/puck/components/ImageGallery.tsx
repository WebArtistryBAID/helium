'use client'

import { Image } from '@/generated/prisma/browser'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Pagination } from 'swiper/modules'

export interface GallerySlide {
    title: string | undefined
    content: string | undefined
    image: Image | null
}

export default function ImageGallery({ title, slides, uploadPrefix }: {
    title: string | undefined,
    slides: (GallerySlide | null | undefined)[] | undefined,
    uploadPrefix: string | undefined
}) {
    const resolvedSlides = (slides ?? []).filter((slide): slide is GallerySlide =>
        slide != null && slide.image != null
    )

    if (resolvedSlides.length === 0) {
        return null
    }

    return <section aria-label={title} className="w-screen overflow-hidden">
        <h2 className="sr-only">{title}</h2>

        <Swiper aria-live="polite" spaceBetween={0} slidesPerView={1}
                modules={[ A11y, Pagination ]} pagination={{ clickable: true }} grabCursor={true}>
            {resolvedSlides.map((slide, index) =>
                <SwiperSlide key={index}>
                    <div className="relative h-[70vh] min-h-120 w-full md:h-screen">
                        <img src={`${uploadPrefix}/${slide.image?.sha1}.webp`} alt={slide.image?.altText}
                             className="h-full w-full object-cover"/>
                        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"/>
                        <div
                            className="absolute inset-x-0 bottom-0 w-full px-6 pb-10 pt-6 sm:px-10 sm:pb-12 sm:pt-8 md:px-16 md:pb-16 md:pt-10">
                            <h3 className="mb-1 max-w-4xl text-2xl sm:text-3xl font-bold text-white">
                                {slide.title}
                            </h3>
                            <p className="max-w-3xl text-sm text-white/90 sm:text-base">
                                {slide.content}
                            </p>
                        </div>
                    </div>
                </SwiperSlide>
            )}
        </Swiper>
    </section>
}

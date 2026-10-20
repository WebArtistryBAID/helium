'use client'

import FocusImage from '@/app/lib/FocusImage'
import { Image } from '@/generated/prisma/browser'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay, Pagination } from 'swiper/modules'

export interface Alum {
    name: string | undefined
    quote: string | undefined
    image: Image | undefined
}

export default function Alumni({ title, alumni, uploadPrefix, autoplay = false, autoplayDuration = 5 }: {
    title: string | undefined;
    alumni: (Alum | undefined)[] | undefined,
    uploadPrefix: string | undefined,
    autoplay?: boolean,
    autoplayDuration?: number
}) {
    alumni = alumni?.filter((alum): alum is Alum => alum != null) ?? []
    const autoplayEnabled = autoplay && alumni.length > 1
    const delay = (Number.isFinite(autoplayDuration) ? Math.max(1, autoplayDuration) : 5) * 1000
    return <section aria-label={title} className="section container !my-16 md:!my-24">
        <h2 className="mb-8 break-words text-center text-2xl uppercase tracking-widest sm:text-3xl"
            role="heading">{title}</h2>

        <Swiper key={`${autoplayEnabled}-${delay}`} aria-live={autoplayEnabled ? 'off' : 'polite'}
                className="alumni-carousel" spaceBetween={24}
                pagination={alumni.length > 1 ? { clickable: true } : false}
                slidesPerView={1}
                modules={[ A11y, Autoplay, Pagination ]}
                autoplay={autoplayEnabled ? { delay, disableOnInteraction: false, pauseOnMouseEnter: true } : false}>
            {alumni.map((alum, index) =>
                <SwiperSlide key={index} className="!h-auto overflow-hidden bg-gray-50">
                    <div aria-roledescription="carousel"
                         className="flex h-full min-w-0 flex-col md:flex-row md:gap-8" role="region">
                        <div className="w-full min-w-0 shrink-0 md:w-1/3 md:self-stretch">
                            <div className="mx-auto h-72 w-full max-w-sm sm:h-80 md:h-full md:min-h-96 md:max-w-none">
                                <FocusImage image={alum?.image} src={`${uploadPrefix}/${alum?.image?.sha1}.webp`}
                                            alt={alum?.image?.altText ?? ''}
                                            className="block h-full w-full object-cover"/>
                            </div>
                        </div>
                        <div className="w-full min-w-0 md:flex-1 md:self-center">
                            <div className="p-6 sm:p-8 lg:p-12">
                                <div className="flex flex-col justify-center">
                                    <p className="mb-3 break-words text-base leading-relaxed sm:text-lg lg:text-2xl">{alum?.quote}</p>
                                    <p className="text-right">— {alum?.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </SwiperSlide>
            )}
        </Swiper>
    </section>
}

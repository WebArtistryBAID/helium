'use client'

import { Image } from '@/generated/prisma/browser'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Pagination } from 'swiper/modules'

export interface Alum {
    name: string | undefined
    quote: string | undefined
    image: Image | undefined
}

export default function Alumni({ title, alumni, uploadPrefix }: {
    title: string | undefined;
    alumni: (Alum | undefined)[] | undefined,
    uploadPrefix: string | undefined
}) {
    alumni = alumni?.filter((alum): alum is Alum => alum !== undefined) ?? []
    return <section aria-label={title} className="section container !my-24">
        <h2 className="uppercase text-center tracking-widest mb-8 text-3xl" role="heading">{title}</h2>

        <Swiper aria-live="polite" spaceBetween={10} slidesPerView={1}
                modules={[ A11y, Pagination ]}>
            {alumni.map((alum, index) =>
                <SwiperSlide key={index}>
                    <div aria-roledescription="carousel"
                         className="flex flex-col md:flex-row items-center gap-8 md:mb-5" role="region">
                        <div className="flex w-full items-center px-6 md:w-1/3 md:pl-8 md:pr-0">
                            <div className="alumni-big-pic-box h-72 md:h-auto">
                                <img src={`${uploadPrefix}/${alum?.image?.sha1}.webp`} alt={alum?.image?.altText ?? ''}
                                     className="w-full h-full object-cover aspect-3/4 transition-all duration-300 block alumni-big-pic"/>
                            </div>
                        </div>
                        <div className="w-full md:w-2/3">
                            <div className="p-5 sm:p-8 md:p-20">
                                <div className="transition-all duration-300 md:h-80 justify-center flex flex-col">
                                    <p className="mb-3 text-2xl sm:text-3xl" style={{ lineHeight: '1.5' }}>{alum?.quote}</p>
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

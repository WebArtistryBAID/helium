'use client'

import { Image } from '@/generated/prisma/browser'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay, Pagination } from 'swiper/modules'

export interface Accreditation {
    image: Image | undefined
    name: string | undefined
}

export default function Accreditations({ title, text, accreditations, uploadPrefix }: {
    title: string | undefined,
    text: string | undefined,
    accreditations: (Accreditation | undefined)[] | undefined,
    uploadPrefix: string
}) {
    accreditations = accreditations?.filter((accreditation): accreditation is Accreditation => accreditation !== undefined) ?? []

    return <div className="bg-red-900">
        <section
            aria-labelledby="accreditation-heading"
            className="section container !my-16 flex flex-col items-center gap-8 !py-12 text-white md:!my-24 md:flex-row md:gap-12 md:!py-16 lg:gap-16">
            <div
                aria-label="Accreditations carousel"
                aria-roledescription="carousel"
                className="w-full md:w-1/2"
                role="region">
                <Swiper aria-live="off" spaceBetween={10} slidesPerView={1}
                        modules={[ A11y, Autoplay, Pagination ]}
                        autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}>
                    {accreditations?.map((acc, index) =>
                        <SwiperSlide key={index}>
                            <div
                                className="mx-2 my-6 flex h-48 flex-col items-center justify-center rounded-lg bg-white sm:mx-4 sm:h-56 md:mx-8 md:my-12 md:h-72">
                                <img src={`${uploadPrefix}/${acc?.image?.sha1}.webp`} alt={acc?.image?.altText ?? ''}
                                     className="h-16 md:h-24 mb-3 md:mb-5"/>
                                <p className="!font-sans text-black text-sm md:text-base">
                                    {acc?.name}
                                </p>
                            </div>
                        </SwiperSlide>)}
                </Swiper>
            </div>
            <div className="w-full md:w-1/2">
                <h2 id="accreditation-heading" className="text-3xl md:text-4xl font-bold mb-2 md:mb-3">
                    {title}
                </h2>
                <p className="opacity-80 text-sm md:text-base">{text}</p>
            </div>
        </section>
    </div>
}

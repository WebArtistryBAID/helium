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
            className="section container !py-12 md:!py-16 gap-8 md:gap-16 text-white flex flex-col md:flex-row items-center !my-24">
            <div
                aria-label="Accreditations carousel"
                aria-roledescription="carousel"
                className="w-full md:w-1/2"
                role="region">
                <Swiper aria-live="polite" spaceBetween={10} autoplay={true} slidesPerView={1}
                        modules={[ A11y, Autoplay, Pagination ]}>
                    {accreditations?.map((acc, index) =>
                        <SwiperSlide key={index}>
                            <div
                                className="rounded-lg mx-4 md:mx-8 h-56 md:h-72 my-8 md:my-12 bg-white flex flex-col justify-center items-center">
                                <img src={`${uploadPrefix}/${acc?.image?.sha1}.webp`} alt={acc?.image?.altText}
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

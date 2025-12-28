'use client'

import { motion } from 'motion/react'
import { Image } from '@/generated/prisma/browser'

export default function Hero({ title, lightText, image, backgroundColor, uploadPrefix, topPadding }: {
    title: string | undefined,
    lightText: boolean | undefined,
    image: Image | undefined,
    backgroundColor: string | undefined,
    uploadPrefix: string | undefined,
    topPadding: boolean | undefined
}) {
    lightText = lightText ?? false
    return <>
        <section aria-labelledby="hero-heading" className="px-6 sm:px-10 md:px-16 lg:px-24"
                 style={{ backgroundColor, paddingTop: topPadding ? '12rem' : '' }}
                 data-surface={lightText ? 'dark' : 'light'}>
            <motion.h1
                id="hero-heading"
                initial={{ opacity: 0, transform: 'translateY(16px)' }}
                animate={{ opacity: 1, transform: 'translateY(0)' }}
                transition={{ duration: 0.5 }}
                className="text-[3rem] md:text-[4rem] lg:text-[6rem] font-bold !font-sans text-center"
                style={{ color: lightText ? 'white' : 'black' }}>
                {title}
            </motion.h1>
        </section>

        <img src={`${uploadPrefix}/${image?.sha1}.webp`} alt={image?.altText} aria-hidden className="w-full"/>
    </>
}

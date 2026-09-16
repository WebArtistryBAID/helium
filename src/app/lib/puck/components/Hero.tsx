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
        <section aria-labelledby="hero-heading"
                 className={`px-5 sm:px-8 md:px-12 lg:px-20 ${topPadding ? 'pt-24 sm:pt-32 lg:pt-48' : ''}`}
                 style={{ backgroundColor }}
                 data-surface={lightText ? 'dark' : 'light'}>
            <motion.h1
                id="hero-heading"
                initial={{ opacity: 0, transform: 'translateY(16px)' }}
                animate={{ opacity: 1, transform: 'translateY(0)' }}
                transition={{ duration: 0.5 }}
                className="break-words text-center text-4xl font-bold leading-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
                style={{ color: lightText ? 'white' : 'black' }}>
                {title}
            </motion.h1>
        </section>

        <img src={`${uploadPrefix}/${image?.sha1}.webp`} alt="" aria-hidden="true" className="w-full"/>
    </>
}

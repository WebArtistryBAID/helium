'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Image } from '@/generated/prisma/browser'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import ReadMore from '@/app/lib/puck/components/ReadMore'

export interface CommencementChapter {
    eyebrow?: string
    title?: string
    description?: string
}

export interface CommencementCollageImage {
    image?: Image | null
}

const COLLAGE_POSITIONS = [
    { column: '1 / span 2', row: '1 / span 3' },
    { column: '4 / span 3', row: '1 / span 2' },
    { column: '11 / span 2', row: '1 / span 4' },
    { column: '1 / span 3', row: '5 / span 3' },
    { column: '10 / span 2', row: '5 / span 3' },
    { column: '12 / span 1', row: '7 / span 2' },
    { column: '2 / span 3', row: '10 / span 3' },
    { column: '5 / span 2', row: '9 / span 2' },
    { column: '8 / span 2', row: '10 / span 3' },
    { column: '10 / span 3', row: '9 / span 4' },
    { column: '1 / span 1', row: '10 / span 2' }
]

const COLLAGE_IMAGE_VARIANTS = {
    hidden: { opacity: 0, y: 28 },
    visible: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.65,
            delay: 0.15 + index * 0.11
        }
    })
}

function isLightColor(color: string) {
    const hex = color.trim().replace('#', '')
    const fullHex = hex.length === 3 ? hex.split('').map((value) => value + value).join('') : hex
    if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) return false

    const [ red, green, blue ] = [ 0, 2, 4 ].map((index) => parseInt(fullHex.slice(index, index + 2), 16))
    return (red * 299 + green * 587 + blue * 114) / 1000 > 160
}

export default function InFocusCommencement({
                                                heroBg,
                                                heroTitle,
                                                heroDescription,
                                                collageBackgroundColor,
                                                collageEyebrow,
                                                collageTitle,
                                                collageDescription,
                                                collageLink,
                                                collageLinkText,
                                                collageImages,
                                                chapters,
                                                uploadPrefix
                                            }: {
    heroBg: Image | null | undefined,
    heroTitle: string | null | undefined,
    heroDescription: string | null | undefined,
    collageBackgroundColor: string | null | undefined,
    collageEyebrow: string | null | undefined,
    collageTitle: string | null | undefined,
    collageDescription: string | null | undefined,
    collageLink: string | null | undefined,
    collageLinkText: string | null | undefined,
    collageImages: (CommencementCollageImage | null | undefined)[] | null | undefined,
    chapters: (CommencementChapter | null | undefined)[] | null | undefined,
    uploadPrefix: string | null | undefined
}) {
    const [ scrollY, setScrollY ] = useState(0)
    const language = useLanguage()
    const visibleChapters = (chapters ?? []).filter((chapter): chapter is CommencementChapter => chapter != null)
    const visibleCollageImages = (collageImages ?? []).filter((item): item is CommencementCollageImage & {
        image: Image
    } => item?.image != null)
    const heroImage = heroBg?.sha1 && uploadPrefix ? `url(${uploadPrefix}/${heroBg.sha1}.webp)` : undefined
    const collageBackground = collageBackgroundColor || '#861126'
    const collageHasLightBackground = isLightColor(collageBackground)
    const collageTextColor = collageHasLightBackground ? '#122a28' : '#ffffff'
    const collageMutedTextColor = collageHasLightBackground ? 'rgba(18, 42, 40, 0.75)' : 'rgba(255, 255, 255, 0.8)'

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY || window.pageYOffset || 0)
        onScroll()
        window.addEventListener('scroll', onScroll, true)
        return () => window.removeEventListener('scroll', onScroll, true)
    }, [])

    return <>
        <section
            data-surface="dark"
            aria-labelledby="commencement-hero-heading"
            className="relative flex min-h-[46rem] h-[105vh] items-end overflow-hidden bg-[#122a28] text-white"
            style={{
                backgroundImage: heroImage,
                backgroundPosition: `center ${scrollY * 0.35}px`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover'
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-[#122a28]/20 via-[#122a28]/35 to-[#0b1716]/95"/>
            <div className="absolute inset-x-0 top-0 h-px bg-white/35"/>
            <div className="container relative w-full px-5 pb-14 sm:px-8 md:pb-20 lg:px-12">
                <div className="max-w-4xl border-l border-white/60 pl-5 sm:pl-8">
                    <motion.p
                        initial={{ opacity: 0, transform: 'translateY(16px)' }}
                        animate={{ opacity: 1, transform: 'translateY(0)' }}
                        transition={{ duration: 0.7 }}
                        className="!mb-5 text-xl tracking-[0.26em] text-white/80"
                    >
                        IN FOCUS
                    </motion.p>
                    <motion.h1
                        id="commencement-hero-heading"
                        initial={{ opacity: 0, transform: 'translateY(20px)' }}
                        animate={{ opacity: 1, transform: 'translateY(0)' }}
                        transition={{ duration: 0.8, delay: 0.08 }}
                        className={`!mb-6 font-serif leading-[1.05] ${language === 'en' ? 'font-bold sm:text-6xl md:text-8xl' : 'text-2xl font-semibold sm:text-3xl md:text-4xl'}`}
                    >
                        {heroTitle}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, transform: 'translateY(20px)' }}
                        animate={{ opacity: 1, transform: 'translateY(0)' }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="max-w-2xl text-lg leading-8 text-white/85 md:text-xl"
                    >
                        {heroDescription}
                    </motion.p>
                </div>
            </div>
        </section>

        <section data-surface={collageHasLightBackground ? 'light' : 'dark'}
                 className="relative isolate min-h-[56rem] overflow-hidden px-5 py-28 sm:px-8 lg:px-12"
                 style={{ backgroundColor: collageBackground }} aria-labelledby="commencement-collage-heading">
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at center, ${collageHasLightBackground ? 'rgba(18, 42, 40, 0.08)' : 'rgba(255, 255, 255, 0.08)'}, transparent 44%)`
                }}/>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                        className="absolute inset-0 z-0 grid grid-cols-12 grid-rows-12 gap-x-5 gap-y-6 p-6 pointer-events-none sm:gap-x-8 sm:gap-y-10 sm:p-10">
                {visibleCollageImages.map((item, index) => {
                    const position = COLLAGE_POSITIONS[index % COLLAGE_POSITIONS.length]
                    return <motion.div
                        key={`${item.image.sha1}-${index}`}
                        custom={index}
                        variants={COLLAGE_IMAGE_VARIANTS}
                        className="relative overflow-hidden shadow-2xl"
                        style={{
                            gridColumn: position.column,
                            gridRow: position.row
                        }}
                    >
                        <img
                            src={`${uploadPrefix}/${item.image.sha1}.webp`}
                            alt={item.image.altText ?? ''}
                            className="h-full w-full object-cover"
                        />
                    </motion.div>
                })}
            </motion.div>
            <div className="container relative z-10 flex min-h-[34rem] items-center justify-center text-center">
                <div className="max-w-2xl">
                    <p className="!mb-5 text-xs font-semibold tracking-[0.24em]" style={{ color: collageMutedTextColor }}>{collageEyebrow}</p>
                    <h2 id="commencement-collage-heading"
                        className={`!mb-6 font-serif leading-tight ${language === 'en' ? 'text-5xl font-bold sm:text-6xl md:text-7xl' : 'text-2xl font-semibold sm:text-3xl md:text-4xl'}`}
                        style={{ color: collageTextColor }}>{collageTitle}</h2>
                    <p className="mx-auto !mb-8 max-w-xl text-lg leading-8 md:text-xl" style={{ color: collageMutedTextColor }}>{collageDescription}</p>
                    {collageLink && collageLinkText && <div className="flex justify-center">
                        <ReadMore color={collageTextColor} iconColor={collageHasLightBackground ? '#8b1d2c' : '#f2d28c'} text={collageLinkText} to={collageLink}/>
                    </div>}
                </div>
            </div>
        </section>

        <section className="bg-[#f2f0ea] py-6 sm:py-10" aria-label="毕业故事">
            <div className="container px-5 sm:px-8 lg:px-12">
                {visibleChapters.map((chapter, index) => {
                    const reversed = index % 2 === 1
                    return <motion.article
                        key={`${chapter.title ?? 'chapter'}-${index}`}
                        initial={{ opacity: 0, transform: 'translateY(24px)' }}
                        whileInView={{ opacity: 1, transform: 'translateY(0)' }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.65 }}
                        className="grid grid-cols-1 gap-7 border-b border-[#122a28]/20 py-16 md:grid-cols-12 md:gap-8 md:py-24"
                    >
                        <div className={`md:col-span-3 ${reversed ? 'md:col-start-10' : ''}`}>
                            <p className="!mb-3 font-serif text-5xl text-[#8b1d2c]/80 md:text-6xl">0{index + 1}</p>
                            <p className="text-xs font-semibold tracking-[0.2em] text-[#122a28]/65">{chapter.eyebrow}</p>
                        </div>
                        <div
                            className={`md:col-span-7 ${reversed ? 'md:col-start-2 md:row-start-1' : 'md:col-start-5'}`}>
                            <h2 className={`!mb-6 max-w-2xl font-serif leading-tight ${language === 'en' ? 'text-4xl font-bold md:text-5xl' : 'text-2xl font-semibold md:text-3xl'}`}>{chapter.title}</h2>
                            <p className="max-w-xl text-lg leading-8 text-black/65 md:text-xl md:leading-9">{chapter.description}</p>
                        </div>
                    </motion.article>
                })}
            </div>
        </section>
    </>
}

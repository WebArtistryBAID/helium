'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Image } from '@/generated/prisma/browser'
import Card from '@/app/lib/puck/components/Card'
import { prefixLink, SimplifiedContentEntity } from '@/app/lib/data-types'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

export default function InFocusNewStudents({
                                               heroBg,
                                               title,
                                               description,
                                               introTitle,
                                               introDescription,
                                               introCards,
                                               resourcesTitle,
                                               resourcesDescription,
                                               resourcesImage,
                                               resources,
                                               projectsTitle,
                                               projectsDescription,
                                               projects,
                                               uploadPrefix
                                           }: {
    heroBg: Image | undefined,
    title: string | undefined,
    description: string | undefined,
    introTitle: string | undefined,
    introDescription: string | undefined,
    introCards: ({
        href: string | undefined,
        image: Image | undefined,
        title: string | undefined,
        shortContent: string | undefined
    } | undefined)[] | undefined,
    resourcesTitle: string | undefined,
    resourcesDescription: string | undefined,
    resourcesImage: Image | undefined,
    resources: ({
        name: string | undefined,
        content: string | undefined
    } | undefined)[] | undefined,
    projectsTitle: string | undefined,
    projectsDescription: string | undefined,
    projects: ({
        project: SimplifiedContentEntity | undefined,
        discipline: string | undefined
    } | undefined)[] | undefined,
    uploadPrefix: string | undefined
}) {
    const [ scrollY, setScrollY ] = useState(0)
    const language = useLanguage()

    useEffect(() => {
        const onScroll = () => {
            setScrollY(window.scrollY || window.pageYOffset || 0)
        }
        onScroll()
        window.addEventListener('scroll', onScroll, true)
        return () => window.removeEventListener('scroll', onScroll, true)
    }, [])

    return <>
        <section data-surface="light" style={{
            backgroundImage: `url(${uploadPrefix}/${heroBg?.sha1}.webp)`,
            backgroundPosition: `center ${scrollY * 0.5}px`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            height: '105vh'
        }}
                 className="w-screen flex flex-col bg-cover bg-center justify-center relative"
                 aria-labelledby="hero-heading"
                 role="banner">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
                        className="absolute inset-0 pointer-events-none from-white/60 to-white bg-gradient-to-b"/>
            <div className="text-black w-full h-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
                <div className="w-full md:max-w-2xl flex flex-col justify-center items-center">
                    <motion.div initial={{ opacity: 0, transform: 'translateY(20px)' }}
                                animate={{ opacity: 1, transform: 'translateY(0)' }}
                                transition={{ duration: 0.8 }}>
                        <p className="text-lg uppercase text-center tracking-wider text-gray-700 !mb-3">IN FOCUS</p>
                        <h1 id="hero-heading"
                            className="mb-8 text-center font-bold font-serif text-5xl md:text-7xl">
                            {title}
                        </h1>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, transform: 'translateY(20px)' }}
                                animate={{ opacity: 1, transform: 'translateY(0)' }}
                                transition={{ duration: 0.8, delay: 0.2 }}>
                        <p className="text-lg md:text-xl text-center opacity-80 !mb-8">
                            {description}
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>

        <section className="container">
            <hr className="w-full border-gray-300 border"/>
            <div className="flex flex-col md:flex-row gap-8 py-8 mb-8">
                <div className="w-full md:w-1/3">
                    <h2 className="text-2xl font-bold">{introTitle}</h2>
                </div>
                <div className="w-full md:w-2/3">
                    <p className="text-xl opacity-60">{introDescription}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
                {introCards?.map((card, index) => {
                    if (!card) return null
                    return (
                        <motion.div initial={{ opacity: 0, transform: 'translateY(20px)' }}
                                    whileInView={{ opacity: 1, transform: 'translateY(0)' }}
                                    transition={{ duration: 0.8, delay: 0.3 * index }}
                                    key={`introCard-${index}`}
                                    viewport={{ once: true }} className="w-full h-full">
                            <Card href={prefixLink(language, card.href)} image={card.image} title={card.title}
                                  shortContent={card.shortContent}
                                  uploadPrefix={uploadPrefix}/>
                        </motion.div>
                    )
                })}
            </div>

            <div className="flex flex-col md:flex-row gap-16 items-center mb-24">
                <motion.div initial={{ opacity: 0, transform: 'translateY(20px)' }}
                            whileInView={{ opacity: 1, transform: 'translateY(0)' }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2">
                    <h2 className="text-5xl font-bold mb-5">{resourcesTitle}</h2>
                    <p className="text-xl mb-8">
                        {resourcesDescription}
                    </p>

                    <img src={`${uploadPrefix}/${resourcesImage?.sha1}.webp`} alt={resourcesImage?.altText}
                         className="w-full"/>
                </motion.div>

                <motion.div initial={{ opacity: 0, transform: 'translateY(20px)' }}
                            whileInView={{ opacity: 1, transform: 'translateY(0)' }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2 grid grid-cols-2 grid-rows-2 gap-6 text-center md:text-left">
                    {resources?.map((r, index) => <div key={index}>
                        <p className="text-6xl text-red-900">{r?.content}</p>
                        <p className="text-lg">{r?.name}</p>
                    </div>)}
                </motion.div>
            </div>
        </section>

        <section className="container">
            <h2 className="text-5xl font-bold mb-5 text-center">{projectsTitle}</h2>
            <p className="text-xl mb-8 text-center">{projectsDescription}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-24 w-full">
                {projects?.map((p, index) => {
                    if (!p) return null
                    const pid = p.project?.id != null ? String(p.project.id) : `idx-${index}`
                    return (
                        <React.Fragment key={pid}>
                            <div className="border-t border-gray-300 p-8">
                                <p className="text-xl font-bold">{language === 'en' ? p.project?.titlePublishedEN : p.project?.titlePublishedZH}</p>
                            </div>
                            <div className="border-t border-gray-300 p-8">
                                <p>{p.discipline}</p>
                            </div>
                            <div className="border-t border-gray-300 p-8">
                                <p>{language === 'en' ? p.project?.shortContentPublishedEN : p.project?.shortContentPublishedZH}</p>
                            </div>
                            <div className="border-t border-gray-300 p-8 flex justify-end">
                                <img src={`${uploadPrefix}/${p.project?.coverImagePublished?.sha1}.webp`}
                                     alt={p.project?.coverImagePublished?.altText}
                                     className="w-24 h-24 object-cover"/>
                            </div>
                        </React.Fragment>
                    )
                })}
            </div>

            <hr className="border border-gray-300 w-full mb-24"/>
        </section>
    </>
}

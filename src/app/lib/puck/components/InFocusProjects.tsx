'use client'

import { useEffect, useMemo, useState } from 'react'
import { Image } from '@/generated/prisma/browser'
import ReadMore from '@/app/lib/puck/components/ReadMore'
import If from '@/app/lib/If'
import { motion } from 'motion/react'
import { InFocusProject } from '@/app/lib/puck/components/InFocusConfigs'
import { getContentEntityURI, prefixLink } from '@/app/lib/data-types'
import Link from 'next/link'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

export default function InFocusProjects({
                                            heroBg,
                                            title,
                                            description,
                                            link,
                                            linkText,
                                            resolvedProjects,
                                            startTopText,
                                            startMainText,
                                            uploadPrefix
                                        }: {
    heroBg: Image | null,
    title: string | null,
    description: string | null,
    link: string | null,
    linkText: string | null,
    resolvedProjects: (InFocusProject | null | undefined)[] | null,
    startTopText: string | null,
    startMainText: string | null,
    uploadPrefix: string | null
}) {
    const language = useLanguage()
    // Pre-processing, remove all nulls from resolvedProjects
    const projects = useMemo(() =>
        (resolvedProjects ?? []).filter(p => p != null) as InFocusProject[], [ resolvedProjects ])

    const [ scrollY, setScrollY ] = useState(0)

    useEffect(() => {
        const onScroll = () => {
            setScrollY(window.scrollY || window.pageYOffset || 0)
        }
        onScroll()
        window.addEventListener('scroll', onScroll, true)
        return () => window.removeEventListener('scroll', onScroll, true)
    }, [])

    return <>
        <section data-surface="dark" style={{
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
                        className="absolute inset-0 pointer-events-none from-transparent to-gray-950 bg-gradient-to-b"/>
            <div
                className="absolute bottom-0 text-white w-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
                <div className="w-full md:max-w-2xl flex flex-col justify-center items-center">
                    <motion.div initial={{ opacity: 0, transform: 'translateY(20px)' }}
                                animate={{ opacity: 1, transform: 'translateY(0)' }}
                                transition={{ duration: 0.8 }}>
                        <p className="text-lg uppercase text-center tracking-wider text-gray-300 !mb-3">In Focus</p>
                        <h1 id="hero-heading"
                            className="mb-3 text-white text-center font-bold font-serif text-5xl md:text-6xl">
                            {title}
                        </h1>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, transform: 'translateY(20px)' }}
                                animate={{ opacity: 1, transform: 'translateY(0)' }}
                                transition={{ duration: 0.8, delay: 0.2 }}>
                        <p className="text-lg md:text-xl text-center !mb-8">
                            {description}
                        </p>
                        <div className="mb-8">
                            <If condition={linkText != null && link != null}>
                                <div className="flex justify-center items-center">
                                    <ReadMore color="white" iconColor="#fb2c36" text={linkText ?? ''} to={link ?? ''}/>
                                </div>
                            </If>
                        </div>
                    </motion.div>

                    <div className="border-l border-white h-32" style={{ width: '1px' }}/>
                </div>
            </div>
        </section>

        <section className="w-full bg-gray-950 text-white slide-up-fade-enter-active">
            <div className="container px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 mb-8 relative gap-8">
                    <div
                        className="absolute top-0 bottom-0 pointer-events-none from-white to-transparent bg-gradient-to-b left-1/2 hidden md:block"
                        style={{ width: '1px', height: '65%' }}
                    />
                    {projects.length > 0 &&
                        <>
                            <div
                                className="hidden md:block px-8 py-16 animate-on-scroll slide-up-fade-enter-active slide-up-fade-enter-from">
                                <img src={`${uploadPrefix}/${projects[0].project?.coverImagePublished?.sha1}.webp`}
                                     alt={projects[0].project?.coverImagePublished?.altText}
                                     className="rounded-3xl w-full h-80 object-cover"/>
                            </div>
                            <div
                                className="p-8 flex flex-col justify-center animate-on-scroll slide-up-fade-enter-active slide-up-fade-enter-from"
                            >
                                <p className="uppercase tracking-wide !mb-3 text-sm">
                                    {projects[0].discipline}
                                </p>
                                <h2 className="text-2xl mb-4">
                                    {(projects[0].description ?? '').split(/<1>|<\/1>/).map((part, i) =>
                                        i % 2 === 1 ?
                                            <span key={i} className="text-amber-300 font-bold">{part}</span> :
                                            <span key={i}>{part}</span>
                                    )}
                                </h2>
                                <ReadMore
                                    color="white"
                                    iconColor="#ffd230"
                                    text={projects[0].linkText ?? ''}
                                    to={getContentEntityURI(projects[0].project?.createdAt, projects[0].project?.slug)}
                                />
                            </div>
                        </>}

                    {projects.length > 1 && <>
                        <div
                            className="p-8  flex flex-col justify-center animate-on-scroll slide-up-fade-enter-active slide-up-fade-enter-from"
                        >
                            <p className="uppercase tracking-wide !mb-3 text-sm">
                                {projects[1].discipline}
                            </p>
                            <h2 className="text-2xl mb-4">
                                {(projects[1].description ?? '').split(/<1>|<\/1>/).map((part, i) =>
                                    i % 2 === 1 ?
                                        <span key={i} className="text-orange-400 font-bold">{part}</span> :
                                        <span key={i}>{part}</span>
                                )}
                            </h2>
                            <ReadMore
                                color="white"
                                iconColor="#ff8904"
                                text={projects[1].linkText ?? ''}
                                to={getContentEntityURI(projects[1].project?.createdAt, projects[1].project?.slug)}
                            />
                        </div>
                        <div
                            className="hidden md:block px-8 py-16 animate-on-scroll slide-up-fade-enter-active slide-up-fade-enter-from">
                            <img src={`${uploadPrefix}/${projects[1].project?.coverImagePublished?.sha1}.webp`}
                                 alt={projects[1].project?.coverImagePublished?.altText}
                                 className="rounded-3xl w-full h-80 object-cover"/>
                        </div>
                    </>}

                    {projects.length > 2 && <>
                        <div
                            className="hidden md:block px-8 py-16 animate-on-scroll slide-up-fade-enter-active slide-up-fade-enter-from">
                            <img src={`${uploadPrefix}/${projects[2].project?.coverImagePublished?.sha1}.webp`}
                                 alt={projects[2].project?.coverImagePublished?.altText}
                                 className="rounded-3xl w-full h-80 object-cover"/>
                        </div>
                        <div
                            className="p-8  flex flex-col justify-center animate-on-scroll slide-up-fade-enter-active slide-up-fade-enter-from"
                        >
                            <p className="uppercase tracking-wide !mb-3 text-sm">
                                {projects[2].discipline}
                            </p>
                            <h2 className="text-2xl mb-4">
                                {(projects[2].description ?? '').split(/<1>|<\/1>/).map((part, i) =>
                                    i % 2 === 1 ?
                                        <span key={i} className="text-red-400 font-bold">{part}</span> :
                                        <span key={i}>{part}</span>
                                )}
                            </h2>
                            <ReadMore
                                color="white"
                                iconColor="#ff6467"
                                text={projects[2].linkText ?? ''}
                                to={getContentEntityURI(projects[2].project?.createdAt, projects[2].project?.slug)}
                            />
                        </div>
                    </>}

                    <div className="col-span-1 md:col-span-2 p-8 text-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {projects.length > 3 && <>
                                <Link className="group block"
                                      href={prefixLink(language, getContentEntityURI(projects[3].project?.createdAt, projects[3].project?.slug))}>
                                    <p className="font-bold text-2xl !mb-3">
                                        {projects[3].discipline}
                                    </p>
                                    <div className="rounded-3xl overflow-hidden mb-5 w-full h-60">
                                        <img
                                            src={`${uploadPrefix}/${projects[3].project?.coverImagePublished?.sha1}.webp`}
                                            alt={projects[3].project?.coverImagePublished?.altText}
                                            className="rounded-3xl group-hover-scale w-full h-full object-cover"
                                        />
                                    </div>
                                    <p>
                                        {projects[3].description}
                                    </p>
                                </Link>
                            </>}

                            {projects.length > 4 && <>
                                <Link className="group block"
                                      href={prefixLink(language, getContentEntityURI(projects[4].project?.createdAt, projects[4].project?.slug))}>
                                    <p className="font-bold text-2xl !mb-3">
                                        {projects[4].discipline}
                                    </p>
                                    <div className="rounded-3xl overflow-hidden mb-5 w-full h-60">
                                        <img
                                            src={`${uploadPrefix}/${projects[4].project?.coverImagePublished?.sha1}.webp`}
                                            alt={projects[4].project?.coverImagePublished?.altText}
                                            className="rounded-3xl group-hover-scale w-full h-full object-cover"
                                        />
                                    </div>
                                    <p>
                                        {projects[4].description}
                                    </p>
                                </Link>
                            </>}

                            {projects.length > 5 && <>
                                <Link className="group block"
                                      href={prefixLink(language, getContentEntityURI(projects[5].project?.createdAt, projects[5].project?.slug))}>
                                    <p className="font-bold text-2xl !mb-3">
                                        {projects[5].discipline}
                                    </p>
                                    <div className="rounded-3xl overflow-hidden mb-5 w-full h-60">
                                        <img
                                            src={`${uploadPrefix}/${projects[5].project?.coverImagePublished?.sha1}.webp`}
                                            alt={projects[5].project?.coverImagePublished?.altText}
                                            className="rounded-3xl group-hover-scale w-full h-full object-cover"
                                        />
                                    </div>
                                    <p>
                                        {projects[5].description}
                                    </p>
                                </Link>
                            </>}
                        </div>
                    </div>

                    <div
                        className="col-span-1 md:col-span-2 flex flex-col items-center justify-center text-center px-8 py-32 sm:px-16 md:px-32">
                        <p className="text-lg uppercase tracking-wider text-gray-400 !mb-3">
                            {startTopText}
                        </p>
                        <h2 className="text-4xl">{startMainText}</h2>
                    </div>
                </div>
            </div>
        </section>
    </>
}

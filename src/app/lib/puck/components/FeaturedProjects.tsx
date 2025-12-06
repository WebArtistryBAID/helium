'use client'

import { Image } from '@/generated/prisma/browser'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay, Pagination } from 'swiper/modules'
import ReadMore from '@/app/lib/puck/components/ReadMore'

export interface FeaturedProject {
    name: string | undefined
    quote: string | undefined
    link: string | undefined
    linkText: string | undefined
    image: Image | undefined
}

export default function FeaturedProjects({ title, projects, uploadPrefix }: {
    title: string | undefined,
    projects: (FeaturedProject | undefined)[] | undefined,
    uploadPrefix: string | undefined
}) {
    projects = projects?.filter((alum): alum is FeaturedProject => alum !== undefined) ?? []
    return <section aria-label="Featured Projects" className="section container !my-24">
        <Swiper aria-live="polite" spaceBetween={10} autoplay={true} slidesPerView={1}
                modules={[ A11y, Autoplay, Pagination ]}>
            {projects.map((project, index) =>
                <SwiperSlide key={index}>
                    <div aria-roledescription="carousel"
                         className="flex flex-col md:flex-row items-center gap-8 md:mb-5" role="region">
                        <div className="w-full md:w-1/3 flex pl-8 items-center">
                            <div className="project-big-pic-box h-72 md:h-auto">
                                <img src={`${uploadPrefix}/${project?.image?.sha1}.webp`} alt={project?.image?.altText}
                                     className="w-full h-full object-cover aspect-3/4 transition-all duration-300 block project-big-pic"/>
                            </div>
                        </div>
                        <div className="w-full md:w-2/3">
                            <div className="p-8 md:p-20">
                                <div
                                    className="bg-[var(--standard-blue)] text-white px-4 py-2 rounded-full mb-4 inline-block">
                                    {title}
                                </div>
                                <div className="transition-all duration-300 md:h-80 justify-center flex flex-col">
                                    <p className="text-3xl mb-3">{project?.quote}</p>
                                    <p className="mb-5 text-right">— {project?.name}</p>
                                    {project?.link && project?.linkText &&
                                        <ReadMore color="#103c74" text={project.linkText} to={project.link}/>}
                                </div>
                            </div>
                        </div>
                    </div>
                </SwiperSlide>
            )}
        </Swiper>
    </section>
}

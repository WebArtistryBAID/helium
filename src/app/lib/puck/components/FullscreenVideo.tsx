'use client'

import { useEffect, useRef, useState } from 'react'
import type { Image } from '@/generated/prisma/browser'
import { FullscreenMediaText } from '@/app/lib/puck/components/ImageGallery'

export default function FullscreenVideo({
    title, titleSize, content, link, linkText, video, poster, uploadPrefix
}: {
    title: string | undefined,
    titleSize: string | undefined,
    content: string | undefined,
    link: string | undefined,
    linkText: string | undefined,
    video: Image | null | undefined,
    poster: Image | null | undefined,
    uploadPrefix: string | undefined
}) {
    const [ videoReady, setVideoReady ] = useState(false)
    const [ minimumPosterTimeElapsed, setMinimumPosterTimeElapsed ] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const videoSrc = video == null ? null : `${uploadPrefix}/${video.sha1}.${video.extension}`
    const posterSrc = poster == null ? null : `${uploadPrefix}/${poster.sha1}.${poster.extension}`

    useEffect(() => {
        setVideoReady(false)
        if (videoRef.current != null) {
            videoRef.current.pause()
            if (videoRef.current.readyState > 0) videoRef.current.currentTime = 0
        }
        if (posterSrc == null) {
            setMinimumPosterTimeElapsed(true)
            return
        }
        setMinimumPosterTimeElapsed(false)
        const timer = window.setTimeout(() => setMinimumPosterTimeElapsed(true), 1500)
        return () => window.clearTimeout(timer)
    }, [ posterSrc, videoSrc ])

    const showVideo = videoReady && minimumPosterTimeElapsed

    useEffect(() => {
        const element = videoRef.current
        if (!showVideo || element == null) return
        element.currentTime = 0
        void element.play().catch(error => {
            console.error('Unable to autoplay fullscreen video', error)
        })
    }, [ showVideo, videoSrc ])

    if (videoSrc == null && posterSrc == null) return null

    return <section data-surface="gradient" aria-label={title} className="w-full overflow-hidden">
        <h2 className="sr-only">{title}</h2>
        <div className="relative h-[100svh] min-h-[100vh] w-full bg-black md:h-screen md:min-h-0">
            {posterSrc &&
                <img src={posterSrc} alt={poster?.altText ?? ''}
                     className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${showVideo ? 'opacity-0' : 'opacity-100'}`}/>} 
            {videoSrc &&
                <video ref={videoRef} muted loop playsInline controls={false} preload="auto" aria-hidden="true"
                       onCanPlay={() => setVideoReady(true)}
                       className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${showVideo ? 'opacity-100' : 'opacity-0'}`}>
                    <source src={videoSrc} type={video?.mimeType}/>
                </video>}
            <FullscreenMediaText title={title} titleSize={titleSize} content={content}
                                 link={link} linkText={linkText}/>
        </div>
    </section>
}

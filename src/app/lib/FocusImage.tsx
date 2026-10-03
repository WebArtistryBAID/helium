'use client'

import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'
import { getFocusGeometry, hasImageFocus, type FocusImageData } from './image-focus'

export default function FocusImage({ image, className, style, ...props }: ImgHTMLAttributes<HTMLImageElement> & {
    image?: FocusImageData | null
}) {
    const frame = useRef<HTMLSpanElement>(null)
    const [ dimensions, setDimensions ] = useState({ width: 0, height: 0 })
    const cropped = hasImageFocus(image)
    useEffect(() => {
        const element = frame.current
        if (!element || !cropped) return
        const observer = new ResizeObserver(() => setDimensions({
            width: element.clientWidth,
            height: element.clientHeight
        }))
        observer.observe(element)
        return () => observer.disconnect()
    }, [ cropped ])
    if (!cropped || !image) return <img {...props} className={className} style={style}/>
    const geometry = dimensions.width && dimensions.height ? getFocusGeometry(image, dimensions.width, dimensions.height) : null
    return <span ref={frame} className={className} style={{
        ...style, display: 'block', overflow: 'hidden',
        position: style?.position ?? (/\babsolute\b/.test(className ?? '') ? 'absolute' : 'relative'),
        aspectRatio: style?.aspectRatio ?? (/aspect-/.test(className ?? '') ? undefined : `${image.width} / ${image.height}`)
    }}>
        <img {...props} style={geometry ? {
            position: 'absolute', maxWidth: 'none', maxHeight: 'none', ...geometry
        } : { width: '100%', height: '100%', objectFit: 'cover' }}/>
    </span>
}

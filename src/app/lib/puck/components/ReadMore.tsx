'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import { prefixLink } from '@/app/lib/data-types'

function hexToRgb(hex: string) {
    hex = hex.replace(/^#/, '')
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('')
    }
    const bigint = parseInt(hex, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number) {
    const toHex = (n: number) => {
        const h = n.toString(16)
        return h.length === 1 ? '0' + h : h
    }
    return '#' + toHex(r) + toHex(g) + toHex(b)
}

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0)
                break
            case g:
                h = (b - r) / d + 2
                break
            case b:
                h = (r - g) / d + 4
                break
        }
        h /= 6
    }
    return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number) {
    let r: number, g: number, b: number

    if (s === 0) {
        r = g = b = l
    } else {
        function hue2rgb(p: number, q: number, t: number) {
            if (t < 0) t += 1
            if (t > 1) t -= 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

function lightenColor(color: string, percent: number) {
    // If color is not hex, just return it as fallback
    if (!color.startsWith('#')) return color

    const { r, g, b } = hexToRgb(color)
    const { h, s } = rgbToHsl(r, g, b)
    let l = rgbToHsl(r, g, b).l
    l += percent / 100
    if (l > 1) l = 1
    const rgb = hslToRgb(h, s, l)
    return rgbToHex(rgb.r, rgb.g, rgb.b)
}

export default function ReadMore({ text, to, color = '#82181a', iconColor = 'match' }:
                                 { text: string, to: string, color?: string, iconColor?: string }) {
    const [ isHovered, setIsHovered ] = useState(false)
    const language = useLanguage()

    return <Link href={prefixLink(language, to)} className="decoration-none group"
                 onMouseEnter={() => setIsHovered(true)}
                 onMouseLeave={() => setIsHovered(false)}>
        <div className="flex items-center w-min">
            <i
                aria-hidden="true"
                className="mr-2 flex items-center"
            >
                <svg
                    height="30"
                    viewBox="0 0 32.99999997656249 32.99999997656255"
                    width="30"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        style={{
                            fill: isHovered
                                ? lightenColor(iconColor === 'match' ? color : iconColor, 20)
                                : (iconColor === 'match' ? color : iconColor)
                        }}
                        className="transition-colors duration-200 ease-in-out"
                        d="M0 16.5C0 25.57 7.43 33 16.5 33C25.57 33 33 25.57 33 16.5C33 7.43 25.65 0 16.5 0C7.43 0 0 7.43 0 16.5Z M26.78 17.25C26.78 17.17 26.85 17.17 26.85 17.1C26.92 17.02 26.92 17.02 26.92 16.95C27 16.87 27 16.87 27 16.8L27 16.5L27 16.12C26.92 16.05 26.92 16.05 26.92 15.98C26.92 15.9 26.85 15.9 26.85 15.82C26.85 15.75 26.78 15.67 26.78 15.67L26.55 15.45L20.55 9.45C19.95 8.85 19.05 8.85 18.45 9.45C17.85 10.05 17.85 10.95 18.45 11.55L21.9 15L7.5 15C6.67 15 6 15.67 6 16.5C6 17.33 6.67 18 7.5 18L21.9 18L18.45 21.45C17.85 22.05 17.85 22.95 18.45 23.55C18.75 23.85 19.12 24 19.5 24C19.88 24 20.33 23.85 20.48 23.55L26.47 17.55L26.7 17.33C26.78 17.32 26.78 17.25 26.78 17.25Z "
                        fillRule="evenodd"
                        opacity="1"
                        transform="translate(0 2.3092638912203256e-14)  rotate(0 16.499999988281253 16.499999988281253)"
                    />
                </svg>
            </i>
            <span
                style={{ color }}
                className="w-max !font-sans tracking-wide"
            >{text}</span>
        </div>
    </Link>
}

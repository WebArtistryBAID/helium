'use client'

import type { CSSProperties, ReactNode } from 'react'
import TaxonomyIcon from '@/app/studio/media/TaxonomyIcon'

type Props = {
    name: string
    color: string
    /** Geist icon key; the icon inherits the chip color and size. */
    icon?: string | null
    count?: number
    onClick?: () => void
    pressed?: boolean
    title?: string
    trailing?: ReactNode
    className?: string
}

/** A small colored pill used for tags and theme folders across the media taxonomy UI. */
export default function TaxonomyChip({
                                         name, color, icon, count, onClick, pressed, title, trailing, className = ''
                                     }: Props) {
    const style: CSSProperties = {
        color,
        backgroundColor: `${color}14`,
        borderColor: pressed ? color : `${color}55`,
        boxShadow: pressed ? `inset 0 0 0 1px ${color}` : undefined
    }
    const content = <>
        <TaxonomyIcon icon={icon} size={13} className="shrink-0"/>
        <span className="max-w-48 truncate">{name}</span>
        {count != null && <span className="text-[11px] tabular-nums opacity-70">{count}</span>}
        {trailing}
    </>
    if (onClick != null) {
        return <button type="button" title={title ?? name} aria-pressed={pressed}
                       onClick={onClick}
                       className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:brightness-95 ${className}`}
                       style={style}>
            {content}
        </button>
    }
    return <span title={title ?? name}
                 className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
                 style={style}>
        {content}
    </span>
}

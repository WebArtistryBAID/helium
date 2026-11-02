import type { ComponentType } from 'react'
import {
    BookClosed,
    BookOpen,
    Bookmark,
    Buildings,
    Camera,
    Compass,
    Flag,
    FolderClosed,
    FolderOpen,
    FolderPlus,
    Globe,
    GridSquare,
    Hash,
    Heart,
    Image,
    Layers,
    Lightning,
    Moon,
    Music,
    Sparkles,
    Star,
    Sun,
    Tag,
    User,
    Users,
    Video
} from 'geist-icons'

import type { TaxonomyIconKey } from '@/app/lib/media-taxonomy-icons'

type IconComponent = ComponentType<{
    size?: string | number
    className?: string
    color?: string
    'aria-hidden'?: boolean | 'true' | 'false',
    focusable?: boolean | 'true' | 'false'
}>

/** Curated subset of Geist icons. All are monochrome 16×16 line icons that inherit `currentColor`. */
const ICONS: Record<TaxonomyIconKey, IconComponent> = {
    'tag': Tag,
    'bookmark': Bookmark,
    'flag': Flag,
    'folder': FolderClosed,
    'folder-open': FolderOpen,
    'folder-plus': FolderPlus,
    'image': Image,
    'camera': Camera,
    'video': Video,
    'book-open': BookOpen,
    'book-closed': BookClosed,
    'globe': Globe,
    'users': Users,
    'user': User,
    'buildings': Buildings,
    'compass': Compass,
    'layers': Layers,
    'grid': GridSquare,
    'hash': Hash,
    'music': Music,
    'sparkles': Sparkles,
    'star': Star,
    'heart': Heart,
    'lightning': Lightning,
    'sun': Sun,
    'moon': Moon
}

/**
 * Renders a Geist icon by taxonomy key. The icon inherits the surrounding text color (`currentColor`), so tags and
 * theme folders always render their icon in the same color as their label, at a single consistent size.
 */
export default function TaxonomyIcon({ icon, size = 14, className = '', color }: {
    icon?: string | null
    size?: number
    className?: string
    color?: string
}) {
    const Icon = ICONS[(icon ?? 'tag') as TaxonomyIconKey] ?? Tag
    return <Icon size={size} color={color} className={className} aria-hidden="true" focusable="false"/>
}

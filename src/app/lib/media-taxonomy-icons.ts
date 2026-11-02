/**
 * The curated Geist icon set available to tags and theme folders.
 *
 * Keep the keys in sync with the component registry in `@/app/studio/media/TaxonomyIcon`. This module is shared
 * between the server (validation) and the client (icon pickers), so it must stay free of React imports.
 */
export const TAXONOMY_ICON_KEYS = [
    'tag',
    'bookmark',
    'flag',
    'folder',
    'folder-open',
    'folder-plus',
    'image',
    'camera',
    'video',
    'book-open',
    'book-closed',
    'globe',
    'users',
    'user',
    'buildings',
    'compass',
    'layers',
    'grid',
    'hash',
    'music',
    'sparkles',
    'star',
    'heart',
    'lightning',
    'sun',
    'moon'
] as const

export type TaxonomyIconKey = (typeof TAXONOMY_ICON_KEYS)[number]

export const DEFAULT_TAG_ICON: TaxonomyIconKey = 'tag'
export const DEFAULT_COLLECTION_ICON: TaxonomyIconKey = 'folder'

export function isTaxonomyIconKey(value: unknown): value is TaxonomyIconKey {
    return typeof value === 'string' && (TAXONOMY_ICON_KEYS as readonly string[]).includes(value)
}

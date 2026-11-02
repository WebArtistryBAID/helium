/** Presets shared by the tag and collection editors. */
import { DEFAULT_COLLECTION_ICON, DEFAULT_TAG_ICON, TAXONOMY_ICON_KEYS } from '@/app/lib/media-taxonomy-icons'

export { DEFAULT_COLLECTION_ICON, DEFAULT_TAG_ICON }

export const DEFAULT_TAG_COLOR = '#3b82f6'
export const DEFAULT_COLLECTION_COLOR = '#6366f1'

export const TAG_COLOR_PRESETS = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#64748b'
]

export const COLLECTION_COLOR_PRESETS = TAG_COLOR_PRESETS

/** Icon choices shown in the tag / theme icon picker. */
export const ICON_PRESETS = TAXONOMY_ICON_KEYS

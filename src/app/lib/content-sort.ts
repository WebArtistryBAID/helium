export type ContentSort = 'title-en-asc' | 'title-en-desc' | 'title-zh-asc' | 'title-zh-desc' | 'newest' | 'oldest'

export const contentSortField = {
    label: '排序',
    type: 'select' as const,
    options: [
        { label: 'A-Z (按英文标题)', value: 'title-en-asc' },
        { label: 'Z-A (按英文标题)', value: 'title-en-desc' },
        { label: 'A-Z (按中文标题)', value: 'title-zh-asc' },
        { label: 'Z-A (按中文标题)', value: 'title-zh-desc' },
        { label: '从新到旧', value: 'newest' },
        { label: '从旧到新', value: 'oldest' }
    ]
}

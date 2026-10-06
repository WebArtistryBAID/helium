export type ContentSort = 'title-en-asc' | 'title-en-desc' | 'title-zh-asc' | 'title-zh-desc' | 'newest' | 'oldest'

export const contentSortField = {
    label: '排序',
    type: 'select' as const,
    options: [
        { label: 'A-Z by English title', value: 'title-en-asc' },
        { label: 'Z-A by English title', value: 'title-en-desc' },
        { label: 'A-Z by Chinese title', value: 'title-zh-asc' },
        { label: 'Z-A by Chinese title', value: 'title-zh-desc' },
        { label: 'Newest to oldest', value: 'newest' },
        { label: 'Oldest to newest', value: 'oldest' }
    ]
}

import 'server-only'

export async function invalidateCollaborationDocuments(): Promise<void> {
    const configuredUrl = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL
    if (configuredUrl == null || configuredUrl.length === 0 || process.env.JWT_SECRET == null) return
    const url = configuredUrl.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/$/, '') + '/invalidate'
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'x-collaboration-secret': process.env.JWT_SECRET },
            body: JSON.stringify({ all: true }),
            cache: 'no-store'
        })
        if (!response.ok) console.error('Failed to invalidate collaboration documents:', response.status)
    } catch (error) {
        console.error('Failed to invalidate collaboration documents:', error)
    }
}

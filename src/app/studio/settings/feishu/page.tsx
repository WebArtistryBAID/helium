import { redirect } from 'next/navigation'

export default async function SettingsPage({ searchParams }: {
    searchParams: Promise<{ success?: string; error?: string }>
}) {
    const result = await searchParams
    const query = new URLSearchParams()
    if (result.success) query.set('success', result.success)
    if (result.error) query.set('error', result.error)
    redirect(`/studio/settings${query.size ? `?${query}` : ''}`)
}

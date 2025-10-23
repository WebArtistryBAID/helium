import { headers } from 'next/headers'

export default async function serverLanguage(): Promise<'en' | 'zh'> {
    const path = (await headers()).get('X-Invoke-Path') ?? '/'
    const firstPart = path.split('/')[1]
    if (firstPart === 'zh') return 'zh'
    return 'en'
}

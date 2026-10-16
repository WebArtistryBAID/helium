export function getSiteOrigin(): string {
    const host = process.env.HOST?.trim()
    if (!host) throw new Error('HOST must be configured to generate public URLs')
    const url = new URL(host)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('HOST must use HTTP or HTTPS')
    }
    return url.origin
}

export function getLocalizedURL(locale: 'en' | 'zh', pathname: string): string {
    const normalizedPath = pathname.replace(/^\/+|\/+$/g, '')
    return `${getSiteOrigin()}/${locale}${normalizedPath ? `/${normalizedPath}` : ''}`
}

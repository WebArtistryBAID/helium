export function normalizePublicSlug(slug: string | null | undefined) {
    if (slug == null || slug === '/' || slug.trim() === '') {
        return '/'
    }

    return slug.replace(/^\/+|\/+$/g, '')
}

export function buildLocalizedPath(locale: string, slug: string | null | undefined) {
    const normalizedSlug = normalizePublicSlug(slug)

    if (normalizedSlug === '/') {
        return `/${locale}`
    }

    return `/${locale}/${normalizedSlug}`
}

export function getCurrentSlugFromPathname(pathname: string | null | undefined) {
    if (pathname == null || pathname === '') {
        return '/'
    }

    const parts = pathname.split('/').filter(Boolean)
    const [, ...rest ] = parts

    if (rest.length === 0) {
        return '/'
    }

    return rest.join('/')
}

export function switchLocalePath(pathname: string | null | undefined, locale: string) {
    return buildLocalizedPath(locale, getCurrentSlugFromPathname(pathname))
}

export function isSectionActive(currentSlug: string, sectionSlug: string, childSlugs: string[] = []) {
    const normalizedCurrent = normalizePublicSlug(currentSlug)
    const normalizedSection = normalizePublicSlug(sectionSlug)

    if (normalizedCurrent === normalizedSection) {
        return true
    }

    if (normalizedSection !== '/' && normalizedCurrent.startsWith(`${normalizedSection}/`)) {
        return true
    }

    return childSlugs
        .map(normalizePublicSlug)
        .some(childSlug => normalizedCurrent === childSlug || normalizedCurrent.startsWith(`${childSlug}/`))
}

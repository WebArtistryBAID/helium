/** Returns `target` only if it is a same-origin path, so it can be appended to HOST safely. */
export function safeRedirectPath(target: string | null | undefined): string {
    if (target == null || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
        return '/'
    }
    // Browsers ignore tabs and newlines in URLs, so "/\t/evil.com" would act like "//evil.com".
    if (/[\u0000-\u001f\u007f]/.test(target)) {
        return '/'
    }
    try {
        const base = 'http://helium.invalid'
        const url = new URL(target, base)
        return url.origin === base ? url.pathname + url.search + url.hash : '/'
    } catch {
        return '/'
    }
}

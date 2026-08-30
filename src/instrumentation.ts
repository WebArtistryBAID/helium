export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.DATABASE_URI) return

    const { ensureWebsiteMetadataEntity } = await import('@/app/lib/website-metadata.server')
    await ensureWebsiteMetadataEntity()
}

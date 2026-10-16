import type { MetadataRoute } from 'next'
import { getSiteOrigin } from '@/app/lib/seo/site-url'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/' },
        sitemap: `${getSiteOrigin()}/sitemap.xml`
    }
}

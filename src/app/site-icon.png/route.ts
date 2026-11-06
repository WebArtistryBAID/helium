import { siteIconResponse } from '@/app/lib/metadata/site-icon'

export const dynamic = 'force-dynamic'

// Search engines require square favicons sized in multiples of 48px.
export function GET(request: Request) {
    return siteIconResponse(request, 'png', 192)
}

import { siteIconResponse } from '@/app/lib/metadata/site-icon'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
    return siteIconResponse(request, 'ico', 48)
}

import { NextRequest, NextResponse } from 'next/server'
import authMiddleware from '@/app/login/auth-middleware'

export default async function proxy(req: NextRequest) {
    const authResponse = await authMiddleware(req)
    if (authResponse != null) {
        return authResponse
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-pathname', req.nextUrl.pathname)

    return NextResponse.next({
        request: {
            headers: requestHeaders
        }
    })
}

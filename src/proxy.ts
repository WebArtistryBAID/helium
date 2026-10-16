import { NextRequest, NextResponse } from 'next/server'
import authMiddleware from '@/app/login/auth-middleware'

export default async function proxy(req: NextRequest) {
    // Stupid school exploit detector insists that I do not set the "Allow" header for OPTIONS
    if (req.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204 })
    }

    const middlewares = [
        await authMiddleware(req)
    ]
    for (const middleware of middlewares) {
        if (middleware) return middleware
    }
    return NextResponse.next()
}


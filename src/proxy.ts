import { NextRequest, NextResponse } from 'next/server'
import authMiddleware from '@/app/login/auth-middleware'

export default async function proxy(req: NextRequest) {
    const middlewares = [
        await authMiddleware(req)
    ]
    for (const middleware of middlewares) {
        if (middleware) return middleware
    }
    return NextResponse.next()
}


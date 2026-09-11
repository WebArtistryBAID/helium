import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getLoginTarget, getMyUser } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'

const protectedRoutes = [
    '/login'
]

const protectedRoutesPartial = [
    '/studio'
]

export default async function authMiddleware(req: NextRequest): Promise<NextResponse | null> {
    let isProtected = protectedRoutes.includes(req.nextUrl.pathname)
    for (const path of protectedRoutesPartial) {
        if (req.nextUrl.pathname.startsWith(path)) {
            isProtected = true
            break
        }
    }
    if (!isProtected) {
        return null
    }
    const cookie = (await cookies()).get('access_token')?.value
    if (cookie == null) {
        return NextResponse.redirect(new URL(await getLoginTarget(req.nextUrl.pathname + req.nextUrl.search), req.nextUrl))
    }
    try {
        await jwtVerify(cookie, new TextEncoder().encode(process.env.JWT_SECRET!))
    } catch {
        return NextResponse.redirect(new URL(await getLoginTarget(req.nextUrl.pathname + req.nextUrl.search), req.nextUrl))
    }

    const pathname = req.nextUrl.pathname
    if (pathname === '/studio' || pathname.startsWith('/studio/')) {
        const user = await getMyUser()
        const adminOnly = ['/studio/users', '/studio/backups'].some(path => pathname === path || pathname.startsWith(`${path}/`))
        if (!user?.roles.includes(Role.writer) || (adminOnly && !user.roles.includes(Role.admin))) {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
            }
            const deniedUrl = req.nextUrl.clone()
            deniedUrl.pathname = '/permission-denied'
            deniedUrl.search = ''
            return NextResponse.rewrite(deniedUrl, { status: 403 })
        }
    }
    return null
}

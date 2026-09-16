import { NextRequest, NextResponse } from 'next/server'
import { Gender, UserAuditLogType, UserType } from '@/generated/prisma/client'
import { createSecretKey } from 'node:crypto'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/app/lib/prisma'
import { ensureWebsiteMetadataEntity } from '@/app/lib/metadata/website-metadata.server'

const secret = createSecretKey(process.env.JWT_SECRET!, 'utf-8')

export async function GET(request: NextRequest): Promise<NextResponse> {
    const search = request.nextUrl.searchParams
    const ip = request.headers.get('X-Forwarded-For') ?? request.headers.get('X-Real-IP') ?? 'localhost'
    let redirectTarget = '/'
    if (search.has('state')) {
        redirectTarget = search.get('state')!
    }
    if (search.has('error')) {
        if (search.get('error') === 'access_denied') {
            return NextResponse.redirect('/')
        }
        return NextResponse.redirect(`${process.env.HOST}/login/error`)
    }
    let r: Response
    try {
        r = await fetch(`${process.env.ONELOGIN_HOST}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.ONELOGIN_CLIENT_ID}:${process.env.ONELOGIN_CLIENT_SECRET}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: search.get('code')!,
                redirect_uri: `${process.env.HOST}/login/authorize`
            }).toString()
        })
    } catch {
        return NextResponse.redirect(`${process.env.HOST}/login/error`)
    }
    const json = await r.json() as { access_token?: unknown, error?: unknown }
    if (!r.ok || typeof json.access_token !== 'string') {
        return NextResponse.redirect(`${process.env.HOST}/login/error`)
    }
    const accessToken = json.access_token

    let me: Response
    try {
        me = await fetch(`${process.env.ONELOGIN_HOST}/api/v1/me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
    } catch {
        return NextResponse.redirect(`${process.env.HOST}/login/error`)
    }
    const meJson = await me.json() as Record<string, unknown>
    if (!me.ok || typeof meJson.seiueId !== 'number' || typeof meJson.name !== 'string' ||
        typeof meJson.pinyin !== 'string' || !Object.values(UserType).includes(meJson.type as UserType) ||
        !Object.values(Gender).includes(meJson.gender as Gender)) {
        return NextResponse.redirect(`${process.env.HOST}/login/error`)
    }
    const userId = meJson.seiueId
    const name = meJson.name
    const pinyin = meJson.pinyin
    const phone = typeof meJson.phone === 'string' ? meJson.phone : null
    const userType = meJson.type as UserType
    const gender = meJson.gender as Gender
    const user = await prisma.user.upsert({
        where: {
            id: userId
        },
        update: {
            name,
            pinyin,
            phone,
            type: userType,
            gender
        },
        create: {
            id: userId,
            name,
            pinyin,
            phone,
            type: userType,
            gender
        }
    })
    await ensureWebsiteMetadataEntity(user.id)

    await prisma.userAuditLog.create({
        data: {
            userId: user.id,
            type: UserAuditLogType.login,
            values: [ request.headers.get('User-Agent') ?? '', ip ]
        }
    })
    const token = await new SignJWT({
        id: user.id,
        name: user.name,
        phone: user.phone,
        pinyin: user.pinyin,
        roles: user.roles,
        userType: user.type,
        gender: user.gender,
        type: 'internal'
    })
        .setIssuedAt()
        .setIssuer('https://hello.beijing.academy')
        .setAudience('https://hello.beijing.academy')
        .setExpirationTime('30 days')
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret);
    (await cookies()).set('access_token', token, {
        expires: new Date(Date.now() + 86400000 * 30),
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    })
    return NextResponse.redirect(process.env.HOST! + redirectTarget)
}

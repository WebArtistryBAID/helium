import { SignJWT } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { ContentLanguage, Role } from '@/generated/prisma/client'
import { requireUserWithRole } from '@/app/login/login-actions'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: NextRequest): Promise<Response> {
    try {
        const user = await requireUserWithRole(Role.writer)
        const entityId = Number(request.nextUrl.searchParams.get('entityId'))
        const language = request.nextUrl.searchParams.get('language')
        if (!Number.isInteger(entityId) || !Object.values(ContentLanguage).includes(language as ContentLanguage)) {
            return NextResponse.json({ error: 'invalid-request' }, { status: 400 })
        }
        const entity = await prisma.contentEntity.findUnique({ where: { id: entityId }, select: { id: true } })
        if (entity == null) return NextResponse.json({ error: 'not-found' }, { status: 404 })

        const room = `content-entity:${entityId}:${language}`
        const token = await new SignJWT({ room, entityId, language })
            .setSubject(String(user.id))
            .setIssuedAt()
            .setIssuer('helium-next')
            .setAudience('helium-collaboration')
            .setExpirationTime('5 minutes')
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode(process.env.JWT_SECRET!))
        return NextResponse.json({ token })
    } catch {
        return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
    }
}

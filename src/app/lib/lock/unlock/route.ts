import { NextRequest, NextResponse } from 'next/server'
import { releaseLock } from '@/app/lib/lock/lock-actions'

export async function POST(req: NextRequest): Promise<NextResponse> {
    const data = await req.json()
    try {
        await releaseLock({
            entityType: data.entityType,
            entityId: data.entityId,
            token: data.token
        })
    } finally {
    }
    return new NextResponse(null, { status: 204 })
}

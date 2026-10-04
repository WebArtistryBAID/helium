import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/generated/prisma/client'
import { getStudioActor } from '@/app/lib/services/studio-actor'
import { requireActorUser } from '@/app/lib/services/actor'
import { MediaUploadError, uploadMedia } from '@/app/lib/services/media-upload'

export const runtime = 'nodejs'

export async function POST(req: NextRequest): Promise<Response> {
    let actor
    try {
        actor = await getStudioActor()
        await requireActorUser(actor, Role.writer)
    } catch {
        return NextResponse.json({ error: 'no-permission' }, { status: 403 })
    }
    const declaredLength = Number(req.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > 250 * 1024 * 1024) {
        return NextResponse.json({ error: 'file-too-large' }, { status: 413 })
    }
    try {
        const form = await req.formData()
        const file = form.get('file')
        if (!(file instanceof File)) return NextResponse.json({ error: 'no-file' }, { status: 400 })
        return NextResponse.json(await uploadMedia(actor, file, req.signal))
    } catch (error) {
        if (req.signal.aborted) return new Response(null, { status: 499 })
        if (error instanceof MediaUploadError) {
            return NextResponse.json({ error: error.code }, { status: error.status })
        }
        console.error('Media upload failed:', error)
        return NextResponse.json({ error: 'upload-failed' }, { status: 500 })
    }
}

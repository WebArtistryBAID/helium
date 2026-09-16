import * as fs from 'fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import crypto from 'crypto'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const MAX_INPUT_PIXELS = 40_000_000

function getPath(relative: string): string {
    return path.join(process.env.UPLOAD_PATH!, relative)
}

export async function POST(req: NextRequest): Promise<Response> {
    try {
        await requireUserWithRole(Role.writer)
    } catch {
        return NextResponse.json({ error: 'no-permission' }, { status: 403 })
    }
    const declaredLength = Number(req.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: 'file-too-large' }, { status: 413 })
    }
    try {
        await fs.access(process.env.UPLOAD_PATH!)
    } catch {
        await fs.mkdir(process.env.UPLOAD_PATH!, { recursive: true })
    }
    let hash: string | null = null
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        if (file == null) return NextResponse.json({ error: 'no-file' }, { status: 400 })
        if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'not-image' }, { status: 400 })
        if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'file-too-large' }, { status: 413 })

        req.signal.throwIfAborted()
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        const [ webpBuffer, thumbnailBuffer ] = await Promise.all([
            sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS }).webp().toBuffer(),
            sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
                .resize(300, 200, { fit: 'inside', withoutEnlargement: true }).webp().toBuffer()
        ])
        req.signal.throwIfAborted()
        hash = crypto.createHash('sha1').update(webpBuffer).digest('hex')
        const existingImage = await prisma.image.findUnique({ where: { sha1: hash }, select: { id: true } })
        if (existingImage) return NextResponse.json({ error: 'duplicate' })

        await fs.writeFile(getPath(hash + '.webp'), webpBuffer)
        await fs.writeFile(getPath(hash + '_thumb.webp'), thumbnailBuffer)
        req.signal.throwIfAborted()
        return NextResponse.json({ hash })
    } catch (error) {
        if (hash != null) {
            await fs.rm(getPath(hash + '.webp'), { force: true })
            await fs.rm(getPath(hash + '_thumb.webp'), { force: true })
        }
        if (req.signal.aborted) return new Response(null, { status: 499 })
        console.error('Image upload failed:', error)
        return NextResponse.json({ error: 'upload-failed' }, { status: 500 })
    }
}

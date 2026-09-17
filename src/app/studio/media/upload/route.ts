import * as fs from 'fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import crypto from 'crypto'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { ensureVideoThumbnail } from '@/app/studio/media/video-thumbnail'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_BYTES = 250 * 1024 * 1024
const MAX_INPUT_PIXELS = 40_000_000
const VIDEO_TYPES = new Map([
    [ 'video/mp4', 'mp4' ],
    [ 'video/webm', 'webm' ],
    [ 'video/quicktime', 'mov' ],
    [ 'video/ogg', 'ogv' ]
])

function getPath(relative: string): string {
    return path.join(process.env.UPLOAD_PATH!, relative)
}

function hasExpectedVideoSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'video/webm') return buffer.subarray(0, 4).equals(Buffer.from([ 0x1a, 0x45, 0xdf, 0xa3 ]))
    if (mimeType === 'video/ogg') return buffer.subarray(0, 4).toString('ascii') === 'OggS'
    if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
        return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp'
    }
    return false
}

export async function POST(req: NextRequest): Promise<Response> {
    try {
        await requireUserWithRole(Role.writer)
    } catch {
        return NextResponse.json({ error: 'no-permission' }, { status: 403 })
    }
    const declaredLength = Number(req.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: 'file-too-large' }, { status: 413 })
    }
    try {
        await fs.access(process.env.UPLOAD_PATH!)
    } catch {
        await fs.mkdir(process.env.UPLOAD_PATH!, { recursive: true })
    }
    let hash: string | null = null
    let extension: string | null = null
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        if (file == null) return NextResponse.json({ error: 'no-file' }, { status: 400 })
        const isImage = file.type.startsWith('image/')
        const videoExtension = VIDEO_TYPES.get(file.type)
        if (!isImage && videoExtension == null) {
            return NextResponse.json({ error: 'unsupported-media' }, { status: 400 })
        }
        const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
        if (file.size > maxBytes) return NextResponse.json({ error: 'file-too-large' }, { status: 413 })

        req.signal.throwIfAborted()
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        let storedBuffer: Buffer
        let thumbnailBuffer: Buffer | null = null
        if (isImage) {
            [ storedBuffer, thumbnailBuffer ] = await Promise.all([
                sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS }).webp().toBuffer(),
                sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
                    .resize(300, 200, { fit: 'inside', withoutEnlargement: true }).webp().toBuffer()
            ])
            extension = 'webp'
        } else {
            if (!hasExpectedVideoSignature(fileBuffer, file.type)) {
                return NextResponse.json({ error: 'unsupported-media' }, { status: 400 })
            }
            storedBuffer = fileBuffer
            extension = videoExtension!
        }
        req.signal.throwIfAborted()
        hash = crypto.createHash('sha1').update(storedBuffer).digest('hex')
        const existingImage = await prisma.image.findUnique({ where: { sha1: hash }, select: { id: true } })
        if (existingImage) return NextResponse.json({ error: 'duplicate' })

        await fs.writeFile(getPath(`${hash}.${extension}`), storedBuffer)
        if (thumbnailBuffer != null) await fs.writeFile(getPath(hash + '_thumb.webp'), thumbnailBuffer)
        if (!isImage) await ensureVideoThumbnail(hash, extension, true)
        req.signal.throwIfAborted()
        return NextResponse.json({
            hash,
            mediaType: isImage ? 'image' : 'video',
            extension,
            mimeType: isImage ? 'image/webp' : file.type
        })
    } catch (error) {
        if (hash != null && extension != null) {
            await fs.rm(getPath(`${hash}.${extension}`), { force: true })
            await fs.rm(getPath(hash + '_thumb.webp'), { force: true })
        }
        if (req.signal.aborted) return new Response(null, { status: 499 })
        console.error('Media upload failed:', error)
        return NextResponse.json({ error: 'upload-failed' }, { status: 500 })
    }
}

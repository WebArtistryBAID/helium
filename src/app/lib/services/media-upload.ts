import 'server-only'

import * as fs from 'fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import crypto from 'crypto'
import type { OperationActor } from '@/app/lib/mcp/contracts'
import { requireActorUser } from '@/app/lib/services/actor'
import { Role } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { ensureVideoThumbnail } from '@/app/studio/media/video-thumbnail'


const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_BYTES = 250 * 1024 * 1024
const MAX_INPUT_PIXELS = 40_000_000
const MAX_IMAGE_DIMENSION = 2000
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

export class MediaUploadError extends Error {
    readonly code: string
    readonly status: number

    constructor(code: string, status: number) {
        super(code)
        this.code = code
        this.status = status
    }
}

export type MediaUploadResult = {
    hash: string
    mediaType: 'image' | 'video'
    extension: string
    mimeType: string
}

export async function uploadMedia(actor: OperationActor, file: File, signal?: AbortSignal): Promise<MediaUploadResult> {
    await requireActorUser(actor, Role.writer)
    try {
        await fs.access(process.env.UPLOAD_PATH!)
    } catch {
        await fs.mkdir(process.env.UPLOAD_PATH!, { recursive: true })
    }
    let hash: string | null = null
    let extension: string | null = null
    let writesStarted = false
    try {
        const isImage = file.type.startsWith('image/')
        const videoExtension = VIDEO_TYPES.get(file.type)
        if (!isImage && videoExtension == null) {
            throw new MediaUploadError('unsupported-media', 400)
        }
        const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
        if (file.size > maxBytes) throw new MediaUploadError('file-too-large', 413)

        signal?.throwIfAborted()
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        let storedBuffer: Buffer
        let thumbnailBuffer: Buffer | null = null
        if (isImage) {
            [ storedBuffer, thumbnailBuffer ] = await Promise.all([
                sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
                    .rotate()
                    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .webp()
                    .toBuffer(),
                sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
                    .rotate()
                    .resize(300, 200, { fit: 'inside', withoutEnlargement: true }).webp().toBuffer()
            ])
            extension = 'webp'
        } else {
            if (!hasExpectedVideoSignature(fileBuffer, file.type)) {
                throw new MediaUploadError('unsupported-media', 400)
            }
            storedBuffer = fileBuffer
            extension = videoExtension!
        }
        signal?.throwIfAborted()
        hash = crypto.createHash('sha1').update(storedBuffer).digest('hex')
        const existingImage = await prisma.image.findUnique({ where: { sha1: hash }, select: { id: true } })
        if (existingImage) {
            if (actor.source === 'mcp') return {
                hash,
                mediaType: isImage ? 'image' : 'video',
                extension,
                mimeType: isImage ? 'image/webp' : file.type
            }
            throw new MediaUploadError('duplicate', 200)
        }

        writesStarted = true
        await fs.writeFile(getPath(`${hash}.${extension}`), storedBuffer)
        if (thumbnailBuffer != null) await fs.writeFile(getPath(hash + '_thumb.webp'), thumbnailBuffer)
        if (!isImage) await ensureVideoThumbnail(hash, extension, true)
        signal?.throwIfAborted()
        return {
            hash,
            mediaType: isImage ? 'image' : 'video',
            extension,
            mimeType: isImage ? 'image/webp' : file.type
        }
    } catch (error) {
        if (writesStarted && hash != null && extension != null) {
            await fs.rm(getPath(`${hash}.${extension}`), { force: true })
            await fs.rm(getPath(hash + '_thumb.webp'), { force: true })
        }
        if (signal?.aborted) throw new MediaUploadError('upload-aborted', 499)
        if (error instanceof MediaUploadError) throw error
        console.error('Media upload failed:', error)
        throw new MediaUploadError('upload-failed', 500)
    }
}

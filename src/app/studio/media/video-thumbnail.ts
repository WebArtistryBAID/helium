import 'server-only'

import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import crypto from 'node:crypto'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const ALLOWED_VIDEO_EXTENSIONS = new Set([ 'mp4', 'webm', 'mov', 'ogv' ])

export async function ensureVideoThumbnail(sha1: string, extension: string, force = false): Promise<void> {
    if (!/^[a-f0-9]{40}$/.test(sha1)) throw new Error('Invalid video hash')
    if (!ALLOWED_VIDEO_EXTENSIONS.has(extension)) throw new Error('Invalid video extension')

    const uploadPath = process.env.UPLOAD_PATH
    if (!uploadPath) throw new Error('UPLOAD_PATH is not configured')
    const thumbnailPath = path.join(uploadPath, `${sha1}_thumb.webp`)
    if (!force) {
        try {
            await fs.access(thumbnailPath)
            return
        } catch {
            // Generate the missing thumbnail below.
        }
    }

    const inputPath = path.join(uploadPath, `${sha1}.${extension}`)
    const temporaryId = crypto.randomUUID()
    const framePath = path.join(uploadPath, `${sha1}_frame_${temporaryId}.png`)
    const temporaryPath = path.join(uploadPath, `${sha1}_thumb_${temporaryId}.webp`)
    try {
        await execFileAsync(process.env.FFMPEG_PATH?.trim() || 'ffmpeg', [
            '-nostdin',
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-i', inputPath,
            '-frames:v', '1',
            '-vf', 'scale=300:200:force_original_aspect_ratio=decrease',
            framePath
        ], { timeout: 60_000, maxBuffer: 1024 * 1024 })
        await sharp(framePath).webp().toFile(temporaryPath)
        await fs.rename(temporaryPath, thumbnailPath)
    } finally {
        await fs.rm(framePath, { force: true })
        await fs.rm(temporaryPath, { force: true })
    }
}

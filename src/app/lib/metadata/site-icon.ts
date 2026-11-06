import 'server-only'

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getPublishedWebsiteLogo } from '@/app/lib/metadata/website-metadata.server'

const DEFAULT_ICON_PATH = path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'assets', 'icon.png')

function renderPng(source: Buffer | string, size: number): Promise<Buffer> {
    return sharp(source)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
}

async function renderIcon(sha1: string | undefined, size: number): Promise<Buffer> {
    if (sha1) {
        try {
            const file = path.join(/* turbopackIgnore: true */ process.env.UPLOAD_PATH!, `${sha1}.webp`)
            return await renderPng(await fs.readFile(/* turbopackIgnore: true */ file), size)
        } catch (error) {
            console.error('Failed to render website logo as an icon:', error)
        }
    }
    return renderPng(await fs.readFile(/* turbopackIgnore: true */ DEFAULT_ICON_PATH), size)
}

/** Wraps a PNG in a single-image ICO container, for crawlers that expect a real /favicon.ico. */
function wrapPngInIco(png: Buffer, size: number): Buffer {
    const header = Buffer.alloc(22)
    header.writeUInt16LE(1, 2) // Image type: icon
    header.writeUInt16LE(1, 4) // Image count
    header.writeUInt8(size, 6)
    header.writeUInt8(size, 7)
    header.writeUInt16LE(1, 10) // Color planes
    header.writeUInt16LE(32, 12) // Bits per pixel
    header.writeUInt32LE(png.length, 14)
    header.writeUInt32LE(header.length, 18)
    return Buffer.concat([ header, png ])
}

/** Serves the published logo (or the default icon) from a stable, unauthenticated URL. */
export async function siteIconResponse(request: Request, format: 'png' | 'ico', size: number): Promise<Response> {
    const logo = await getPublishedWebsiteLogo()
    const etag = `"${logo?.sha1 ?? 'default'}-${format}-${size}"`
    const headers = {
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        ETag: etag
    }
    if (request.headers.get('if-none-match') === etag) {
        return new Response(null, { status: 304, headers })
    }

    const png = await renderIcon(logo?.sha1, size)
    const body = format === 'ico' ? wrapPngInIco(png, size) : png
    return new Response(new Uint8Array(body), {
        headers: { ...headers, 'Content-Type': format === 'ico' ? 'image/x-icon' : 'image/png' }
    })
}

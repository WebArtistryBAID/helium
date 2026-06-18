import * as fs from 'fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import crypto from 'crypto'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'

function getPath(relative: string): string {
    return path.join(process.env.UPLOAD_PATH!, relative)
}

export async function POST(req: NextRequest): Promise<Response> {
    try {
        await fs.access(process.env.UPLOAD_PATH!)
    } catch {
        await fs.mkdir(process.env.UPLOAD_PATH!, { recursive: true })
    }
    try {
        await requireUserWithRole(Role.writer)
    } catch {
        return NextResponse.json({ error: 'no-permission' }, { status: 403 })
    }
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (file == null) {
        return NextResponse.json({ error: 'no-file' })
    }
    if (!file.type.includes('image/')) {
        return NextResponse.json({ error: 'not-image' })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const webpBuffer = await sharp(fileBuffer).webp().toBuffer()
    const thumbnailBuffer = await sharp(fileBuffer).resize(300, 200, {
        fit: 'inside',
        withoutEnlargement: true
    }).webp().toBuffer()
    const hash = crypto.createHash('sha1').update(webpBuffer).digest('hex')
    const outputPath = getPath(hash + '.webp')
    try {
        await fs.stat(outputPath)
        return NextResponse.json({ error: 'duplicate' })
    } catch {
    }

    await fs.writeFile(outputPath, webpBuffer)
    await fs.writeFile(getPath(hash + '_thumb.webp'), thumbnailBuffer)

    return NextResponse.json({ hash })
}

import * as fs from 'fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import crypto from 'crypto'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'

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
    let hash: string | null = null
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        if (file == null) return NextResponse.json({ error: 'no-file' })
        if (!file.type.includes('image/')) return NextResponse.json({ error: 'not-image' })

        req.signal.throwIfAborted()
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        const [ webpBuffer, thumbnailBuffer ] = await Promise.all([
            sharp(fileBuffer).webp().toBuffer(),
            sharp(fileBuffer).resize(300, 200, { fit: 'inside', withoutEnlargement: true }).webp().toBuffer()
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
        if (hash != null && req.signal.aborted) {
            await fs.rm(getPath(hash + '.webp'), { force: true })
            await fs.rm(getPath(hash + '_thumb.webp'), { force: true })
        }
        if (req.signal.aborted) return new Response(null, { status: 499 })
        console.error('Image upload failed:', error)
        return NextResponse.json({ error: 'upload-failed' }, { status: 500 })
    }
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/app/lib/prisma'
import { transferActor } from '@/app/lib/mcp/transfer-auth'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    if (!await transferActor(request)) return new Response(null, { status: 401 })
    const { id } = await context.params
    if (!/^[1-9]\d*$/.test(id)) return new Response(null, { status: 400 })
    const image = await prisma.image.findUnique({ where: { id: Number(id) } })
    if (!image || !/^[a-f0-9]{40}$/.test(image.sha1) || !/^(webp|png|jpg|jpeg|gif)$/.test(image.extension)) return new Response(null, { status: 404 })
    const file = path.join(/* turbopackIgnore: true */ process.env.UPLOAD_PATH!, `${image.sha1}.${image.extension}`)
    const size = (await fs.stat(/* turbopackIgnore: true */ file)).size
    if (size > 20 * 1024 * 1024) return new Response(null, { status: 413 })
    return new Response(new Uint8Array(await fs.readFile(/* turbopackIgnore: true */ file)), {
        headers: {
            'Content-Type': image.mimeType,
            'Content-Disposition': `attachment; filename="${image.sha1}.${image.extension}"`,
            'Cache-Control': 'no-store'
        }
    })
}

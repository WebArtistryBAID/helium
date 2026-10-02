import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { z } from 'zod'
import { Role, UserAuditLogType } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireActorUser } from '@/app/lib/services/actor'
import { getMedia, getUploadServePath } from '@/app/lib/services/media'
import { uploadMedia } from '@/app/lib/services/media-upload'
import { receiptedMutation } from '@/app/lib/services/mcp-mutations'
import { entityIdSchema, mutationSchema, type OperationActor } from '@/app/lib/mcp/contracts'

export const mediaSearchSchema = z.object({
    query: z.string().max(200).default(''), page: z.number().int().nonnegative().default(0),
    scope: z.enum([ 'all', 'mine' ]).default('all')
}).strict()
export const uploadImageSchema = mutationSchema.extend({
    name: z.string().min(1).max(200),
    altText: z.string().max(4000),
    mimeType: z.enum([ 'image/png', 'image/jpeg', 'image/webp', 'image/gif' ]),
    base64: z.string().min(4).max(28_000_000)
})
export const deleteImageSchema = mutationSchema.extend({
    imageId: entityIdSchema, expectedHash: z.string().regex(/^[a-f0-9]{40}$/),
    allowReferenced: z.boolean().default(false)
})

export async function searchMcpImages(actor: OperationActor, raw: unknown) {
    const input = mediaSearchSchema.parse(raw)
    return { ok: true, data: await getMedia(actor, input.page, [ 'image' ], input) }
}

export async function readMcpImage(actor: OperationActor, imageId: number) {
    await requireActorUser(actor, Role.writer)
    const image = await prisma.image.findUnique({ where: { id: imageId } })
    if (!image || image.mediaType !== 'image') throw new Error('Image does not exist')
    if (!/^[a-f0-9]{40}$/.test(image.sha1) || !/^(webp|png|jpg|jpeg|gif)$/.test(image.extension)) throw new Error('Invalid stored image format')
    const file = path.join(/* turbopackIgnore: true */ process.env.UPLOAD_PATH!, `${image.sha1}.${image.extension}`)
    const data = await sharp(file, { limitInputPixels: 40_000_000 }).resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true
    }).webp().toBuffer()
    return { image, data }
}

export async function uploadMcpImage(actor: OperationActor, raw: unknown) {
    await requireActorUser(actor, Role.writer)
    const input = uploadImageSchema.parse(raw)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64)) throw new Error('Invalid base64 image')
    const buffer = Buffer.from(input.base64, 'base64')
    if (buffer.length > 20 * 1024 * 1024) throw new Error('Image exceeds 20 MiB')
    const decoded = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata()
    const imageFormats: Record<string, string> = {
        png: 'image/png',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif'
    }
    const actualMime = imageFormats[decoded.format ?? '']
    if (actualMime !== input.mimeType) throw new Error('Image bytes must match the supplied format')
    return receiptedMutation(actor, 'upload_image', input, async tx => {
        const uploaded = await uploadMedia(actor, new File([ new Uint8Array(buffer) ], input.name, { type: input.mimeType }))
        const existing = await tx.image.findUnique({ where: { sha1: uploaded.hash } })
        if (existing) return { ok: true, data: existing, reused: true }
        const metadata = await sharp(path.join(/* turbopackIgnore: true */ process.env.UPLOAD_PATH!, `${uploaded.hash}.webp`)).metadata()
        const image = await tx.image.create({
            data: {
                name: input.name,
                altText: input.altText,
                sha1: uploaded.hash,
                mediaType: 'image',
                extension: 'webp',
                mimeType: 'image/webp',
                width: metadata.width ?? 0,
                height: metadata.height ?? 0,
                sizeKB: Math.ceil((metadata.size ?? buffer.length) / 1024),
                uploaderId: actor.userId
            }
        })
        await tx.userAuditLog.create({
            data: {
                userId: actor.userId,
                type: UserAuditLogType.uploadImage,
                values: [ String(image.id), image.sha1 ]
            }
        })
        return { ok: true, data: image }
    })
}

export async function deleteMcpImage(actor: OperationActor, raw: unknown) {
    await requireActorUser(actor, Role.writer)
    const input = deleteImageSchema.parse(raw)
    const result = await receiptedMutation(actor, 'delete_image', input, async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Image" WHERE "id" = ${input.imageId} FOR UPDATE`
        const image = await tx.image.findUnique({ where: { id: input.imageId } })
        if (!image) return { ok: false, error: { code: 'not_found', message: 'Image does not exist.' } }
        if (image.sha1 !== input.expectedHash) return {
            ok: false,
            error: { code: 'conflict', message: 'Fetch the current image.' }
        }
        const candidates = await tx.contentEntity.findMany({
            select: {
                id: true,
                titleDraftEN: true,
                coverImageDraftId: true,
                coverImagePublishedId: true,
                contentDraftEN: true,
                contentDraftZH: true,
                contentPublishedEN: true,
                contentPublishedZH: true
            }
        })
        const references = candidates.filter(entity => entity.coverImageDraftId === image.id || entity.coverImagePublishedId === image.id ||
            [ entity.contentDraftEN, entity.contentDraftZH, entity.contentPublishedEN, entity.contentPublishedZH ].some(body => {
                if (!body) return false
                return new RegExp(`(?:"(?:imageId|image)"\\s*:\\s*${image.id}(?:\\D|$)|\\[IMAGE: ?${image.id}\\])`).test(body) || body.includes(image.sha1)
            })).map(entity => ({ entityId: entity.id, title: entity.titleDraftEN }))
        if (references.length && !input.allowReferenced) return {
            ok: false,
            error: {
                code: 'conflict',
                message: 'Image references require allowReferenced to follow the Studio deletion policy.',
                references
            }
        }
        await tx.image.delete({ where: { id: image.id } })
        await tx.userAuditLog.create({
            data: {
                userId: actor.userId,
                type: UserAuditLogType.deleteImage,
                values: [ String(image.id), image.sha1 ]
            }
        })
        return { ok: true, data: { imageId: image.id, hash: image.sha1, extension: image.extension, references } }
    })
    if (result.ok === true) {
        const data = result.data as { hash: string; extension: string }
        if (!await prisma.image.findUnique({ where: { sha1: data.hash } })) await Promise.allSettled([ fs.rm(path.join(/* turbopackIgnore: true */ process.env.UPLOAD_PATH!, `${data.hash}.${data.extension}`), { force: true }),
            fs.rm(path.join(/* turbopackIgnore: true */ process.env.UPLOAD_PATH!, `${data.hash}_thumb.webp`), { force: true }) ])
    }
    return result
}

export async function mediaTransferInfo(actor: OperationActor, imageId: number) {
    await requireActorUser(actor, Role.writer)
    const image = await prisma.image.findUnique({ where: { id: imageId } })
    return image ? {
        ok: true, data: {
            ...image, downloadPath: `/mcp/transfers/images/${image.id}`,
            publicPath: `${await getUploadServePath()}/${image.sha1}.${image.extension}`
        }
    } : { ok: false, error: { code: 'not_found', message: 'Image does not exist.' } }
}

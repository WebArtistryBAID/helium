'use server'

import { Image, Role, UserAuditLogType } from '@/generated/prisma/client'
import { requireUser, requireUserWithRole } from '@/app/login/login-actions'
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { Paginated } from '@/app/lib/data-types'
import { prisma } from '@/app/lib/prisma'
import { ensureVideoThumbnail } from '@/app/studio/media/video-thumbnail'

const PAGE_SIZE = 24

export type ImagePage = Paginated<Image> & {
    uploadServePath: string
}

export type MediaType = 'image' | 'video'

export async function getUploadServePath(): Promise<string> {
    const configuredPath = process.env.UPLOAD_SERVE_PATH?.trim()
    if (configuredPath == null || configuredPath === '') return '/uploads'
    return configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`
}

export async function getImage(id: number): Promise<Image | null> {
    return prisma.image.findUnique({
        where: { id }
    })
}

export async function getMedia(page: number, mediaTypes: MediaType[] = [ 'image', 'video' ]): Promise<ImagePage> {
    await requireUser()
    const where = { mediaType: { in: mediaTypes } }
    const [ count, images ] = await Promise.all([
        prisma.image.count({ where }),
        prisma.image.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: page * PAGE_SIZE,
            take: PAGE_SIZE
        })
    ])
    await Promise.all(images.filter(image => image.mediaType === 'video').map(async video => {
        try {
            await ensureVideoThumbnail(video.sha1, video.extension)
        } catch (error) {
            console.error(`Failed to generate thumbnail for video ${video.id}`, error)
        }
    }))
    return {
        items: images,
        page,
        pages: Math.ceil(count / PAGE_SIZE),
        uploadServePath: await getUploadServePath()
    }
}

export async function getImages(page: number): Promise<ImagePage> {
    return getMedia(page, [ 'image' ])
}

export async function searchImages(query: string, page: number): Promise<ImagePage> {
    await requireUser()
    const where = {
        mediaType: 'image',
        name: {
            contains: query,
            mode: 'insensitive' as const
        }
    }
    const [ count, images ] = await Promise.all([
        prisma.image.count({ where }),
        prisma.image.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: page * PAGE_SIZE,
            take: PAGE_SIZE
        })
    ])
    return {
        items: images,
        page,
        pages: Math.ceil(count / PAGE_SIZE),
        uploadServePath: await getUploadServePath()
    }
}

export async function createImage(data: {
    name: string
    altText: string
    sha1: string
}): Promise<Image> {
    const user = await requireUserWithRole(Role.writer)
    if (!/^[a-f0-9]{40}$/.test(data.sha1)) throw new Error('Invalid image hash')
    const metadata = await sharp(await fs.readFile(path.join(process.env.UPLOAD_PATH!, data.sha1 + '.webp'))).metadata()

    return prisma.$transaction(async tx => {
        const image = await tx.image.create({
            data: {
                name: data.name,
                altText: data.altText,
                sha1: data.sha1,
                mediaType: 'image',
                extension: 'webp',
                mimeType: 'image/webp',
                width: metadata.width,
                height: metadata.height,
                sizeKB: Math.ceil((metadata.size ?? 0) / 1024),
                uploaderId: user.id
            }
        })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.uploadImage,
                userId: user.id,
                values: [ image.id.toString(), data.sha1 ]
            }
        })
        return image
    })
}

export async function createMedia(data: {
    name: string
    altText: string
    sha1: string
    mediaType: MediaType
    extension: string
    mimeType: string
}): Promise<Image> {
    if (data.mediaType === 'image') {
        return createImage({ name: data.name, altText: data.altText, sha1: data.sha1 })
    }

    const user = await requireUserWithRole(Role.writer)
    if (!/^[a-f0-9]{40}$/.test(data.sha1)) throw new Error('Invalid media hash')
    const allowedVideos = new Map([
        [ 'mp4', 'video/mp4' ],
        [ 'webm', 'video/webm' ],
        [ 'mov', 'video/quicktime' ],
        [ 'ogv', 'video/ogg' ]
    ])
    if (allowedVideos.get(data.extension) !== data.mimeType) throw new Error('Invalid video format')
    const mediaPath = path.join(process.env.UPLOAD_PATH!, `${data.sha1}.${data.extension}`)
    const stats = await fs.stat(mediaPath)

    return prisma.$transaction(async tx => {
        const media = await tx.image.create({
            data: {
                name: data.name,
                altText: data.altText,
                sha1: data.sha1,
                mediaType: 'video',
                extension: data.extension,
                mimeType: data.mimeType,
                width: 0,
                height: 0,
                sizeKB: Math.ceil(stats.size / 1024),
                uploaderId: user.id
            }
        })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.uploadImage,
                userId: user.id,
                values: [ media.id.toString(), data.sha1, 'video' ]
            }
        })
        return media
    })
}

export async function deletePendingImageUpload(sha1: string, extension = 'webp'): Promise<void> {
    await requireUserWithRole(Role.writer)
    if (!/^[a-f0-9]{40}$/.test(sha1)) throw new Error('Invalid media hash')
    const image = await prisma.image.findUnique({ where: { sha1 }, select: { id: true } })
    if (image != null) throw new Error('Media is already in the media library')
    if (!/^(webp|mp4|webm|mov|ogv)$/.test(extension)) throw new Error('Invalid media extension')
    await fs.rm(path.join(process.env.UPLOAD_PATH!, `${sha1}.${extension}`), { force: true })
    await fs.rm(path.join(process.env.UPLOAD_PATH!, `${sha1}_thumb.webp`), { force: true })
}

export async function deleteImage(id: number): Promise<void> {
    const user = await requireUserWithRole(Role.writer)
    const image = await prisma.image.findUniqueOrThrow({
        where: { id }
    })
    await prisma.$transaction(async tx => {
        await tx.image.delete({ where: { id } })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.deleteImage,
                userId: user.id,
                values: [ id.toString(), image.sha1 ]
            }
        })
    })
    const cleanupResults = await Promise.allSettled([
        fs.rm(path.join(process.env.UPLOAD_PATH!, `${image.sha1}.${image.extension}`), { force: true }),
        fs.rm(path.join(process.env.UPLOAD_PATH!, image.sha1 + '_thumb.webp'), { force: true })
    ])
    for (const result of cleanupResults) {
        if (result.status === 'rejected') console.error('Failed to remove image files', result.reason)
    }
}

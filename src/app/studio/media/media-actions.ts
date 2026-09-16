'use server'

import { Image, Role, UserAuditLogType } from '@/generated/prisma/client'
import { requireUser, requireUserWithRole } from '@/app/login/login-actions'
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { Paginated } from '@/app/lib/data-types'
import { prisma } from '@/app/lib/prisma'

const PAGE_SIZE = 24

export type ImagePage = Paginated<Image> & {
    uploadServePath: string
}

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

export async function getImages(page: number): Promise<ImagePage> {
    await requireUser()
    const [ count, images ] = await Promise.all([
        prisma.image.count(),
        prisma.image.findMany({
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

export async function searchImages(query: string, page: number): Promise<ImagePage> {
    await requireUser()
    const where = {
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
    const metadata = await sharp(await fs.readFile(path.join(process.env.UPLOAD_PATH!, data.sha1 + '.webp'))).metadata()

    const image = await prisma.image.create({
        data: {
            name: data.name,
            altText: data.altText,
            sha1: data.sha1,
            width: metadata.width,
            height: metadata.height,
            sizeKB: Math.ceil((metadata.size ?? 0) / 1024),
            uploaderId: user.id
        }
    })
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.uploadImage,
            userId: user.id,
            values: [image.id.toString(), data.sha1]
        }
    })
    return image
}

export async function deletePendingImageUpload(sha1: string): Promise<void> {
    await requireUserWithRole(Role.writer)
    if (!/^[a-f0-9]{40}$/.test(sha1)) throw new Error('Invalid image hash')
    const image = await prisma.image.findUnique({ where: { sha1 }, select: { id: true } })
    if (image != null) throw new Error('Image is already in the media library')
    await fs.rm(path.join(process.env.UPLOAD_PATH!, `${sha1}.webp`), { force: true })
    await fs.rm(path.join(process.env.UPLOAD_PATH!, `${sha1}_thumb.webp`), { force: true })
}

export async function deleteImage(id: number): Promise<void> {
    const user = await requireUserWithRole(Role.writer)
    const image = await prisma.image.findUniqueOrThrow({
        where: { id }
    })
    await fs.rm(path.join(process.env.UPLOAD_PATH!, image.sha1 + '.webp'), { force: true })
    await fs.rm(path.join(process.env.UPLOAD_PATH!, image.sha1 + '_thumb.webp'), { force: true })
    await prisma.image.delete({ where: { id } })
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.deleteImage,
            userId: user.id,
            values: [id.toString(), image.sha1]
        }
    })
}

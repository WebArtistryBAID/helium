'use server'

import { Image, Role, UserAuditLogType } from '@/generated/prisma/client'
import { requireUser, requireUserWithRole } from '@/app/login/login-actions'
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { Paginated } from '@/app/lib/data-types'
import { prisma } from '@/app/lib/prisma'

const PAGE_SIZE = 24

export async function getUploadServePath(): Promise<string> {
    return process.env.UPLOAD_SERVE_PATH!
}

export async function getImage(id: number): Promise<Image | null> {
    return prisma.image.findUnique({
        where: { id }
    })
}

export async function getImages(page: number): Promise<Paginated<Image>> {
    await requireUser()
    const pages = Math.ceil(await prisma.image.count() / PAGE_SIZE)
    const images = await prisma.image.findMany({
        orderBy: { createdAt: 'desc' },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE
    })
    return {
        items: images,
        page,
        pages
    }
}

export async function searchImages(query: string, page: number): Promise<Paginated<Image>> {
    await requireUser()
    const pages = Math.ceil(await prisma.image.count({
        where: {
            name: {
                contains: query,
                mode: 'insensitive'
            }
        }
    }) / PAGE_SIZE)
    const images = await prisma.image.findMany({
        where: {
            name: {
                contains: query,
                mode: 'insensitive'
            }
        },
        orderBy: { createdAt: 'desc' },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE
    })
    return {
        items: images,
        page,
        pages
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

export async function deleteImage(id: number): Promise<void> {
    const user = await requireUserWithRole(Role.writer)
    const image = await prisma.image.delete({
        where: { id }
    })
    await prisma.userAuditLog.create({
        data: {
            type: UserAuditLogType.deleteImage,
            userId: user.id,
            values: [id.toString(), image.sha1]
        }
    })
}

'use server'

import type { ImagePage, MediaType, MediaScope, MediaFilters } from '@/app/lib/services/media'

export type { ImagePage, MediaType, MediaScope, MediaFilters } from '@/app/lib/services/media'

import { Image } from '@/generated/prisma/client'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/media'

export async function getUploadServePath(): Promise<string> {
    return services.getUploadServePath()
}

export async function getImage(id: number): Promise<Image | null> {
    return services.getImage(id)
}

export async function updateImageFocus(id: number, focus: {
    focusX: number; focusY: number; focusSize: number
}): Promise<Image> {
    return services.updateImageFocus(await getStudioActor(), id, focus)
}

export async function getMedia(page: number, mediaTypes: MediaType[] = [ 'image', 'video' ],
                               filters: MediaFilters = {}): Promise<ImagePage> {
    return services.getMedia(await getStudioActor(), page, mediaTypes, filters)
}

export async function getImages(page: number): Promise<ImagePage> {
    return services.getImages(await getStudioActor(), page)
}

export async function searchImages(query: string, page: number): Promise<ImagePage> {
    return services.searchImages(await getStudioActor(), query, page)
}

export async function createImage(data: {
    name: string
    altText: string
    sha1: string
}): Promise<Image> {
    return services.createImage(await getStudioActor(), data)
}

export async function createMedia(data: {
    name: string
    altText: string
    sha1: string
    mediaType: MediaType
    extension: string
    mimeType: string
}): Promise<Image> {
    return services.createMedia(await getStudioActor(), data)
}

export async function deletePendingImageUpload(sha1: string, extension = 'webp'): Promise<void> {
    return services.deletePendingImageUpload(await getStudioActor(), sha1, extension)
}

export async function deleteImage(id: number): Promise<void> {
    return services.deleteImage(await getStudioActor(), id)
}

'use server'

import { EntityType } from '@/generated/prisma/client'
import { HydratedContentEntity, Paginated, PublicContentEntity, SimplifiedContentEntity } from '@/app/lib/data-types'

import { AlignEntityResponse } from '@/app/studio/editor/entity-types'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/entities'

export async function getRecentEntities(type: EntityType): Promise<SimplifiedContentEntity[]> {
    return services.getRecentEntities(await getStudioActor(), type)
}

export async function getMyPendingApprovals(): Promise<SimplifiedContentEntity[]> {
    return services.getMyPendingApprovals(await getStudioActor())
}

export async function getAllPublishedCourses(): Promise<SimplifiedContentEntity[]> {
    return services.getAllPublishedCourses()
}

export async function getContentEntityBySlug(slug: string): Promise<PublicContentEntity | null> {
    return services.getContentEntityBySlug(slug)
}

export async function getPublishedContentEntity(id: number): Promise<PublicContentEntity | null> {
    return services.getPublishedContentEntity(id)
}

export async function getPublishedProjectsByCategory(page: number, category: string): Promise<Paginated<SimplifiedContentEntity>> {
    return services.getPublishedProjectsByCategory(page, category)
}

export async function getPublishedProjectsByCategoriesForInit(): Promise<{
    categoryEN: string,
    categoryZH: string,
    projects: Paginated<SimplifiedContentEntity>
}[]> {
    return services.getPublishedProjectsByCategoriesForInit()
}

export async function getAllPublishedContentEntities(): Promise<SimplifiedContentEntity[]> {
    return services.getAllPublishedContentEntities()
}

export async function getPublishedContentEntities(page: number, type: EntityType, query: string | undefined = undefined, category: string | undefined = undefined, pageSize?: number): Promise<Paginated<SimplifiedContentEntity>> {
    return services.getPublishedContentEntities(page, type, query, category, pageSize)
}

export async function getContentEntities(page: number, type: EntityType, query: string | undefined = undefined): Promise<Paginated<SimplifiedContentEntity>> {
    return services.getContentEntities(await getStudioActor(), page, type, query)
}

export async function getContentEntity(id: number): Promise<HydratedContentEntity | null> {
    return services.getContentEntity(await getStudioActor(), id)
}

export async function unpublishContentEntity(id: number): Promise<void> {
    return services.unpublishContentEntity(await getStudioActor(), id)
}

export async function restoreContentEntityDraftFromPublished(id: number): Promise<HydratedContentEntity> {
    return services.restoreContentEntityDraftFromPublished(await getStudioActor(), id)
}

export async function alignContentEntity(id: number): Promise<AlignEntityResponse> {
    return services.alignContentEntity(await getStudioActor(), id)
}

export async function deleteContentEntity(id: number): Promise<void> {
    return services.deleteContentEntity(await getStudioActor(), id)
}

export async function createContentEntity(type: EntityType, titleEN: string, titleZH: string): Promise<SimplifiedContentEntity> {
    return services.createContentEntity(await getStudioActor(), type, titleEN, titleZH)
}

export async function updateContentEntity(data: {
    id: number
    slug: string | undefined
    categoryEN: string | null | undefined,
    categoryZH: string | null | undefined,
    createdAt: Date | string | undefined
    titleDraftEN: string | undefined
    titleDraftZH: string | undefined
    shortContentDraftEN: string | null | undefined
    shortContentDraftZH: string | null | undefined
    contentDraftEN: string | undefined
    contentDraftZH: string | undefined
    coverImageDraftId: number | null | undefined
    transparentNavbarDraft: boolean | undefined
}): Promise<HydratedContentEntity> {
    return services.updateContentEntity(await getStudioActor(), data)
}

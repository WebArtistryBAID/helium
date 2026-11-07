import 'server-only'

import { prisma } from '@/app/lib/prisma'
import { requireActorUser } from '@/app/lib/services/actor'
import { Role } from '@/generated/prisma/client'
import type { OperationActor } from '@/app/lib/mcp/contracts'
import { DEFAULT_COLLECTION_ICON, DEFAULT_TAG_ICON, isTaxonomyIconKey } from '@/app/lib/media-taxonomy-icons'

const NAME_MAX_LENGTH = 60
const DESCRIPTION_MAX_LENGTH = 500
const MAX_IMAGES_PER_REQUEST = 500
const DEFAULT_TAG_COLOR = '#3b82f6'
const DEFAULT_COLLECTION_COLOR = '#6366f1'
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export type TagSummary = {
    id: number
    name: string
    color: string
    icon: string | null
    imageCount: number
}

export type CollectionSummary = {
    id: number
    name: string
    color: string
    icon: string | null
    description: string | null
    parentId: number | null
    imageCount: number
    childCount: number
}

export type CollectionLinkSummary = {
    id: number
    fromId: number
    toId: number
    label: string | null
}

export type MediaTaxonomy = {
    tags: TagSummary[]
    collections: CollectionSummary[]
    links: CollectionLinkSummary[]
}

export type CollectionRef = {
    id: number
    name: string
    color: string
    icon: string | null
}

function isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error
        && (error as { code?: unknown }).code === 'P2002'
}

function asRecord(input: unknown): Record<string, unknown> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error('请求参数格式不正确')
    }
    return input as Record<string, unknown>
}

function readId(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`无效的${label}`)
    }
    return value
}

function readIdList(value: unknown, label: string): number[] {
    if (!Array.isArray(value) || value.length === 0) throw new Error(`请选择${label}`)
    if (value.length > MAX_IMAGES_PER_REQUEST) throw new Error(`一次最多处理 ${MAX_IMAGES_PER_REQUEST} 项`)
    return [ ...new Set(value.map(item => readId(item, label))) ]
}

function readName(input: Record<string, unknown>, label: string): string {
    const value = input.name
    if (typeof value !== 'string') throw new Error(`请填写${label}名称`)
    const name = value.trim()
    if (name.length === 0) throw new Error(`请填写${label}名称`)
    if (name.length > NAME_MAX_LENGTH) throw new Error(`${label}名称不能超过 ${NAME_MAX_LENGTH} 个字符`)
    return name
}

function readColor(input: Record<string, unknown>, fallback: string): string {
    const value = input.color
    if (value == null || value === '') return fallback
    if (typeof value !== 'string' || !COLOR_PATTERN.test(value.trim())) {
        throw new Error('颜色格式不正确，应为 #RRGGBB')
    }
    return value.trim().toLowerCase()
}

function readIcon(input: Record<string, unknown>): string | null | undefined {
    if (!('icon' in input)) return undefined
    const value = input.icon
    if (value == null || value === '') return null
    if (!isTaxonomyIconKey(value)) throw new Error('图标不在可选范围内')
    return value
}

function readDescription(input: Record<string, unknown>): string | null {
    const value = input.description
    if (value == null || value === '') return null
    if (typeof value !== 'string') throw new Error('主题描述格式不正确')
    const description = value.trim()
    if (description.length === 0) return null
    if (description.length > DESCRIPTION_MAX_LENGTH) {
        throw new Error(`主题描述不能超过 ${DESCRIPTION_MAX_LENGTH} 个字符`)
    }
    return description
}

function readOptionalParentId(input: Record<string, unknown>): number | null | undefined {
    if (!('parentId' in input)) return undefined
    const value = input.parentId
    if (value == null) return null
    return readId(value, '上级主题')
}

function toTagSummary(tag: {
    id: number; name: string; color: string; icon: string | null
    _count: { images: number }
}): TagSummary {
    return {
        id: tag.id, name: tag.name, color: tag.color, icon: tag.icon, imageCount: tag._count.images
    }
}

function toCollectionSummary(collection: {
    id: number; name: string; color: string; icon: string | null; description: string | null
    parentId: number | null; _count: { images: number; children: number }
}): CollectionSummary {
    return {
        id: collection.id, name: collection.name, color: collection.color, icon: collection.icon,
        description: collection.description, parentId: collection.parentId,
        imageCount: collection._count.images, childCount: collection._count.children
    }
}

const TAG_SUMMARY_INCLUDE = {
    _count: { select: { images: true } }
} as const

const COLLECTION_SUMMARY_INCLUDE = {
    _count: { select: { images: true, children: true } }
} as const

/** Loads every tag, collection, and collection link for the Studio taxonomy pickers. */
export async function getMediaTaxonomy(actor: OperationActor): Promise<MediaTaxonomy> {
    await requireActorUser(actor, Role.writer)
    const [ tags, collections, links ] = await Promise.all([
        prisma.tag.findMany({ orderBy: { name: 'asc' }, include: TAG_SUMMARY_INCLUDE }),
        prisma.mediaCollection.findMany({ orderBy: { name: 'asc' }, include: COLLECTION_SUMMARY_INCLUDE }),
        prisma.mediaCollectionLink.findMany({ orderBy: { createdAt: 'asc' } })
    ])
    return {
        tags: tags.map(toTagSummary),
        collections: collections.map(toCollectionSummary),
        links: links.map(link => ({ id: link.id, fromId: link.fromId, toId: link.toId, label: link.label }))
    }
}

/** Resolves a collection and all of its descendants, used by media filters. */
export async function getCollectionSubtreeIds(collectionId: number): Promise<number[]> {
    if (!Number.isSafeInteger(collectionId) || collectionId <= 0) return []
    const collections = await prisma.mediaCollection.findMany({ select: { id: true, parentId: true } })
    const childrenByParent = new Map<number | null, number[]>()
    for (const collection of collections) {
        const siblings = childrenByParent.get(collection.parentId) ?? []
        siblings.push(collection.id)
        childrenByParent.set(collection.parentId, siblings)
    }
    const visited = new Set<number>()
    const stack = [ collectionId ]
    while (stack.length > 0) {
        const id = stack.pop()!
        if (visited.has(id)) continue
        visited.add(id)
        stack.push(...(childrenByParent.get(id) ?? []))
    }
    return [ ...visited ]
}

export async function createTag(actor: OperationActor, input: unknown): Promise<TagSummary> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const name = readName(record, '标签')
    const color = readColor(record, DEFAULT_TAG_COLOR)
    const icon = readIcon(record) ?? DEFAULT_TAG_ICON
    const duplicate = await prisma.tag.findUnique({ where: { name }, select: { id: true } })
    if (duplicate != null) throw new Error('已存在同名标签')
    try {
        const tag = await prisma.tag.create({
            data: { name, color, icon },
            include: TAG_SUMMARY_INCLUDE
        })
        return toTagSummary(tag)
    } catch (error) {
        if (isUniqueViolation(error)) throw new Error('已存在同名标签')
        throw error
    }
}

export async function updateTag(actor: OperationActor, input: unknown): Promise<TagSummary> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const id = readId(record.id, '标签')
    const existing = await prisma.tag.findUnique({ where: { id }, select: { id: true, name: true } })
    if (existing == null) throw new Error('标签不存在')
    const data: { name?: string; color?: string; icon?: string | null } = {}
    if ('name' in record) data.name = readName(record, '标签')
    if ('color' in record) data.color = readColor(record, DEFAULT_TAG_COLOR)
    data.icon = readIcon(record)
    if (data.name != null && data.name !== existing.name) {
        const duplicate = await prisma.tag.findUnique({ where: { name: data.name }, select: { id: true } })
        if (duplicate != null && duplicate.id !== id) throw new Error('已存在同名标签')
    }
    try {
        const tag = await prisma.tag.update({ where: { id }, data, include: TAG_SUMMARY_INCLUDE })
        return toTagSummary(tag)
    } catch (error) {
        if (isUniqueViolation(error)) throw new Error('已存在同名标签')
        throw error
    }
}

export async function deleteTag(actor: OperationActor, tagId: number): Promise<void> {
    await requireActorUser(actor, Role.writer)
    const id = readId(tagId, '标签')
    await prisma.tag.delete({ where: { id } }).catch(error => {
        if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2025') {
            throw new Error('标签不存在')
        }
        throw error
    })
}

export async function addTagsToImages(actor: OperationActor, input: unknown): Promise<TagSummary[]> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const imageIds = readIdList(record.imageIds, '媒体')
    const tagIds = readIdList(record.tagIds, '标签')
    const [ imageCount, tagCount ] = await Promise.all([
        prisma.image.count({ where: { id: { in: imageIds } } }),
        prisma.tag.count({ where: { id: { in: tagIds } } })
    ])
    if (imageCount !== imageIds.length) throw new Error('部分媒体不存在')
    if (tagCount !== tagIds.length) throw new Error('部分标签不存在')
    await prisma.$transaction(tagIds.map(tagId => prisma.tag.update({
        where: { id: tagId },
        data: { images: { connect: imageIds.map(id => ({ id })) } }
    })))
    const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } }, include: TAG_SUMMARY_INCLUDE })
    return tags.map(toTagSummary)
}

export async function removeTagsFromImages(actor: OperationActor, input: unknown): Promise<TagSummary[]> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const imageIds = readIdList(record.imageIds, '媒体')
    const tagIds = readIdList(record.tagIds, '标签')
    await prisma.$transaction(tagIds.map(tagId => prisma.tag.update({
        where: { id: tagId },
        data: { images: { disconnect: imageIds.map(id => ({ id })) } }
    })))
    const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } }, include: TAG_SUMMARY_INCLUDE })
    return tags.map(toTagSummary)
}

export async function createCollection(actor: OperationActor, input: unknown): Promise<CollectionSummary> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const name = readName(record, '主题')
    const color = readColor(record, DEFAULT_COLLECTION_COLOR)
    const icon = readIcon(record) ?? DEFAULT_COLLECTION_ICON
    const description = readDescription(record)
    const parentId = readOptionalParentId(record) ?? null
    if (parentId != null) await assertCollectionExists(parentId)
    await assertSiblingNameAvailable(name, parentId, null)
    const collection = await prisma.mediaCollection.create({
        data: { name, color, icon, description, parentId },
        include: COLLECTION_SUMMARY_INCLUDE
    })
    return toCollectionSummary(collection)
}

export async function updateCollection(actor: OperationActor, input: unknown): Promise<CollectionSummary> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const id = readId(record.id, '主题')
    const existing = await prisma.mediaCollection.findUnique({
        where: { id }, select: { id: true, name: true, parentId: true }
    })
    if (existing == null) throw new Error('主题不存在')
    const data: {
        name?: string; color?: string; icon?: string | null; description?: string | null
        parentId?: number | null
    } = {}
    if ('name' in record) data.name = readName(record, '主题')
    if ('color' in record) data.color = readColor(record, DEFAULT_COLLECTION_COLOR)
    data.icon = readIcon(record)
    if ('description' in record) data.description = readDescription(record)
    const parentId = readOptionalParentId(record)
    if (parentId !== undefined) {
        if (parentId === id) throw new Error('主题不能作为自己的上级主题')
        if (parentId != null) {
            await assertCollectionExists(parentId)
            await assertNoCycle(id, parentId)
        }
        data.parentId = parentId
    }
    const effectiveParentId = data.parentId !== undefined ? data.parentId : existing.parentId
    const effectiveName = data.name ?? existing.name
    await assertSiblingNameAvailable(effectiveName, effectiveParentId, id)
    const collection = await prisma.mediaCollection.update({
        where: { id }, data, include: COLLECTION_SUMMARY_INCLUDE
    })
    return toCollectionSummary(collection)
}

/** Deletes a collection and all of its descendants. Images are never deleted. */
export async function deleteCollection(actor: OperationActor, collectionId: number): Promise<{ deleted: number }> {
    await requireActorUser(actor, Role.writer)
    const id = readId(collectionId, '主题')
    const descendants = await getCollectionSubtreeIds(id)
    if (descendants.length === 1) {
        const exists = await prisma.mediaCollection.findUnique({ where: { id }, select: { id: true } })
        if (exists == null) throw new Error('主题不存在')
    }
    const result = await prisma.mediaCollection.deleteMany({ where: { id: { in: descendants } } })
    return { deleted: result.count }
}

export async function addImagesToCollection(actor: OperationActor, input: unknown): Promise<CollectionSummary> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const collectionId = readId(record.collectionId, '主题')
    const imageIds = readIdList(record.imageIds, '媒体')
    await assertCollectionExists(collectionId)
    const imageCount = await prisma.image.count({ where: { id: { in: imageIds } } })
    if (imageCount !== imageIds.length) throw new Error('部分媒体不存在')
    const collection = await prisma.mediaCollection.update({
        where: { id: collectionId },
        data: { images: { connect: imageIds.map(id => ({ id })) } },
        include: COLLECTION_SUMMARY_INCLUDE
    })
    return toCollectionSummary(collection)
}

export async function removeImageFromCollection(actor: OperationActor, input: unknown): Promise<CollectionSummary> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const collectionId = readId(record.collectionId, '主题')
    const imageId = readId(record.imageId, '媒体')
    const collection = await prisma.mediaCollection.update({
        where: { id: collectionId },
        data: { images: { disconnect: { id: imageId } } },
        include: COLLECTION_SUMMARY_INCLUDE
    })
    return toCollectionSummary(collection)
}

export async function createCollectionLink(actor: OperationActor, input: unknown): Promise<CollectionLinkSummary> {
    await requireActorUser(actor, Role.writer)
    const record = asRecord(input)
    const fromId = readId(record.fromId, '主题')
    const toId = readId(record.toId, '关联主题')
    if (fromId === toId) throw new Error('主题不能关联到自身')
    await Promise.all([ assertCollectionExists(fromId), assertCollectionExists(toId) ])
    const duplicate = await prisma.mediaCollectionLink.findFirst({
        where: {
            OR: [
                { fromId, toId },
                { fromId: toId, toId: fromId }
            ]
        },
        select: { id: true }
    })
    if (duplicate != null) throw new Error('这两个主题已经关联')
    const label = record.label == null || record.label === ''
        ? null
        : readLinkLabel(record.label)
    try {
        const link = await prisma.mediaCollectionLink.create({ data: { fromId, toId, label } })
        return { id: link.id, fromId: link.fromId, toId: link.toId, label: link.label }
    } catch (error) {
        if (isUniqueViolation(error)) throw new Error('这两个主题已经关联')
        throw error
    }
}

export async function deleteCollectionLink(actor: OperationActor, linkId: number): Promise<void> {
    await requireActorUser(actor, Role.writer)
    const id = readId(linkId, '关联')
    await prisma.mediaCollectionLink.delete({ where: { id } }).catch(error => {
        if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2025') {
            throw new Error('关联不存在')
        }
        throw error
    })
}

function readLinkLabel(value: unknown): string {
    if (typeof value !== 'string') throw new Error('关联说明格式不正确')
    const label = value.trim()
    if (label.length > 80) throw new Error('关联说明不能超过 80 个字符')
    return label
}

async function assertCollectionExists(collectionId: number): Promise<void> {
    const collection = await prisma.mediaCollection.findUnique({
        where: { id: collectionId }, select: { id: true }
    })
    if (collection == null) throw new Error('主题不存在')
}

async function assertSiblingNameAvailable(
    name: string, parentId: number | null, excludeId: number | null
): Promise<void> {
    const sibling = await prisma.mediaCollection.findFirst({
        where: {
            parentId,
            name,
            ...(excludeId != null ? { id: { not: excludeId } } : {})
        },
        select: { id: true }
    })
    if (sibling != null) throw new Error('同一层级下已存在同名主题')
}

async function assertNoCycle(collectionId: number, nextParentId: number): Promise<void> {
    const collections = await prisma.mediaCollection.findMany({ select: { id: true, parentId: true } })
    const parentById = new Map(collections.map(collection => [ collection.id, collection.parentId ]))
    const visited = new Set<number>()
    let cursor: number | null = nextParentId
    while (cursor != null && !visited.has(cursor)) {
        if (cursor === collectionId) throw new Error('不能把主题移动到自己的子主题下')
        visited.add(cursor)
        cursor = parentById.get(cursor) ?? null
    }
}

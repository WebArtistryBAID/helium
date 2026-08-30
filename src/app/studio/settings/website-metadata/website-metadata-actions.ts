'use server'

import { EntityType, Role, UserAuditLogType } from '@/generated/prisma/client'
import { HYDRATED_CONTENT_ENTITY_SELECT } from '@/app/lib/data-types'
import { requireUser, requireUserWithRole } from '@/app/login/login-actions'
import { prisma } from '@/app/lib/prisma'
import { ensureWebsiteMetadataEntity } from '@/app/lib/website-metadata.server'
import {
    normalizeWebsiteMetadataContent,
    parseWebsiteMetadataContent,
    serializeWebsiteMetadataContent,
    WEBSITE_METADATA_ENTITY_TITLE_EN,
    WEBSITE_METADATA_ENTITY_TITLE_ZH,
    WEBSITE_METADATA_SLUG,
    WebsiteMetadataDraft,
    WebsiteMetadataEditorState,
    WebsitePageOption
} from '@/app/lib/website-metadata-types'

function editorState(entity: WebsiteMetadataEditorState['entity']): WebsiteMetadataEditorState {
    return {
        entity,
        en: parseWebsiteMetadataContent(entity.contentDraftEN, 'en'),
        zh: parseWebsiteMetadataContent(entity.contentDraftZH, 'zh')
    }
}

export async function getWebsiteMetadataEditorState(): Promise<WebsiteMetadataEditorState> {
    const user = await requireUser()
    const entity = await ensureWebsiteMetadataEntity(user.id)
    if (!entity) throw new Error('Website metadata entity could not be created')
    return editorState(entity)
}

export async function getWebsitePageOptions(): Promise<WebsitePageOption[]> {
    await requireUser()
    const pages = await prisma.contentEntity.findMany({
        where: {
            type: EntityType.page,
            NOT: { slug: WEBSITE_METADATA_SLUG }
        },
        orderBy: { titleDraftEN: 'asc' },
        select: {
            id: true,
            titleDraftEN: true,
            titleDraftZH: true,
            slug: true
        }
    })
    return pages.map(page => ({
        id: page.id,
        titleEN: page.titleDraftEN,
        titleZH: page.titleDraftZH,
        url: page.slug === '/' ? '/' : `/${page.slug.replace(/^\/+/, '')}`
    }))
}

export async function saveWebsiteMetadata(
    entityId: number,
    draft: WebsiteMetadataDraft
): Promise<WebsiteMetadataEditorState> {
    const user = await requireUserWithRole(Role.writer)
    const singleton = await ensureWebsiteMetadataEntity(user.id)
    if (!singleton || singleton.id !== entityId) {
        throw new Error('Website metadata entity not found')
    }

    const en = normalizeWebsiteMetadataContent(draft.en, 'en')
    const zh = normalizeWebsiteMetadataContent(draft.zh, 'zh')
    const sharedChineseWebsiteUrl = en.footer.chineseWebsiteUrl || zh.footer.chineseWebsiteUrl
    const sharedIcpNumber = en.footer.icpNumber || zh.footer.icpNumber
    en.footer.chineseWebsiteUrl = sharedChineseWebsiteUrl
    zh.footer.chineseWebsiteUrl = sharedChineseWebsiteUrl
    en.footer.icpNumber = sharedIcpNumber
    zh.footer.icpNumber = sharedIcpNumber

    const entity = await prisma.$transaction(async tx => {
        const updated = await tx.contentEntity.update({
            where: { id: entityId, slug: WEBSITE_METADATA_SLUG },
            data: {
                type: EntityType.page,
                titleDraftEN: WEBSITE_METADATA_ENTITY_TITLE_EN,
                titleDraftZH: WEBSITE_METADATA_ENTITY_TITLE_ZH,
                slug: WEBSITE_METADATA_SLUG,
                contentDraftEN: serializeWebsiteMetadataContent(en),
                contentDraftZH: serializeWebsiteMetadataContent(zh)
            },
            select: HYDRATED_CONTENT_ENTITY_SELECT
        })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.writerEditEntity,
                userId: user.id,
                values: [ entityId.toString(), WEBSITE_METADATA_ENTITY_TITLE_EN ]
            }
        })
        await tx.approval.deleteMany({
            where: { entityType: EntityType.page, entityId }
        })
        return updated
    })

    return editorState(entity)
}

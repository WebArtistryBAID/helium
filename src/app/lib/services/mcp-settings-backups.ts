import 'server-only'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { Role, UserAuditLogType } from '@/generated/prisma/client'
import { requireActorUser } from '@/app/lib/services/actor'
import { getWebsiteMetadataEditorState } from '@/app/lib/services/website-metadata'
import { receiptedMutation } from '@/app/lib/services/mcp-mutations'
import { entityRevision } from '@/app/lib/mcp/entity-revision'
import { entityMutationSchema, mutationSchema, type OperationActor } from '@/app/lib/mcp/contracts'
import {
    normalizeWebsiteMetadataContent,
    serializeWebsiteMetadataContent,
    WEBSITE_METADATA_SLUG
} from '@/app/lib/metadata/website-metadata-types'
import { createContentBackup, listBackups } from '@/app/lib/backups'

const text = z.string().max(10000)
const link = z.object({ id: z.string().min(1).max(200), name: text, url: text }).strict()
const metadata = z.object({
    title: text,
    description: text,
    googleSiteVerification: text.optional(),
    navbar: z.array(link).max(100),
    footer: z.object({
        items: z.array(link.extend({ subItems: z.array(link).max(100) })).max(100), phoneText: text, emailText: text,
        copyrightText: text, chineseWebsiteUrl: text, chineseWebsiteText: text, icpNumber: text
    }).strict()
}).strict()
export const metadataMutationSchema = entityMutationSchema.extend({
    draft: z.object({
        en: metadata,
        zh: metadata
    }).strict()
})

export async function readMcpMetadata(actor: OperationActor) {
    const state = await getWebsiteMetadataEditorState(actor)
    return { ok: true, data: state, revision: entityRevision(state.entity) }
}

export async function saveMcpMetadata(actor: OperationActor, raw: unknown) {
    await requireActorUser(actor, Role.writer)
    const input = metadataMutationSchema.parse(raw)
    return receiptedMutation(actor, 'update_website_metadata', input, async tx => {
        await tx.$queryRaw`SELECT "id" FROM "ContentEntity" WHERE "id" = ${input.entityId} FOR UPDATE`
        const entity = await tx.contentEntity.findUnique({ where: { id: input.entityId } })
        if (!entity || entity.slug !== WEBSITE_METADATA_SLUG) return {
            ok: false,
            error: { code: 'not_found', message: 'Website metadata singleton does not exist.' }
        }
        if (entityRevision(entity) !== input.expectedRevision) return {
            ok: false,
            error: {
                code: 'conflict',
                message: 'Fetch the current website metadata.',
                currentRevision: entityRevision(entity)
            }
        }
        const en = normalizeWebsiteMetadataContent(input.draft.en, 'en')
        const zh = normalizeWebsiteMetadataContent(input.draft.zh, 'zh')
        zh.googleSiteVerification = en.googleSiteVerification = en.googleSiteVerification || zh.googleSiteVerification
        zh.footer.chineseWebsiteUrl = en.footer.chineseWebsiteUrl = en.footer.chineseWebsiteUrl || zh.footer.chineseWebsiteUrl
        zh.footer.icpNumber = en.footer.icpNumber = en.footer.icpNumber || zh.footer.icpNumber
        const updated = await tx.contentEntity.update({
            where: { id: entity.id }, data: {
                contentDraftEN: serializeWebsiteMetadataContent(en), contentDraftZH: serializeWebsiteMetadataContent(zh)
            }
        })
        await tx.approval.deleteMany({ where: { entityId: entity.id } })
        await tx.userAuditLog.create({
            data: {
                type: UserAuditLogType.writerEditEntity, userId: actor.userId,
                values: [ String(entity.id), 'mcp:metadata', input.idempotencyKey ]
            }
        })
        return { ok: true, data: { entity: updated, en, zh }, revision: entityRevision(updated) }
    })
}

export async function listMcpBackups(actor: OperationActor) {
    await requireActorUser(actor, Role.admin)
    return {
        ok: true, data: {
            backups: (await listBackups()).map(backup => ({
                ...backup,
                downloadPath: `/mcp/transfers/backups/${encodeURIComponent(backup.filename)}`
            })), scope: 'Content entity records; media files are referenced separately.'
        }
    }
}

export async function createMcpBackup(actor: OperationActor, raw: unknown) {
    await requireActorUser(actor, Role.admin)
    const input = mutationSchema.parse(raw)
    return receiptedMutation(actor, 'create_backup', input, async () => {
        const suffix = BigInt('0x' + createHash('sha256').update(`${actor.userId}:${input.idempotencyKey}`).digest('hex')).toString()
        const result = await createContentBackup('manual', `content-entities-manual-${suffix}.zip`)
        return {
            ok: true, data: {
                ...result.backup,
                downloadPath: `/mcp/transfers/backups/${encodeURIComponent(result.backup.filename)}`,
                scope: 'Content entity records; media files are referenced separately.'
            }
        }
    })
}

import 'server-only'

import { randomUUID } from 'node:crypto'
import { Role } from '@/generated/prisma/client'
import {
    replaceDocumentSchema,
    editDocumentSchema,
    entityIdSchema,
    languageSchema,
    type OperationActor
} from '@/app/lib/mcp/contracts'
import { z } from 'zod'
import { requireActorUser } from '@/app/lib/services/actor'

export const readEditorDocumentSchema = z.object({
    entityId: entityIdSchema, language: languageSchema, editor: z.enum([ 'plate', 'puck' ])
}).strict()

export async function operateEditorDocument(actor: OperationActor, action: 'read' | 'edit' | 'replace', raw: unknown): Promise<Record<string, unknown>> {
    await requireActorUser(actor, Role.writer)
    const input = action === 'read' ? readEditorDocumentSchema.parse(raw) : action === 'replace' ? replaceDocumentSchema.parse(raw) : editDocumentSchema.parse(raw)
    const configured = process.env.HOCUSPOCUS_INTERNAL_URL ?? process.env.NEXT_PUBLIC_HOCUSPOCUS_URL
    if (!configured || !process.env.JWT_SECRET) {
        console.error('Helium MCP editor configuration missing', {
            hasCollaborationUrl: Boolean(configured), hasJwtSecret: Boolean(process.env.JWT_SECRET), action
        })
        return {
            ok: false, error: {
                code: 'storage_unavailable',
                message: 'Configure the collaboration server before editing live documents.'
            }
        }
    }
    const url = configured.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/$/, '') + '/mcp/editor'
    const requestId = randomUUID()
    const startedAt = Date.now()
    const parsedUrl = new URL(url)
    const context = {
        requestId, action, entityId: input.entityId, language: input.language,
        editor: input.editor, userId: actor.userId,
        endpoint: parsedUrl.origin + parsedUrl.pathname,
        urlSource: process.env.HOCUSPOCUS_INTERNAL_URL != null ? 'HOCUSPOCUS_INTERNAL_URL' : 'NEXT_PUBLIC_HOCUSPOCUS_URL'
    }
    let stage = 'connect'
    console.info('Helium MCP editor request started', context)
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-collaboration-secret': process.env.JWT_SECRET,
                'x-mcp-request-id': requestId
            },
            body: JSON.stringify({
                action,
                actor: { source: actor.source, userId: actor.userId, tokenId: actor.tokenId },
                input
            }),
            cache: 'no-store',
            signal: AbortSignal.timeout(20_000)
        })
        stage = 'response'
        const responseContext = {
            ...context, durationMs: Date.now() - startedAt,
            status: response.status, contentType: response.headers.get('content-type'), redirected: response.redirected
        }
        console.info('Helium MCP editor response received', responseContext)
        if (!response.ok) {
            console.error('Helium MCP editor HTTP failure', responseContext)
            return {
                ok: false, error: {
                    code: 'storage_unavailable',
                    message: 'The collaboration server could not confirm the operation. Retry edits with the same idempotency key.'
                }
            }
        }
        stage = 'decode-response'
        let data: Record<string, unknown>
        try {
            data = await response.json() as Record<string, unknown>
        } catch {
            console.error('Helium MCP editor response is not valid JSON; check collaboration routing', responseContext)
            throw new Error('Collaboration endpoint returned an invalid JSON response')
        }
        console.info('Helium MCP editor request completed', {
            ...responseContext,
            durationMs: Date.now() - startedAt,
            ok: data.ok
        })
        return data
    } catch (error) {
        console.error('Helium MCP editor request failed', {
            ...context,
            stage,
            durationMs: Date.now() - startedAt
        }, error)
        throw error
    }
}

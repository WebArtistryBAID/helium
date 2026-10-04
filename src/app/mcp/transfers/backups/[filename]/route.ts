import { transferActor } from '@/app/lib/mcp/transfer-auth'
import { downloadBackup } from '@/app/lib/services/backups'

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
    const actor = await transferActor(request)
    if (!actor) return new Response(null, { status: 401 })
    try {
        const { filename } = await context.params
        const data = await downloadBackup(actor, filename, 256 * 1024 * 1024)
        if (data.length > 256 * 1024 * 1024) return new Response(null, { status: 413 })
        return new Response(new Uint8Array(data), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store'
            }
        })
    } catch {
        return new Response(null, { status: 403 })
    }
}

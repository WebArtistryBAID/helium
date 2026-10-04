import { transferActor } from '@/app/lib/mcp/transfer-auth'
import { uploadMcpImage } from '@/app/lib/services/mcp-media'

export async function POST(request: Request) {
    const actor = await transferActor(request)
    if (!actor) return new Response(null, { status: 401 })
    const length = Number(request.headers.get('content-length'))
    if (length > 21 * 1024 * 1024) return new Response(null, { status: 413 })
    try {
        if (!request.body) return new Response(null, { status: 400 })
        const reader = request.body.getReader()
        const chunks: Uint8Array[] = []
        let received = 0
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            received += value.length
            if (received > 21 * 1024 * 1024) {
                await reader.cancel()
                return new Response(null, { status: 413 })
            }
            chunks.push(value)
        }
        const bounded = new Response(new Uint8Array(Buffer.concat(chunks)), {
            headers: {
                'Content-Type': request.headers.get('content-type') ?? ''
            }
        })
        const form = await bounded.formData()
        const file = form.get('file')
        if (!(file instanceof File) || file.size > 20 * 1024 * 1024) return new Response(null, { status: 400 })
        const result = await uploadMcpImage(actor, {
            idempotencyKey: request.headers.get('idempotency-key'),
            name: form.get('name') ?? file.name, altText: form.get('altText') ?? '', mimeType: file.type,
            base64: Buffer.from(await file.arrayBuffer()).toString('base64')
        })
        return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
        return Response.json({
            ok: false,
            error: { code: 'invalid_input', message: 'Image upload could not complete.' }
        }, { status: 400 })
    }
}

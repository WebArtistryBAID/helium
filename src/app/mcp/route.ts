import { authenticatePersonalToken } from '@/app/lib/services/personal-tokens'
import { createHeliumMcpHandler } from '@/app/lib/mcp/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handler(request: Request): Promise<Response> {
    const headers = { 'Cache-Control': 'no-store' }
    const origin = request.headers.get('origin')
    const allowedOrigin = new URL(process.env.HOST ?? request.url).origin
    if (origin && origin !== allowedOrigin) return Response.json({ error: 'Forbidden origin' }, {
        status: 403,
        headers
    })
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
    try {
        const actor = token ? await authenticatePersonalToken(token) : null
        if (!actor) return Response.json({ error: 'An active personal token is required' }, {
            status: 401, headers: { ...headers, 'WWW-Authenticate': 'Bearer realm="Helium MCP"' }
        })
        const response = await createHeliumMcpHandler(actor, token!)(request)
        response.headers.set('Cache-Control', 'no-store')
        return response
    } catch {
        console.error('Helium MCP request failed')
        return Response.json({ error: 'MCP temporarily unavailable' }, { status: 503, headers })
    }
}

export { handler as GET, handler as POST, handler as DELETE }

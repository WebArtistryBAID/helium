import { cookies } from 'next/headers'
import { type JWTPayload, jwtVerify } from 'jose'
import { redirect } from 'next/navigation'

export function redirectToLogin(): string {
    return `${process.env.ONELOGIN_HOST}/oauth2/authorize?client_id=${process.env.ONELOGIN_CLIENT_ID}&redirect_uri=${process.env.HOST}/login/authorize&scope=basic+phone&response_type=code`
}

// Must match the claims set in /login/authorize. Other tokens signed with JWT_SECRET (e.g. collaboration) are rejected.
export async function verifySessionToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!), {
            issuer: 'https://hello.beijing.academy',
            audience: 'https://hello.beijing.academy',
            algorithms: [ 'HS256' ]
        })
        return payload.type === 'internal' && typeof payload.id === 'number' ? payload : null
    } catch {
        return null
    }
}

async function session(): Promise<JWTPayload | null> {
    const token = (await cookies()).get('access_token')?.value
    return token == null ? null : verifySessionToken(token)
}

export async function isLoggedIn(): Promise<boolean> {
    return await session() != null
}

export async function me(): Promise<number | null> {
    return (await session())?.id as number | undefined ?? null
}

export async function isLoggedInWithPermission(permission: string): Promise<boolean> {
    const payload = await session()
    return Array.isArray(payload?.permissions) && payload.permissions.includes(permission)
}

export async function requireLogin(): Promise<void> {
    if (!await isLoggedIn()) {
        redirect(redirectToLogin())
    }
}

export async function requirePermission(permission: string): Promise<void> {
    if (!await isLoggedInWithPermission(permission)) {
        throw new Error('Unauthorized')
    }
}

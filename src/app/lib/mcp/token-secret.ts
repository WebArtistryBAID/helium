import { createHash, randomBytes } from 'node:crypto'

export function generateTokenSecret() {
    const token = `hmcp_${randomBytes(32).toString('base64url')}`
    return { token, tokenHash: hashTokenSecret(token), prefix: token.slice(0, 13) }
}

export function hashTokenSecret(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export function isTokenSecret(token: string): boolean {
    return /^hmcp_[A-Za-z0-9_-]{43}$/.test(token)
}

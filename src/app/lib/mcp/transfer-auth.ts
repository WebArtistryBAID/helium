import 'server-only'
import { authenticatePersonalToken } from '@/app/lib/services/personal-tokens'

export async function transferActor(request: Request) {
    const header = request.headers.get('authorization')
    return header?.startsWith('Bearer ') ? authenticatePersonalToken(header.slice(7)) : null
}

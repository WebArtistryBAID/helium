import 'server-only'

import { requireUser } from '@/app/login/login-actions'
import type { OperationActor } from '@/app/lib/mcp/contracts'

export async function getStudioActor(): Promise<OperationActor> {
    const user = await requireUser()
    return { userId: user.id, roles: user.roles, source: 'studio' }
}

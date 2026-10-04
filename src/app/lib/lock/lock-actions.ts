'use server'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/locks'
import type { EntityLockParams, SessionLockParams } from '@/app/lib/services/locks'

export async function acquireLock(params: EntityLockParams & { currentToken?: string }) {
    return services.acquireLock(await getStudioActor(), params)
}

export async function renewLock(params: SessionLockParams) {
    return services.renewLock(await getStudioActor(), params)
}

export async function overrideLock(params: EntityLockParams) {
    return services.overrideLock(await getStudioActor(), params)
}

export async function releaseLock(params: SessionLockParams) {
    return services.releaseLock(await getStudioActor(), params)
}

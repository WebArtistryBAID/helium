import { acquireLock } from '@/app/lib/lock/lock-actions'
import { EntityType } from '@/generated/prisma/client'
import LockOverridePrompt from '@/app/lib/lock/LockOverridePrompt'
import { ReactNode } from 'react'

export async function tryAcquireLock({ entityType, entityId, currentToken }: {
    entityType: EntityType,
    entityId: number,
    currentToken: string | undefined,
}): Promise<ReactNode | string> {
    const thisToken = await acquireLock({
        entityType,
        entityId,
        currentToken
    })
    if (thisToken == null) {
        return <LockOverridePrompt entityType={entityType} entityId={entityId}/>
    }
    return thisToken.token
}

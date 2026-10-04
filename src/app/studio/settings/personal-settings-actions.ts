'use server'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as tokens from '@/app/lib/services/personal-tokens'
import { revalidatePath } from 'next/cache'

export async function createPersonalToken(input: unknown) {
    const result = await tokens.createPersonalToken(await getStudioActor(), input)
    revalidatePath('/studio/settings')
    return result
}

export async function revokePersonalToken(input: unknown) {
    await tokens.revokePersonalToken(await getStudioActor(), input)
    revalidatePath('/studio/settings')
}

'use server'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/feishu'

export async function getFeishuAuthUrl() {
    return services.getFeishuAuthUrl(await getStudioActor())
}

export async function exchangeFeishuCode(code: string) {
    return services.exchangeFeishuCode(await getStudioActor(), code)
}

export async function linkFeishuAccount(userId: number, feishuOpenId: string) {
    return services.linkFeishuAccount(await getStudioActor(), userId, feishuOpenId)
}

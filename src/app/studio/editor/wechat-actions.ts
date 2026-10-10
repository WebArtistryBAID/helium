'use server'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/wechat'

export async function getWeChatTasks() {
    return services.getWeChatTasks(await getStudioActor())
}

export async function createPostsFromWeChat(input: string, coverImageId: number | null, debug = false) {
    return services.createPostsFromWeChat(await getStudioActor(), input, coverImageId, debug)
}

export async function enableWeChatTaskDebugMode() {
    return services.enableWeChatTaskDebugMode(await getStudioActor())
}

export async function deleteWeChatTask(id: string) {
    return services.deleteWeChatTask(await getStudioActor(), id)
}

export async function retryFailedWeChatTask(id: string, debug = false) {
    return services.retryFailedWeChatTask(await getStudioActor(), id, debug)
}

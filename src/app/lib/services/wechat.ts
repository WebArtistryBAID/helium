import 'server-only'

import type { OperationActor } from '@/app/lib/mcp/contracts'
import { requireActorUser } from '@/app/lib/services/actor'

import { Role } from '@/generated/prisma/client'

import {
    cancelWeChatTask,
    enableWeChatDebugMode,
    listWeChatTasks,
    retryWeChatTask,
    startWeChatTasks
} from '@/app/lib/wechat/wechat-tasks'

export async function getWeChatTasks(actor: OperationActor) {
    return listWeChatTasks(await requireActorUser(actor, Role.writer))
}

export async function createPostsFromWeChat(actor: OperationActor, input: string, coverImageId: number | null, debug = false) {
    return startWeChatTasks(input, coverImageId, await requireActorUser(actor, Role.writer), debug === true)
}

export async function enableWeChatTaskDebugMode(actor: OperationActor) {
    return enableWeChatDebugMode(await requireActorUser(actor, Role.writer))
}

export async function deleteWeChatTask(actor: OperationActor, id: string) {
    await cancelWeChatTask(id, await requireActorUser(actor, Role.writer))
}

export async function retryFailedWeChatTask(actor: OperationActor, id: string, debug = false) {
    return retryWeChatTask(id, await requireActorUser(actor, Role.writer), debug === true)
}

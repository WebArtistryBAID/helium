'use server'

import { Role } from '@/generated/prisma/client'
import { requireUserWithRole } from '@/app/login/login-actions'
import {
    cancelWeChatTask,
    listWeChatTasks,
    retryWeChatTask,
    startWeChatTasks
} from '@/app/lib/wechat/wechat-tasks'

export async function getWeChatTasks() {
    return listWeChatTasks(await requireUserWithRole(Role.writer))
}

export async function createPostsFromWeChat(input: string, coverImageId: number | null) {
    return startWeChatTasks(input, coverImageId, await requireUserWithRole(Role.writer))
}

export async function deleteWeChatTask(id: string) {
    await cancelWeChatTask(id, await requireUserWithRole(Role.writer))
}

export async function retryFailedWeChatTask(id: string) {
    return retryWeChatTask(id, await requireUserWithRole(Role.writer))
}

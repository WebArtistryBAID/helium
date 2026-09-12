'use server'

import { Role } from '@/generated/prisma/client'
import { requireUserWithRole } from '@/app/login/login-actions'
import { cancelWeChatTask, listWeChatTasks, startWeChatTask } from '@/app/lib/wechat/wechat-tasks'

export async function getWeChatTasks() {
    return listWeChatTasks(await requireUserWithRole(Role.writer))
}

export async function createPostFromWeChat(url: string, coverImageId: number | null) {
    return startWeChatTask(url, coverImageId, await requireUserWithRole(Role.writer))
}

export async function deleteWeChatTask(id: string) {
    await cancelWeChatTask(id, await requireUserWithRole(Role.writer))
}

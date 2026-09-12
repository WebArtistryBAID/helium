import { randomUUID } from 'node:crypto'
import { Role, User } from '@/generated/prisma/client'
import { WeChatTask, WeChatWorkerStatus } from '@/app/studio/editor/entity-types'
import { synchronizeWeChatArticle } from '@/app/lib/wechat/wechat-worker'

export type RunningWeChatTask = Omit<WeChatTask, 'canCancel'> & {
    userId: number
    controller: AbortController
    done: Promise<void>
    cleanup?: () => Promise<void>
}

const state = globalThis as typeof globalThis & {
    heliumWeChatTasks?: Map<string, RunningWeChatTask>
    heliumWeChatSaveQueue?: Promise<void>
}
const tasks = state.heliumWeChatTasks ??= new Map<string, RunningWeChatTask>()

export function listWeChatTasks(user: User): WeChatTask[] {
    return Array.from(tasks.values())
        .sort((a, b) => b.startedAt - a.startedAt || b.id.localeCompare(a.id))
        .map(({ id, startedAt, title, status, error, userId }) => ({
            id, startedAt, title, status, error,
            canCancel: userId === user.id || user.roles.includes(Role.admin)
        }))
}

export function startWeChatTask(url: string, coverImageId: number | null, user: User): string {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'mp.weixin.qq.com' || parsed.username || parsed.password) {
        throw new Error('请输入有效的微信公众号文章链接。')
    }
    const task: RunningWeChatTask = {
        id: randomUUID(), startedAt: Date.now(), userId: user.id,
        status: WeChatWorkerStatus.download, controller: new AbortController(), done: Promise.resolve()
    }
    tasks.set(task.id, task)
    task.done = synchronizeWeChatArticle(task, parsed.href, coverImageId, user).then(() => {
        tasks.delete(task.id)
    }).catch(error => {
        if (task.controller.signal.aborted) return
        task.status = 'error'
        task.error = error instanceof Error ? error.message : '同步失败'
        console.error(`WeChat task ${task.id} failed:`, error)
    })
    return task.id
}

export async function cancelWeChatTask(id: string, user: User) {
    const task = tasks.get(id)
    if (!task) return
    if (task.userId !== user.id && !user.roles.includes(Role.admin)) throw new Error('Unauthorized')
    task.status = 'cancelling'
    task.controller.abort(new Error('同步任务已取消'))
    await task.done
    try {
        await task.cleanup?.()
        tasks.delete(id)
    } catch (error) {
        task.status = 'error'
        task.error = `清理失败: ${error instanceof Error ? error.message : '请重试'}`
        throw error
    }
}

export async function withWeChatSaveLock<T>(work: () => Promise<T>): Promise<T> {
    const previous = state.heliumWeChatSaveQueue ?? Promise.resolve()
    let release!: () => void
    state.heliumWeChatSaveQueue = new Promise<void>(resolve => { release = resolve })
    await previous
    try { return await work() } finally { release() }
}

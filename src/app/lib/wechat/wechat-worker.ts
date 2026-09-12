import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { pkgUp } from 'pkg-up'
import { EntityType, User, UserAuditLogType } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { callFeishuAily } from '@/app/lib/feishu/feishu-aily'
import { RunningWeChatTask, withWeChatSaveLock } from '@/app/lib/wechat/wechat-tasks'
import { WeChatWorkerStatus } from '@/app/studio/editor/entity-types'
import {
    TRANSLATE_LITERAL,
    SANITIZE_LITERAL,
    NOTIFICATION_LITERAL,
    ENGLISH_TRANSLATION_LITERAL
} from '@/app/lib/wechat/wechat-prompts'

async function download(command: string, args: string[], cwd: string, signal: AbortSignal) {
    signal.throwIfAborted()
    await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false, detached: process.platform !== 'win32' })
        let forceKill: ReturnType<typeof setTimeout> | undefined
        let spawnError: Error | undefined
        const kill = (killSignal: NodeJS.Signals) => {
            try {
                if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, killSignal)
                else child.kill(killSignal)
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ESRCH') spawnError = error as Error
            }
        }
        const abort = () => {
            kill('SIGTERM')
            forceKill = setTimeout(() => kill('SIGKILL'), 2000)
        }
        signal.addEventListener('abort', abort, { once: true })
        child.on('error', error => { spawnError = error })
        child.on('close', code => {
            clearTimeout(forceKill)
            // Stop remaining downloader descendants before removing their directory.
            if (signal.aborted) kill('SIGKILL')
            signal.removeEventListener('abort', abort)
            if (signal.aborted) reject(signal.reason)
            else if (spawnError) reject(spawnError)
            else if (code === 0) resolve()
            else reject(new Error(`文章下载失败（${code}）`))
        })
        if (signal.aborted) abort()
    })
}

function parseResponse(raw: string) {
    const trimmed = raw.trim()
    const fenced = trimmed.match(/^(`{3,}|~{3,})[ \t]*(?:json)?\s*([\s\S]*?)\s*\1$/i)
    const value = JSON.parse(fenced ? fenced[2].trim() : trimmed)
    if (typeof value.title !== 'string' || typeof value.content !== 'string') throw new Error('AI 返回的标题或正文格式错误')
    return value as { title: string; content: string; date?: string }
}

function spaceChineseAlphanumericBoundaries(content: string): string {
    return content.replace(/(\p{Script=Han})([A-Za-z0-9])/gu, '$1 $2').replace(/([A-Za-z0-9])(\p{Script=Han})/gu, '$1 $2')
}

export async function synchronizeWeChatArticle(task: RunningWeChatTask, link: string, coverImageId: number | null, user: User) {
    const signal = task.controller.signal
    const directory = path.join(os.tmpdir(), `article-build-${task.id}`)
    let postId: number | undefined
    const createdImages: number[] = []
    const writtenFiles = new Map<string, string>()
    const removeFiles = async () => {
        for (const [file, hash] of writtenFiles) {
            if (!await prisma.image.findUnique({ where: { sha1: hash }, select: { id: true } })) {
                await fs.rm(file, { force: true })
            }
            writtenFiles.delete(file)
        }
    }
    task.cleanup = async () => {
        await withWeChatSaveLock(async () => {
            if (postId !== undefined) {
                await prisma.contentEntity.deleteMany({ where: { id: postId } })
                postId = undefined
            }
            if (createdImages.length) {
                await prisma.image.deleteMany({ where: { id: { in: createdImages } } })
                createdImages.length = 0
            }
            await removeFiles()
            await fs.rm(directory, { recursive: true, force: true })
        })
    }
    const stage = (status: WeChatWorkerStatus) => {
        signal.throwIfAborted()
        task.status = status as RunningWeChatTask['status']
    }
    try {
        await fs.mkdir(directory, { recursive: true })
        const root = path.dirname(await pkgUp() ?? '')
        await download(path.join(root, 'blobs', process.platform === 'darwin' ? 'downloader-macos' : 'downloader'), [link, directory, '--image=save'], directory, signal)
        signal.throwIfAborted()
        const folders = await fs.readdir(directory, { withFileTypes: true })
        const downloaded = folders.find(entry => entry.isDirectory())
        if (!downloaded) throw new Error('下载结果中没有文章目录')
        const articleDir = path.join(directory, downloaded.name)
        const articleFiles = await fs.readdir(articleDir)
        const markdownFile = articleFiles.find(file => file.endsWith('.md'))
        if (!markdownFile) throw new Error('下载结果中没有 Markdown 文章')
        const markdownContent = await fs.readFile(path.join(articleDir, markdownFile), 'utf8')
        const heading = markdownContent.match(/^#\s+(.+)$/m)?.[1]?.trim()
        if (heading) task.title = heading
        stage(WeChatWorkerStatus.imageClassification)
        const toRemove: string[] = []
        const toKeep: string[] = []
        for (const file of articleFiles.filter(file => /\.(jpeg|png|jpg|webp)$/i.test(file))) {
            signal.throwIfAborted()
            const url = new URL('http://localhost:59192')
            url.searchParams.set('image', path.join(articleDir, file))
            const response = await fetch(url, { signal })
            if (!response.ok) throw new Error(`图片分类失败（${response.status}）`)
            if (await response.text() === 'decorative') {
                toRemove.push(file)
                await fs.rm(path.join(articleDir, file), { force: true })
            } else toKeep.push(file)
        }
        stage(WeChatWorkerStatus.sanitization)
        const sanitized = parseResponse(await callFeishuAily(
            SANITIZE_LITERAL.replace('{{PLACEHOLDER}}', task.id).replace('{{IMAGE_BLACKLIST}}', toRemove.length ? toRemove.toString() : '本次操作不需要移除任何图片'),
            markdownContent,
            signal
        ))
        const titleChinese = spaceChineseAlphanumericBoundaries(sanitized.title)
        const contentChinese = spaceChineseAlphanumericBoundaries(sanitized.content)
        task.title = titleChinese
        const date = new Date(sanitized.date ?? '')
        if (Number.isNaN(date.getTime())) throw new Error('AI 返回的文章日期无效')
        stage(WeChatWorkerStatus.translation)
        const translated = parseResponse(await callFeishuAily(TRANSLATE_LITERAL, '#' + titleChinese + '\n\n' + contentChinese, signal))
        stage(WeChatWorkerStatus.savingImages)
        const images: { file: string; hash: string; width: number; height: number; sizeKB: number }[] = []
        for (const file of toKeep) {
            signal.throwIfAborted()
            const buffer = await fs.readFile(path.join(articleDir, file))
            const webp = await sharp(buffer).webp().toBuffer()
            const thumbnail = await sharp(buffer).resize(300, 200, { fit: 'inside', withoutEnlargement: true }).webp().toBuffer()
            const hash = crypto.createHash('sha1').update(webp).digest('hex')
            const metadata = await sharp(webp).metadata()
            await fs.writeFile(path.join(directory, `${hash}.webp`), webp)
            await fs.writeFile(path.join(directory, `${hash}_thumb.webp`), thumbnail)
            images.push({ file, hash, width: metadata.width ?? 0, height: metadata.height ?? 0, sizeKB: Math.ceil(webp.length / 1024) })
        }
        stage(WeChatWorkerStatus.creatingPost)
        await withWeChatSaveLock(async () => {
            signal.throwIfAborted()
            try {
                await prisma.$transaction(async tx => {
                    const mapping = new Map<string, number>()
                    if (images.length) await fs.mkdir(process.env.UPLOAD_PATH!, { recursive: true })
                    for (const image of images) {
                        signal.throwIfAborted()
                        let row = await tx.image.findUnique({ where: { sha1: image.hash }, select: { id: true } })
                        if (!row) {
                            for (const suffix of ['.webp', '_thumb.webp']) {
                                const destination = path.join(process.env.UPLOAD_PATH!, image.hash + suffix)
                                try {
                                    await fs.copyFile(path.join(directory, image.hash + suffix), destination, fs.constants.COPYFILE_EXCL)
                                    writtenFiles.set(destination, image.hash)
                                } catch (error) {
                                    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
                                }
                            }
                            row = await tx.image.create({ data: { sha1: image.hash, name: '微信导入', altText: '由微信文章导入', width: image.width, height: image.height, sizeKB: image.sizeKB, uploaderId: user.id } })
                            createdImages.push(row.id)
                            await tx.userAuditLog.create({ data: { type: UserAuditLogType.uploadImage, userId: user.id, values: [row.id.toString(), image.hash] } })
                        }
                        mapping.set(image.file, row.id)
                    }
                    let finalContentEN = NOTIFICATION_LITERAL + translated.content + ENGLISH_TRANSLATION_LITERAL
                    let finalContentZH = NOTIFICATION_LITERAL + contentChinese
                    for (const [file, id] of mapping) {
                        const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                        const expression = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${escaped}[^)]*\\)`, 'g')
                        finalContentEN = finalContentEN.replace(expression, `[IMAGE: ${id}]`)
                        finalContentZH = finalContentZH.replace(expression, `[IMAGE: ${id}]`)
                    }
                    const baseSlug = translated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 8).join('-') || 'wechat-article'
                    let slug = baseSlug
                    if (await tx.contentEntity.findUnique({ where: { slug }, select: { id: true } })) slug = `${baseSlug}-${task.id}`
                    signal.throwIfAborted()
                    const post = await tx.contentEntity.create({ data: {
                        type: EntityType.post, titleDraftEN: translated.title, titleDraftZH: titleChinese,
                        slug, contentDraftEN: finalContentEN, contentDraftZH: finalContentZH,
                        coverImageDraftId: coverImageId, createdAt: date, creatorId: user.id
                    } })
                    postId = post.id
                    await tx.userAuditLog.create({ data: { type: UserAuditLogType.writerCreateEntity, userId: user.id, values: [post.id.toString(), translated.title] } })
                    signal.throwIfAborted()
                }, { timeout: 60000 })
                // Cancellation can arrive while the transaction is committing.
                signal.throwIfAborted()
                await fs.rm(directory, { recursive: true, force: true })
                signal.throwIfAborted()
                task.cleanup = undefined
                postId = undefined
                createdImages.length = 0
                writtenFiles.clear()
            } catch (error) {
                if (postId !== undefined) await prisma.contentEntity.deleteMany({ where: { id: postId } })
                postId = undefined
                if (createdImages.length) await prisma.image.deleteMany({ where: { id: { in: createdImages } } })
                createdImages.length = 0
                await removeFiles()
                throw error
            }
        })
    } catch (error) {
        await task.cleanup?.()
        throw error
    }
}

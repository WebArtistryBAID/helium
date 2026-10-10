import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { EntityType, User, UserAuditLogType } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'
import { callFeishuAily } from '@/app/lib/feishu/feishu-aily'
import { parseAilyJson } from '@/app/lib/feishu/parse-aily-json'
import { RunningWeChatTask, withWeChatSaveLock } from '@/app/lib/wechat/wechat-tasks'
import { WeChatWorkerStatus } from '@/app/studio/editor/entity-types'
import {
    TRANSLATE_LITERAL,
    SANITIZE_LITERAL
} from '@/app/lib/wechat/wechat-prompts'
import { packageUp } from 'package-up'
import { deserializeMarkdownToPlate } from '@/app/lib/plate/plate-markdown'
import { serializePlateValue } from '@/app/lib/plate/plate-types'
import { parseWeChatCategory } from '@/app/lib/wechat/wechat-categories'
import { createWeChatDebugLogger, type SyncDebugLogger } from '@/app/lib/wechat/wechat-debug'

const MAX_IMAGE_DIMENSION = 2000

async function download(command: string, args: string[], cwd: string, signal: AbortSignal, task: RunningWeChatTask, log: SyncDebugLogger) {
    signal.throwIfAborted()
    log('Weixin downloader started', { command, args, cwd })
    await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            stdio: [ 'inherit', 'pipe', 'pipe' ],
            shell: false,
            detached: process.platform !== 'win32'
        })
        child.stdout?.setEncoding('utf8')
        child.stderr?.setEncoding('utf8')
        child.stdout?.on('data', (output: string) => {
            if (task.debug) log('Weixin downloader stdout', { output })
            else process.stdout.write(output)
        })
        child.stderr?.on('data', (output: string) => {
            if (task.debug) log('Weixin downloader stderr', { output })
            else process.stderr.write(output)
        })
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
            log('Weixin downloader cancellation', { pid: child.pid, reason: signal.reason })
            kill('SIGTERM')
            forceKill = setTimeout(() => kill('SIGKILL'), 2000)
        }
        signal.addEventListener('abort', abort, { once: true })
        child.on('error', error => {
            spawnError = error
            log('Weixin downloader error', error)
        })
        child.on('close', (code, exitSignal) => {
            log('Weixin downloader exited', { code, exitSignal, spawnError })
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
    const value = parseAilyJson(raw)
    if (typeof value.title !== 'string' || typeof value.content !== 'string') throw new Error('AI 返回的标题或正文格式错误')
    return value as { title: string; content: string; date?: string; category?: unknown }
}

function spaceChineseAlphanumericBoundaries(content: string): string {
    return content.replace(/(\p{Script=Han})([A-Za-z0-9])/gu, '$1 $2').replace(/([A-Za-z0-9])(\p{Script=Han})/gu, '$1 $2')
}

export async function synchronizeWeChatArticle(task: RunningWeChatTask, link: string, coverImageId: number | null, user: User) {
    const signal = task.controller.signal
    const log = createWeChatDebugLogger(task)
    const directory = path.join(os.tmpdir(), `article-build-${task.id}`)
    let postId: number | undefined
    const createdImages: number[] = []
    const writtenFiles = new Map<string, string>()
    const removeFiles = async () => {
        for (const [file, hash] of writtenFiles) {
            if (!await prisma.image.findUnique({ where: { sha1: hash }, select: { id: true } })) {
                await fs.rm(file, { force: true })
                log('Unreferenced image file removed', { file, hash })
            }
            writtenFiles.delete(file)
        }
    }
    task.cleanup = async () => {
        log('Cleanup started', { postId, createdImages, directory })
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
        log('Cleanup completed')
    }
    const stage = (status: WeChatWorkerStatus) => {
        signal.throwIfAborted()
        task.status = status as RunningWeChatTask['status']
        log('Step started', { status })
    }
    // The bundled downloader owns its HTTP requests. A separate diagnostic request
    // records Weixin's response while downloader output records the actual import.
    const inspectWeixinResponse = async () => {
        log('Weixin diagnostic request started', { url: link, method: 'GET' })
        try {
            const response = await fetch(link, {
                signal: AbortSignal.any([ signal, AbortSignal.timeout(20_000) ]),
                cache: 'no-store'
            })
            const body = await response.text()
            log('Weixin diagnostic response', {
                url: response.url, redirected: response.redirected, status: response.status,
                headers: Object.fromEntries(response.headers), body
            })
        } catch (error) {
            log('Weixin diagnostic request failed', error)
            signal.throwIfAborted()
        }
    }
    try {
        stage(WeChatWorkerStatus.download)
        await fs.mkdir(directory, { recursive: true })
        const root = path.dirname(await packageUp() ?? '')
        const inspectedWeixin = task.debug
        if (inspectedWeixin) await inspectWeixinResponse()
        await download(path.join(root, 'blobs', process.platform === 'darwin' ? 'downloader-macos' : 'downloader'), [ link, directory, '--image=save' ], directory, signal, task, log)
        signal.throwIfAborted()
        if (task.debug && !inspectedWeixin) await inspectWeixinResponse()
        const folders = await fs.readdir(directory, { withFileTypes: true })
        log('Downloader directory inspected', {
            directory,
            entries: folders.map(entry => ({ name: entry.name, directory: entry.isDirectory() }))
        })
        const downloaded = folders.find(entry => entry.isDirectory())
        if (!downloaded) throw new Error('下载结果中没有文章目录')
        const articleDir = path.join(directory, downloaded.name)
        const articleFiles = await fs.readdir(articleDir)
        const markdownFile = articleFiles.find(file => file.endsWith('.md'))
        if (!markdownFile) throw new Error('下载结果中没有 Markdown 文章')
        const markdownContent = await fs.readFile(path.join(articleDir, markdownFile), 'utf8')
        log('Downloaded article loaded', { articleDir, articleFiles, markdownFile, markdownContent })
        const heading = markdownContent.match(/^#\s+(.+)$/m)?.[1]?.trim()
        if (heading) task.title = heading
        stage(WeChatWorkerStatus.imageClassification)
        const toRemove: string[] = []
        const toKeep: string[] = []
        for (const file of articleFiles.filter(file => /\.(jpeg|png|jpg|webp)$/i.test(file))) {
            signal.throwIfAborted()
            const url = new URL('http://localhost:59192')
            url.searchParams.set('image', path.join(articleDir, file))
            log('Image classification request', { file, url: url.href })
            const response = await fetch(url, { signal })
            const classification = await response.text()
            log('Image classification response', { file, status: response.status, body: classification })
            if (!response.ok) throw new Error(`图片分类失败（${response.status}）`)
            if (classification === 'decorative') {
                toRemove.push(file)
                await fs.rm(path.join(articleDir, file), { force: true })
            } else toKeep.push(file)
        }
        log('Image classification completed', { toRemove, toKeep })
        stage(WeChatWorkerStatus.sanitization)
        const sanitized = parseResponse(await callFeishuAily(
            SANITIZE_LITERAL.replace('{{PLACEHOLDER}}', task.id).replace('{{IMAGE_BLACKLIST}}', toRemove.length ? toRemove.toString() : '本次操作不需要移除任何图片'),
            markdownContent,
            signal, log
        ))
        log('Sanitized article parsed', sanitized)
        const category = parseWeChatCategory(sanitized.category)
        const titleChinese = spaceChineseAlphanumericBoundaries(sanitized.title)
        const contentChinese = spaceChineseAlphanumericBoundaries(sanitized.content)
        task.title = titleChinese
        const date = new Date(sanitized.date ?? '')
        if (Number.isNaN(date.getTime())) throw new Error('AI 返回的文章日期无效')
        log('Sanitization completed', {
            title: titleChinese,
            date: date.toISOString(),
            category,
            content: contentChinese
        })
        stage(WeChatWorkerStatus.translation)
        const translated = parseResponse(await callFeishuAily(TRANSLATE_LITERAL, '#' + titleChinese + '\n\n' + contentChinese, signal, log))
        log('Translation completed', translated)
        stage(WeChatWorkerStatus.savingImages)
        const images: { file: string; hash: string; width: number; height: number; sizeKB: number }[] = []
        for (const file of toKeep) {
            signal.throwIfAborted()
            log('Image conversion started', { file })
            const buffer = await fs.readFile(path.join(articleDir, file))
            const webp = await sharp(buffer)
                .rotate()
                .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
                .webp()
                .toBuffer()
            const thumbnail = await sharp(buffer)
                .rotate()
                .resize(300, 200, { fit: 'inside', withoutEnlargement: true })
                .webp()
                .toBuffer()
            const hash = crypto.createHash('sha1').update(webp).digest('hex')
            const metadata = await sharp(webp).metadata()
            await fs.writeFile(path.join(directory, `${hash}.webp`), webp)
            await fs.writeFile(path.join(directory, `${hash}_thumb.webp`), thumbnail)
            images.push({ file, hash, width: metadata.width ?? 0, height: metadata.height ?? 0, sizeKB: Math.ceil(webp.length / 1024) })
            log('Image conversion completed', images[images.length - 1])
        }
        log('Image preparation completed', { count: images.length })
        stage(WeChatWorkerStatus.creatingPost)
        log('Waiting for article save lock')
        await withWeChatSaveLock(async () => {
            log('Article save lock acquired')
            signal.throwIfAborted()
            try {
                await prisma.$transaction(async tx => {
                    log('Article transaction started')
                    const mapping = new Map<string, number>()
                    if (images.length) await fs.mkdir(process.env.UPLOAD_PATH!, { recursive: true })
                    for (const image of images) {
                        signal.throwIfAborted()
                        let row = await tx.image.findUnique({ where: { sha1: image.hash }, select: { id: true } })
                        log('Image record lookup', { image, existingImageId: row?.id })
                        if (!row) {
                            for (const suffix of ['.webp', '_thumb.webp']) {
                                const destination = path.join(process.env.UPLOAD_PATH!, image.hash + suffix)
                                try {
                                    await fs.copyFile(path.join(directory, image.hash + suffix), destination, fs.constants.COPYFILE_EXCL)
                                    writtenFiles.set(destination, image.hash)
                                    log('Image file saved', { destination })
                                } catch (error) {
                                    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
                                }
                            }
                            row = await tx.image.create({ data: { sha1: image.hash, name: '微信导入', altText: '由微信文章导入', width: image.width, height: image.height, sizeKB: image.sizeKB, uploaderId: user.id } })
                            createdImages.push(row.id)
                            log('Image record created', { imageId: row.id, hash: image.hash })
                            await tx.userAuditLog.create({ data: { type: UserAuditLogType.uploadImage, userId: user.id, values: [row.id.toString(), image.hash] } })
                        }
                        mapping.set(image.file, row.id)
                    }
                    let finalContentEN = translated.content
                    let finalContentZH = contentChinese
                    for (const [file, id] of mapping) {
                        const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                        const expression = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${escaped}[^)]*\\)`, 'g')
                        finalContentEN = finalContentEN.replace(expression, `![](helium-media://${id})`)
                        finalContentZH = finalContentZH.replace(expression, `![](helium-media://${id})`)
                    }
                    const plateContentEN = serializePlateValue(deserializeMarkdownToPlate(finalContentEN))
                    const plateContentZH = serializePlateValue(deserializeMarkdownToPlate(finalContentZH))
                    log('Article content prepared', {
                        finalContentEN,
                        finalContentZH,
                        imageMapping: Object.fromEntries(mapping)
                    })
                    const baseSlug = translated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 8).join('-') || 'wechat-article'
                    let slug = baseSlug
                    if (await tx.contentEntity.findUnique({ where: { slug }, select: { id: true } })) slug = `${baseSlug}-${task.id}`
                    signal.throwIfAborted()
                    const post = await tx.contentEntity.create({ data: {
                        type: EntityType.post, titleDraftEN: translated.title, titleDraftZH: titleChinese,
                        categoryEN: category.categoryEN, categoryZH: category.categoryZH,
                            slug, contentDraftEN: plateContentEN, contentDraftZH: plateContentZH,
                        coverImageDraftId: coverImageId, createdAt: date, creatorId: user.id
                    } })
                    postId = post.id
                    log('Article record created', { postId, slug, titleEN: translated.title, titleZH: titleChinese })
                    await tx.userAuditLog.create({ data: { type: UserAuditLogType.writerCreateEntity, userId: user.id, values: [post.id.toString(), translated.title] } })
                    signal.throwIfAborted()
                }, { timeout: 60000 })
                log('Article transaction committed', { postId })
                // Cancellation can arrive while the transaction is committing.
                signal.throwIfAborted()
                await fs.rm(directory, { recursive: true, force: true })
                log('Temporary article directory removed', { directory })
                signal.throwIfAborted()
                task.cleanup = undefined
                postId = undefined
                createdImages.length = 0
                writtenFiles.clear()
            } catch (error) {
                log('Article save failed; removing created records and files', error)
                if (postId !== undefined) await prisma.contentEntity.deleteMany({ where: { id: postId } })
                postId = undefined
                if (createdImages.length) await prisma.image.deleteMany({ where: { id: { in: createdImages } } })
                createdImages.length = 0
                await removeFiles()
                throw error
            }
        })
    } catch (error) {
        log('Sync step failed', { stage: task.status, error })
        try {
            await task.cleanup?.()
        } catch (cleanupError) {
            log('Failure cleanup failed', cleanupError)
            throw new AggregateError([ error, cleanupError ], '同步失败，清理过程中发生错误。')
        }
        throw error
    }
}

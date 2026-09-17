'use client'

import {
    Alert, Button, Card, Label, Modal, ModalBody, ModalFooter, ModalHeader, Progress, TextInput
} from 'flowbite-react'
import { HiArrowUpTray } from 'react-icons/hi2'
import { useEffect, useRef, useState } from 'react'
import type { Image } from '@/generated/prisma/browser'
import { createMedia, deletePendingImageUpload, type MediaType } from '@/app/studio/media/media-actions'
import { createClientId } from '@/app/lib/client-id'

type UploadStatus = 'uploading' | 'cancelling' | 'complete' | 'error'

type UploadTask = {
    id: string
    fileKey: string
    fileName: string
    startedAt: number
    progress: number
    status: UploadStatus
    error?: string
    hash?: string
    mediaType?: MediaType
    extension?: string
    mimeType?: string
    xhr?: XMLHttpRequest
}

let uploadTasks: UploadTask[] = []
const taskListeners = new Set<(tasks: UploadTask[]) => void>()

function publishTasks() {
    const snapshot = [ ...uploadTasks ]
    taskListeners.forEach(listener => listener(snapshot))
}

function updateTask(id: string, update: Partial<UploadTask>) {
    uploadTasks = uploadTasks.map(task => task.id === id ? { ...task, ...update } : task)
    publishTasks()
}

function removeTask(id: string) {
    uploadTasks = uploadTasks.filter(task => task.id !== id)
    publishTasks()
}

function fileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}:${file.type}`
}

function uploadErrorMessage(error: string): string {
    return ({
        network: '网络错误，请稍后再试。',
        'no-permission': '你没有权限执行此操作。',
        'no-file': '未检测到文件，请重试。',
        'unsupported-media': '支持图片、MP4、WebM、MOV 和 OGV 视频。',
        'file-too-large': '图片不得超过 20 MB，视频不得超过 250 MB。',
        duplicate: '该媒体已存在，无需重复上传。',
        'upload-failed': '媒体处理失败，请重试。',
        invalid: '服务器返回了无效响应，请重试。'
    } as Record<string, string>)[error] ?? error
}

export default function UploadAreaClient({ uploadPrefix, allowedMediaTypes, onAdded }: {
    uploadPrefix: string,
    allowedMediaTypes: MediaType[],
    onAdded: (image: Image) => void
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [ tasks, setTasks ] = useState<UploadTask[]>(() => [ ...uploadTasks ])
    const [ actionError, setActionError ] = useState('')
    const [ metadataTaskId, setMetadataTaskId ] = useState<string | null>(null)
    const [ imageName, setImageName ] = useState('')
    const [ imageAlt, setImageAlt ] = useState('')
    const [ savingMetadata, setSavingMetadata ] = useState(false)

    useEffect(() => {
        taskListeners.add(setTasks)
        return () => {
            taskListeners.delete(setTasks)
        }
    }, [])

    const metadataTask = tasks.find(task => task.id === metadataTaskId && task.status === 'complete')

    function startUpload(file: File) {
        const mediaType: MediaType | null = file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/') ? 'video' : null
        if (mediaType == null || !allowedMediaTypes.includes(mediaType)) {
            setActionError(mediaType === 'video' ? '此媒体选择器不支持视频。' : '此媒体选择器不支持该文件。')
            return
        }
        const key = fileKey(file)
        if (uploadTasks.some(task => task.fileKey === key)) {
            setActionError(`无法重复添加 ${file.name}。`)
            return
        }

        setActionError('')
        const id = createClientId()
        const xhr = new XMLHttpRequest()
        const task: UploadTask = {
            id,
            fileKey: key,
            fileName: file.name,
            startedAt: Date.now(),
            progress: 0,
            status: 'uploading',
            xhr
        }
        uploadTasks = [ task, ...uploadTasks ]
        publishTasks()

        const formData = new FormData()
        formData.append('file', file)
        xhr.open('POST', '/studio/media/upload', true)
        xhr.upload.onprogress = event => {
            if (event.lengthComputable) updateTask(id, { progress: Math.round((event.loaded / event.total) * 100) })
        }
        xhr.onload = () => {
            let response: {
                hash?: string,
                mediaType?: MediaType,
                extension?: string,
                mimeType?: string,
                error?: string
            }
            try {
                response = JSON.parse(xhr.responseText) as typeof response
            } catch {
                response = { error: 'invalid' }
            }

            if (response.hash) {
                const duplicate = uploadTasks.some(other => other.id !== id && other.hash === response.hash)
                const validMetadata = response.mediaType != null && response.extension != null && response.mimeType != null
                updateTask(id, duplicate || !validMetadata
                    ? {
                        status: 'error', progress: 100,
                        error: uploadErrorMessage(duplicate ? 'duplicate' : 'invalid'), xhr: undefined
                    }
                    : {
                        status: 'complete', progress: 100, hash: response.hash,
                        mediaType: response.mediaType, extension: response.extension,
                        mimeType: response.mimeType, xhr: undefined
                    })
                return
            }
            updateTask(id, {
                status: 'error', progress: 100,
                error: uploadErrorMessage(response.error ?? 'invalid'), xhr: undefined
            })
        }
        xhr.onerror = () => updateTask(id, {
            status: 'error', progress: 100, error: uploadErrorMessage('network'), xhr: undefined
        })
        xhr.onabort = () => removeTask(id)
        xhr.send(formData)
    }

    function addFiles(files: FileList | File[]) {
        Array.from(files).forEach(startUpload)
        if (inputRef.current) inputRef.current.value = ''
    }

    async function deleteTask(task: UploadTask) {
        setActionError('')
        try {
            if (task.status === 'uploading') {
                updateTask(task.id, { status: 'cancelling' })
                task.xhr?.abort()
                return
            }
            if (task.hash) await deletePendingImageUpload(task.hash, task.extension)
            removeTask(task.id)
        } catch (error) {
            console.error('Failed to delete media upload task:', error)
            setActionError('删除上传任务失败，请重试。')
        }
    }

    return <>
        <Modal show={metadataTask != null} size="md" popup onClose={() => setMetadataTaskId(null)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">设置媒体信息</h3>
                    <div>
                        <div className="mb-2 block"><Label htmlFor="upload-image-name">名称</Label></div>
                        <TextInput id="upload-image-name" value={imageName}
                                   onChange={event => setImageName(event.currentTarget.value)} required/>
                    </div>
                    <div>
                        <div className="mb-2 block"><Label htmlFor="upload-image-alt">解释文字</Label></div>
                        <TextInput id="upload-image-alt" value={imageAlt}
                                   placeholder="简单说明媒体内容，由屏幕阅读器读出..."
                                   onChange={event => setImageAlt(event.currentTarget.value)} required/>
                    </div>
                    {metadataTask?.hash && metadataTask.mediaType === 'image' &&
                        <img width={500} height={200}
                             src={`${uploadPrefix}/${metadataTask.hash}.${metadataTask.extension}`} alt="已上传文件"
                             className="w-full rounded-3xl object-cover lg:max-w-sm"/>}
                    {metadataTask?.hash && metadataTask.mediaType === 'video' &&
                        <video controls preload="metadata" className="w-full rounded-3xl lg:max-w-sm">
                            <source src={`${uploadPrefix}/${metadataTask.hash}.${metadataTask.extension}`}
                                    type={metadataTask.mimeType}/>
                        </video>}
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" disabled={savingMetadata || !imageName.trim() || !imageAlt.trim()}
                        onClick={async () => {
                            if (!metadataTask?.hash) return
                            setSavingMetadata(true)
                            setActionError('')
                            try {
                                if (!metadataTask.mediaType || !metadataTask.extension || !metadataTask.mimeType) return
                                const image = await createMedia({
                                    name: imageName.trim(), altText: imageAlt.trim(), sha1: metadataTask.hash,
                                    mediaType: metadataTask.mediaType, extension: metadataTask.extension,
                                    mimeType: metadataTask.mimeType
                                })
                                removeTask(metadataTask.id)
                                setMetadataTaskId(null)
                                onAdded(image)
                            } catch (error) {
                                console.error('Failed to add uploaded media:', error)
                                setActionError('加入媒体库失败，请重试。')
                            } finally {
                                setSavingMetadata(false)
                            }
                        }}>确认</Button>
                <Button pill color="alternative" disabled={savingMetadata}
                        onClick={() => setMetadataTaskId(null)}>取消</Button>
            </ModalFooter>
        </Modal>

        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
            <input ref={inputRef} type="file" multiple
                   accept={[
                       allowedMediaTypes.includes('image') ? 'image/*' : '',
                       allowedMediaTypes.includes('video') ? 'video/mp4,video/webm,video/quicktime,video/ogg' : ''
                   ].filter(Boolean).join(',')}
                   className="hidden" aria-label="选择要上传的媒体" onChange={event => {
                if (event.currentTarget.files) addFiles(event.currentTarget.files)
            }}/>
            <button type="button"
                    className="w-full rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={event => event.preventDefault()} onDrop={event => {
                event.preventDefault()
                addFiles(event.dataTransfer.files)
            }}>
                <HiArrowUpTray className="mx-auto mb-2 size-8 text-gray-400" aria-hidden="true"/>
                <p className="font-semibold text-gray-700">选择媒体或拖拽到此处</p>
                <p className="mt-1 text-sm text-gray-500">图片大小上限为 20 MB，视频大小上限为 250 MB。</p>
            </button>

            {actionError && <Alert color="failure" className="xl:col-span-2">{actionError}</Alert>}
            {tasks.map(task => {
                const status = {
                    uploading: `正在上传 ${task.progress}%`, cancelling: '正在取消',
                    complete: '上传完成', error: '上传失败'
                }[task.status]
                return <Card key={task.id} theme={{
                    root: {
                        base: 'flex rounded-3xl border-0 bg-gray-50 shadow-none',
                        children: 'flex h-full flex-col justify-center gap-3 p-5'
                    }
                }}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <h3 className="break-words font-semibold text-gray-900">{task.fileName}</h3>
                            <p className="text-sm text-gray-500">{new Date(task.startedAt).toLocaleString('zh-CN')}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            <Button pill size="sm"
                                    color={task.status === 'error' ? 'red' : 'alternative'}
                                    disabled={task.status === 'cancelling'} onClick={() => void deleteTask(task)}>
                                {task.status === 'uploading' ? '取消任务' : '删除任务'}
                            </Button>
                            {task.status === 'complete' && <Button pill size="sm" color="blue" onClick={() => {
                                setImageName(task.fileName.replace(/\.[^.]+$/, ''))
                                setImageAlt('')
                                setMetadataTaskId(task.id)
                            }}>加入媒体库</Button>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1"><Progress progress={task.progress}
                                                          color={task.status === 'error' ? 'red' : task.status === 'complete' ? 'green' : 'blue'}
                                                          aria-label={`${task.fileName}: ${status}`}/></div>
                        <span role="status" className="text-sm text-gray-600">{status}</span>
                    </div>
                    {task.error && <Alert color="failure">{task.error}</Alert>}
                    {task.status === 'complete' && task.hash && task.mediaType === 'image' &&
                        <img width={500} height={200} src={`${uploadPrefix}/${task.hash}_thumb.webp`}
                             alt="" aria-hidden="true" className="h-28 w-40 rounded-3xl object-cover"/>}
                    {task.status === 'complete' && task.hash && task.mediaType === 'video' &&
                        <img width={500} height={200} src={`${uploadPrefix}/${task.hash}_thumb.webp`}
                             alt="" aria-hidden="true" className="h-28 w-40 rounded-3xl bg-black object-cover"/>}
                </Card>
            })}
        </div>
    </>
}

export enum WeChatWorkerStatus {
    idle = 'idle',
    download = 'download',
    imageClassification = 'imageClassification',
    sanitization = 'sanitization',
    translation = 'translation',
    savingImages = 'savingImages',
    creatingPost = 'creatingPost'
}

export type WeChatTask = {
    id: string
    startedAt: number
    title?: string
    status: Exclude<WeChatWorkerStatus, WeChatWorkerStatus.idle> | 'error' | 'cancelling'
    error?: string
    canCancel: boolean
}

export enum AlignEntityResponse {
    success = 'success',
    insufficientApprovals = 'insufficientApprovals',
    notFound = 'notFound'
}

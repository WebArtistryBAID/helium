export enum WeChatWorkerStatus {
    idle = 'idle',
    download = 'download',
    imageClassification = 'imageClassification',
    sanitization = 'sanitization',
    translation = 'translation',
    savingImages = 'savingImages',
    creatingPost = 'creatingPost'
}

export type WeChatDebugEntry = {
    timestamp: number
    stage: string
    event: string
    details: string
}

export type WeChatTask = {
    id: string
    startedAt: number
    title?: string
    status: Exclude<WeChatWorkerStatus, WeChatWorkerStatus.idle> | 'error' | 'cancelling' | 'completed'
    error?: string
    canCancel: boolean
    debug: boolean
    logs?: WeChatDebugEntry[]
}

export enum AlignEntityResponse {
    success = 'success',
    insufficientApprovals = 'insufficientApprovals',
    unresolvedFeedback = 'unresolvedFeedback',
    notFound = 'notFound'
}

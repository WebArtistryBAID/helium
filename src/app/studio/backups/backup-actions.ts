'use server'

import type { BackupFile } from '@/app/lib/backups'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/backups'

export async function getBackupsAction(): Promise<BackupFile[]> {
    return services.getBackupsAction(await getStudioActor())
}

export async function createManualBackupAction(): Promise<BackupFile[]> {
    return services.createManualBackupAction(await getStudioActor())
}

export async function restoreBackupAction(filename: string): Promise<{ backups: BackupFile[]; restoredCount: number }> {
    return services.restoreBackupAction(await getStudioActor(), filename)
}

export async function deleteBackupAction(filename: string): Promise<BackupFile[]> {
    return services.deleteBackupAction(await getStudioActor(), filename)
}

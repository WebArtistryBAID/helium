'use server'

import { Role } from '@/generated/prisma/client'
import { requireUserWithRole } from '@/app/login/login-actions'
import {
    createContentBackup,
    deleteBackupFile,
    listBackups,
    pruneOldBackups,
    restoreContentBackup
} from '@/app/lib/backups'
import type { BackupFile } from '@/app/lib/backups'

export async function getBackupsAction(): Promise<BackupFile[]> {
    await requireUserWithRole(Role.admin)
    return listBackups()
}

export async function createManualBackupAction(): Promise<BackupFile[]> {
    await requireUserWithRole(Role.admin)
    await createContentBackup('manual')
    await pruneOldBackups()
    return listBackups()
}

export async function restoreBackupAction(filename: string): Promise<{ backups: BackupFile[]; restoredCount: number }> {
    await requireUserWithRole(Role.admin)
    const restoredCount = await restoreContentBackup(filename)
    return {
        backups: await listBackups(),
        restoredCount
    }
}

export async function deleteBackupAction(filename: string): Promise<BackupFile[]> {
    await requireUserWithRole(Role.admin)
    await deleteBackupFile(filename)
    return listBackups()
}

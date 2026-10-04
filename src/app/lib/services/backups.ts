import 'server-only'

import type { OperationActor } from '@/app/lib/mcp/contracts'
import { requireActorUser } from '@/app/lib/services/actor'

import { Role } from '@/generated/prisma/client'

import {
    createContentBackup,
    deleteBackupFile,
    listBackups,
    pruneOldBackups,
    restoreContentBackup,
    readBackupFile
} from '@/app/lib/backups'
import type { BackupFile } from '@/app/lib/backups'
import { invalidateCollaborationDocuments } from '@/app/lib/collaboration/invalidate'

export async function downloadBackup(actor: OperationActor, filename: string, maxBytes?: number): Promise<Buffer> {
    await requireActorUser(actor, Role.admin)
    return readBackupFile(filename, maxBytes)
}

export async function getBackupsAction(actor: OperationActor): Promise<BackupFile[]> {
    await requireActorUser(actor, Role.admin)
    return listBackups()
}

export async function createManualBackupAction(actor: OperationActor): Promise<BackupFile[]> {
    await requireActorUser(actor, Role.admin)
    await createContentBackup('manual')
    await pruneOldBackups()
    return listBackups()
}

export async function restoreBackupAction(actor: OperationActor, filename: string): Promise<{
    backups: BackupFile[];
    restoredCount: number
}> {
    await requireActorUser(actor, Role.admin)
    await invalidateCollaborationDocuments()
    const restoredCount = await restoreContentBackup(filename)
    await invalidateCollaborationDocuments()
    return {
        backups: await listBackups(),
        restoredCount
    }
}

export async function deleteBackupAction(actor: OperationActor, filename: string): Promise<BackupFile[]> {
    await requireActorUser(actor, Role.admin)
    await deleteBackupFile(filename)
    return listBackups()
}

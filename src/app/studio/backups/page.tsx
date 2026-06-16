import { Role } from '@/generated/prisma/client'
import { requireUserWithRole } from '@/app/login/login-actions'
import { listBackups } from '@/app/lib/backups'
import BackupManager from '@/app/studio/backups/BackupManager'

export default async function BackupsPage() {
    await requireUserWithRole(Role.admin)

    return <div className="p-16">
        <h1 className="text-2xl mb-3">备份管理</h1>
        <BackupManager initialBackups={await listBackups()}/>
    </div>
}

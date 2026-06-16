'use client'

import { useState, useTransition } from 'react'
import { Badge, Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react'
import type { BackupFile } from '@/app/lib/backups'
import {
    createManualBackupAction,
    deleteBackupAction,
    restoreBackupAction
} from '@/app/studio/backups/backup-actions'
import If from '@/app/lib/If'

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: string): string {
    return new Date(value).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function backupModeLabel(mode: BackupFile['mode']): string {
    return {
        automatic: '自动',
        manual: '手动',
        unknown: '未知'
    }[mode]
}

function backupModeColor(mode: BackupFile['mode']) {
    return {
        automatic: 'info',
        manual: 'success',
        unknown: 'gray'
    }[mode]
}

export default function BackupManager({ initialBackups }: { initialBackups: BackupFile[] }) {
    const [ backups, setBackups ] = useState(initialBackups)
    const [ message, setMessage ] = useState('')
    const [ error, setError ] = useState('')
    const [ pendingFilename, setPendingFilename ] = useState<string | null>(null)
    const [ pendingAction, setPendingAction ] = useState<'create' | 'restore' | 'delete' | null>(null)
    const [ confirmAction, setConfirmAction ] = useState<{
        action: 'restore' | 'delete';
        filename: string
    } | null>(null)
    const [ isPending, startTransition ] = useTransition()

    function createBackup() {
        setError('')
        setMessage('')
        setPendingFilename(null)
        setPendingAction('create')
        startTransition(async () => {
            try {
                const next = await createManualBackupAction()
                setBackups(next)
                setMessage('已创建手动备份。')
            } catch (e) {
                setError(e instanceof Error ? e.message : '创建备份失败。')
            } finally {
                setPendingAction(null)
            }
        })
    }

    function restoreBackup(filename: string) {
        setError('')
        setMessage('')
        setPendingFilename(filename)
        setPendingAction('restore')
        startTransition(async () => {
            try {
                const result = await restoreBackupAction(filename)
                setBackups(result.backups)
                setMessage(`已从备份恢复 ${result.restoredCount} 个页面。`)
            } catch (e) {
                setError(e instanceof Error ? e.message : '恢复备份失败。')
            } finally {
                setPendingFilename(null)
                setPendingAction(null)
            }
        })
    }

    function deleteBackup(filename: string) {
        setError('')
        setMessage('')
        setPendingFilename(filename)
        setPendingAction('delete')
        startTransition(async () => {
            try {
                const next = await deleteBackupAction(filename)
                setBackups(next)
                setMessage('已删除备份。')
            } catch (e) {
                setError(e instanceof Error ? e.message : '删除备份失败。')
            } finally {
                setPendingFilename(null)
                setPendingAction(null)
            }
        })
    }

    function runConfirmedAction() {
        if (confirmAction == null) return
        const { action, filename } = confirmAction
        setConfirmAction(null)
        if (action === 'restore') {
            restoreBackup(filename)
        } else {
            deleteBackup(filename)
        }
    }

    const confirmTitle = confirmAction?.action === 'restore' ? '恢复备份' : '删除备份'
    const confirmDescription = confirmAction?.action === 'restore'
        ? '恢复备份会用该备份中的页面替换当前所有页面。'
        : '删除备份文件后无法撤销。'
    const confirmButtonLabel = confirmAction?.action === 'restore' ? '恢复' : '删除'
    const confirmButtonColor = confirmAction?.action === 'restore' ? 'blue' : 'failure'

    return <>
        <Modal show={confirmAction != null} size="md" popup onClose={() => setConfirmAction(null)}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">{confirmTitle}</h3>
                    <div className="space-y-3 text-sm">
                        <p>{confirmDescription}</p>
                        <p className="break-all rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">
                            {confirmAction?.filename}
                        </p>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color={confirmButtonColor} disabled={isPending} onClick={runConfirmedAction}>
                    {confirmButtonLabel}
                </Button>
                <Button pill color="alternative" disabled={isPending} onClick={() => setConfirmAction(null)}>
                    取消
                </Button>
            </ModalFooter>
        </Modal>

        <div>
            <div className="mb-6 flex items-center gap-3">
                <Button color="blue" onClick={createBackup} disabled={isPending}>
                    {pendingAction === 'create' ? '正在创建...' : '创建手动备份'}
                </Button>
            </div>

            <div aria-live="polite" aria-atomic="true">
                <If condition={message !== ''}>
                    <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                        {message}
                    </p>
                </If>
                <If condition={error !== ''}>
                    <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </p>
                </If>
            </div>

            <If condition={backups.length < 1}>
                <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
                    <p className="font-bold text-gray-900">还没有备份</p>
                    <p className="mt-1 text-sm text-gray-500">创建手动备份，或等待每日自动备份任务运行。</p>
                </div>
            </If>

            <If condition={backups.length > 0}>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full table-fixed divide-y divide-gray-200 text-left text-sm">
                        <caption className="sr-only">页面备份列表</caption>
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th scope="col" className="px-4 py-3">文件</th>
                            <th scope="col" className="w-28 px-4 py-3">类型</th>
                            <th scope="col" className="w-44 px-4 py-3">创建时间</th>
                            <th scope="col" className="w-28 px-4 py-3">大小</th>
                            <th scope="col" className="w-72 px-4 py-3">操作</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                        {backups.map(backup => <tr key={backup.filename} className="hover:bg-gray-50">
                            <th scope="row" className="px-4 py-4">
                                <span
                                    className="block truncate font-mono text-xs text-gray-700">{backup.filename}</span>
                            </th>
                            <td className="px-4 py-4">
                                <Badge color={backupModeColor(backup.mode)}>{backupModeLabel(backup.mode)}</Badge>
                            </td>
                            <td className="px-4 py-4 text-gray-700">{formatDate(backup.createdAt)}</td>
                            <td className="px-4 py-4 text-gray-700">{formatSize(backup.size)}</td>
                            <td className="px-4 py-4">
                                <div className="flex gap-2">
                                    <Button as="a"
                                            href={backup.downloadPath}
                                            color="alternative"
                                            aria-label={`下载备份 ${backup.filename}`}>
                                        下载
                                    </Button>
                                    <Button color="red"
                                            disabled={isPending}
                                            onClick={() => setConfirmAction({
                                                action: 'restore',
                                                filename: backup.filename
                                            })}
                                            aria-label={`从备份 ${backup.filename} 恢复`}>
                                        {pendingAction === 'restore' && pendingFilename === backup.filename ? '正在恢复...' : '恢复'}
                                    </Button>
                                    <Button color="failure"
                                            disabled={isPending}
                                            onClick={() => setConfirmAction({
                                                action: 'delete',
                                                filename: backup.filename
                                            })}
                                            aria-label={`删除备份 ${backup.filename}`}>
                                        {pendingAction === 'delete' && pendingFilename === backup.filename ? '正在删除...' : '删除'}
                                    </Button>
                                </div>
                            </td>
                        </tr>)}
                        </tbody>
                    </table>
                </div>
            </If>
        </div>
    </>
}

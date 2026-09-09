'use client'

import { useState } from 'react'
import { Alert, Button, Checkbox, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react'
import { EntityType, Role } from '@/generated/prisma/browser'
import {
    ApprovalNotificationRecipients,
    getApprovalNotificationRecipients,
    requestContentReview
} from '@/app/lib/approval/approval-actions'

export default function ApprovalNotificationDialog({ entityType, entityId, initialRecipients, onClose, onRefresh, onPermissionError }: {
    entityType: EntityType
    entityId: number
    initialRecipients: ApprovalNotificationRecipients
    onClose: () => void
    onRefresh: () => Promise<void>
    onPermissionError: (error: unknown) => boolean
}) {
    const [ options, setOptions ] = useState(initialRecipients)
    const [ selectedIds, setSelectedIds ] = useState<number[]>([])
    const [ sending, setSending ] = useState(false)
    const [ error, setError ] = useState<string | null>(null)

    async function send() {
        if (sending || !options.role || selectedIds.length === 0) {
            return
        }
        setSending(true)
        setError(null)
        try {
            const result = await requestContentReview({ entityType, entityId, role: options.role, recipientIds: selectedIds })
            // Remove successful recipients before refreshing so retries only send failures.
            setSelectedIds(ids => ids.filter(id => !result.sentUserIds.includes(id)))
            if (!result.error) {
                onClose()
                await onRefresh()
                return
            }
            setError(result.error)
            const current = await getApprovalNotificationRecipients({ entityType, entityId })
            setOptions(current)
            setSelectedIds(ids => current.role === options.role
                ? ids.filter(id => current.recipients.some(recipient => recipient.id === id && !recipient.disabled))
                : [])
            await onRefresh()
        } catch (error) {
            if (onPermissionError(error)) {
                onClose()
            } else {
                setError('发送失败，请稍后重试。')
                console.error('Failed to request content review:', error)
            }
        } finally {
            setSending(false)
        }
    }

    return <Modal show size="md" popup onClose={() => { if (!sending) onClose() }}>
        <ModalHeader/>
        <ModalBody>
            <div className="space-y-6">
                <h3 className="text-xl font-bold">选择通知对象</h3>
                {options.role ? <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {options.role === Role.editor ? '编辑员审核' : '管理员审核'}
                    </p>
                    <div className="space-y-3">
                        {options.recipients.map(recipient => <div key={recipient.id} className="flex items-center gap-3">
                            <Checkbox id={`approval-notification-${recipient.id}`}
                                      checked={selectedIds.includes(recipient.id)}
                                      disabled={sending || recipient.disabled}
                                      onChange={event => {
                                          const checked = event.target.checked
                                          setSelectedIds(ids => checked
                                              ? [ ...ids, recipient.id ]
                                              : ids.filter(id => id !== recipient.id))
                                      }}/>
                            <Label htmlFor={`approval-notification-${recipient.id}`}
                                   className={recipient.disabled
                                       ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
                                       : 'cursor-pointer'}>
                                {recipient.name}
                            </Label>
                        </div>)}
                        {options.recipients.length === 0 && <p className="text-sm text-gray-500">暂无通知对象。</p>}
                    </div>
                </> : <p className="text-sm text-gray-600 dark:text-gray-400">审核已完成。</p>}
                {error && <Alert color="failure">{error}</Alert>}
            </div>
        </ModalBody>
        <ModalFooter>
            <Button pill color="blue" disabled={sending || !options.role || selectedIds.length === 0} onClick={send}>
                {sending ? '发送中…' : '发送通知'}
            </Button>
            <Button pill color="alternative" disabled={sending} onClick={onClose}>取消</Button>
        </ModalFooter>
    </Modal>
}

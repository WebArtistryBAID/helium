'use client'

import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { overrideLock } from '@/app/lib/lock/lock-actions'
import { EntityType } from '@/generated/prisma/browser'

export default function LockOverridePrompt({ entityType, entityId, userId }: {
    entityType: EntityType,
    entityId: number,
    userId: number
}) {
    const [ loading, setLoading ] = useState(false)
    const router = useRouter()

    return <Modal show={true} size="md" popup onClose={() => router.push('/studio')}>
        <ModalHeader/>
        <ModalBody>
            <div className="space-y-6">
                <h3 className="text-xl font-bold">其他用户正在编辑</h3>
                <p className="text-sm">如果您希望开始编辑，<span className="font-bold">其他用户会丢失未保存的更改。</span>
                </p>
            </div>
        </ModalBody>
        <ModalFooter>
            <Button disabled={loading} pill color="blue" onClick={async () => {
                setLoading(true)
                const lock = await overrideLock({
                    entityType,
                    entityId,
                    userId
                })
                setLoading(false)
                router.push(entityType === EntityType.page ? `/studio/pages/${entityId}/editor?token=${lock.token}` : `/studio/editor/${entityId}?token=${lock.token}`)
            }}>覆盖并继续</Button>
            <Button disabled={loading} pill color="alternative" onClick={() => router.push('/studio')}>
                取消
            </Button>
        </ModalFooter>
    </Modal>
}

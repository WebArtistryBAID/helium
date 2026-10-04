'use client'

import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react'
import { useRouter } from 'next/navigation'

export default function PermissionDenied() {
    const router = useRouter()
    const leave = () => router.replace('/')

    return <main className="min-h-screen bg-gray-100">
        <Modal show size="md" popup onClose={leave}>
            <ModalHeader/>
            <ModalBody>
                <div className="space-y-6">
                    <h1 className="text-xl font-bold">账号未配置</h1>
                    <p className="text-sm">您的账号尚未配置权限组，请联系管理员。</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button pill color="blue" onClick={leave}>退出</Button>
            </ModalFooter>
        </Modal>
    </main>
}

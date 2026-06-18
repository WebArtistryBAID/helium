'use client'

import { useCallback, useState } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react'

const UNAUTHORIZED_PATTERNS = [
    'Unauthorized',
    'unauthorized',
    'NEXT_PUBLIC_PERMISSION_DENIED'
]

export function isPermissionError(error: unknown): boolean {
    if (error instanceof Error) {
        return UNAUTHORIZED_PATTERNS.some(pattern => error.message.includes(pattern))
    }
    return typeof error === 'string' && UNAUTHORIZED_PATTERNS.some(pattern => error.includes(pattern))
}

export function usePermissionDialog() {
    const [ permissionDenied, setPermissionDenied ] = useState(false)
    const showPermissionDenied = useCallback(() => setPermissionDenied(true), [])
    const closePermissionDenied = useCallback(() => setPermissionDenied(false), [])
    const handlePermissionError = useCallback((error: unknown) => {
        if (isPermissionError(error)) {
            setPermissionDenied(true)
            return true
        }
        return false
    }, [])

    return {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    }
}

export function PermissionDeniedDialog({ show, onClose }: {
    show: boolean
    onClose: () => void
}) {
    return <Modal show={show} size="md" popup onClose={onClose}>
        <ModalHeader/>
        <ModalBody>
            <div className="space-y-3">
                <h3 className="text-xl font-bold">权限不足</h3>
                <p className="text-sm text-gray-600">
                    此账号无法执行此操作。
                </p>
            </div>
        </ModalBody>
        <ModalFooter>
            <Button pill color="blue" onClick={onClose}>确认</Button>
        </ModalFooter>
    </Modal>
}

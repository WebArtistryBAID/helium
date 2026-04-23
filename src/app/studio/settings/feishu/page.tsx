'use client'

import { useState, useEffect } from 'react'
import { Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Badge, Modal, ModalBody, ModalHeader, ModalFooter } from 'flowbite-react'
import { getFeishuMessages } from '@/app/studio/settings/feishu-actions'

interface FeishuMessage {
    id: string
    type: string
    recipient: string
    recipientId: string
    content: string
    status: string
    createdAt: string | Date
    sentAt?: string | Date | null
    error?: string | null
}

export default function FeishuManagement() {
    const [ messages, setMessages ] = useState<FeishuMessage[]>([])
    const [ loading, setLoading ] = useState(true)
    const [ selectedMessage, setSelectedMessage ] = useState<FeishuMessage | null>(null)
    const [ showDetail, setShowDetail ] = useState(false)

    useEffect(() => {
        fetchMessages()
    }, [])

    async function fetchMessages() {
        try {
            const data = await getFeishuMessages()
            setMessages(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to fetch messages:', err)
            setMessages([])
        } finally {
            setLoading(false)
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'sent':
                return <Badge color="green">已发送</Badge>
            case 'pending':
                return <Badge color="yellow">待发送</Badge>
            case 'failed':
                return <Badge color="red">失败</Badge>
            default:
                return <Badge>未知</Badge>
        }
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">飞书消息管理</h1>

            <div className="mb-4">
                <Button onClick={fetchMessages} disabled={loading}>
                    {loading ? '加载中...' : '刷新'}
                </Button>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeadCell>收件人</TableHeadCell>
                            <TableHeadCell>消息类型</TableHeadCell>
                            <TableHeadCell>状态</TableHeadCell>
                            <TableHeadCell>发送时间</TableHeadCell>
                            <TableHeadCell>操作</TableHeadCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {messages.map(msg => (
                            <TableRow key={msg.id}>
                                <TableCell>{msg.recipient}</TableCell>
                                <TableCell>{msg.type}</TableCell>
                                <TableCell>{getStatusBadge(msg.status)}</TableCell>
                                <TableCell>{new Date(msg.createdAt).toLocaleString('zh-CN')}</TableCell>
                                <TableCell>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setSelectedMessage(msg)
                                            setShowDetail(true)
                                        }}
                                    >
                                        查看
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Modal show={showDetail} onClose={() => setShowDetail(false)}>
                <ModalHeader>消息详情</ModalHeader>
                <ModalBody>
                    {selectedMessage && (
                        <div className="space-y-4">
                            <div>
                                <p className="font-bold">收件人：</p>
                                <p>{selectedMessage.recipient}</p>
                            </div>
                            <div>
                                <p className="font-bold">消息类型：</p>
                                <p>{selectedMessage.type}</p>
                            </div>
                            <div>
                                <p className="font-bold">内容：</p>
                                <p className="bg-gray-100 p-3 rounded">{selectedMessage.content}</p>
                            </div>
                            <div>
                                <p className="font-bold">状态：</p>
                                <p>{getStatusBadge(selectedMessage.status)}</p>
                            </div>
                            {selectedMessage.error && (
                                <div>
                                    <p className="font-bold">错误：</p>
                                    <p className="text-red-600">{selectedMessage.error}</p>
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
            </Modal>
        </div>
    )
}

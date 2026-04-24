'use client'

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Badge } from 'flowbite-react'

interface FeishuMessage {
    id: string
    recipient: string
    recipientId: string
    content: string
    status: string
    createdAt: string
    sentAt?: string
}

export default function ChatSettings() {
    const [ messages, setMessages ] = useState<FeishuMessage[]>([])
    const [ loading, setLoading ] = useState(true)

    useEffect(() => {
        fetchMessages()
    }, [])

    async function fetchMessages() {
        try {
            const res = await fetch('/api/feishu/messages')
            const data = await res.json()
            setMessages(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to fetch messages:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">飞书消息</h1>

            <div className="overflow-x-auto">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeadCell>收件人</TableHeadCell>
                            <TableHeadCell>内容</TableHeadCell>
                            <TableHeadCell>状态</TableHeadCell>
                            <TableHeadCell>发送时间</TableHeadCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {messages.map(msg => (
                            <TableRow key={msg.id}>
                                <TableCell>{msg.recipient}</TableCell>
                                <TableCell className="max-w-xs truncate">{msg.content}</TableCell>
                                <TableCell>
                                    <Badge color={msg.status === 'sent' ? 'green' : msg.status === 'pending' ? 'yellow' : 'red'}>
                                        {msg.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{new Date(msg.createdAt).toLocaleString('zh-CN')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/enums'

export async function GET(req: NextRequest) {
    try {
        await requireUserWithRole(Role.admin)

        const messages = await prisma.feishuMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        return NextResponse.json(messages)
    } catch (err) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const message = await prisma.feishuMessage.create({
            data: {
                type: body.type,
                recipient: body.recipient,
                recipientId: body.recipientId,
                content: body.content,
                status: 'pending'
            }
        })

        return NextResponse.json(message)
    } catch (err) {
        return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/enums'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
    try {
        const { id, action } = await params
        await requireUserWithRole(Role.admin)
        console.log(`${action} approval ${id}`)
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}

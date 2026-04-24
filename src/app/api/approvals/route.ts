import { NextRequest, NextResponse } from 'next/server'
import { requireUserWithRole } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/enums'

export async function GET(req: NextRequest) {
    try {
        await requireUserWithRole(Role.admin)

        // 这里返回待审核的内容列表
        // 暂时返回空数组
        return NextResponse.json([])
    } catch (err) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/generated/prisma/client'
import { requireUserWithRole } from '@/app/login/login-actions'
import { readBackupFile } from '@/app/lib/backups'

export async function GET(_req: NextRequest, { params }: {
    params: Promise<{ filename: string }>
}): Promise<Response> {
    await requireUserWithRole(Role.admin)
    const { filename } = await params
    const file = await readBackupFile(decodeURIComponent(filename))
    const body = new Uint8Array(file)

    return new NextResponse(body, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Length': file.length.toString(),
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        }
    })
}

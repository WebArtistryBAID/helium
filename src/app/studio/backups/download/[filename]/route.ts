import { NextRequest, NextResponse } from 'next/server'
import { getStudioActor } from '@/app/lib/services/studio-actor'
import { downloadBackup } from '@/app/lib/services/backups'

export async function GET(_req: NextRequest, { params }: {
    params: Promise<{ filename: string }>
}): Promise<Response> {
    const actor = await getStudioActor()
    const { filename } = await params
    const file = await downloadBackup(actor, decodeURIComponent(filename))
    const body = new Uint8Array(file)

    return new NextResponse(body, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Length': file.length.toString(),
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        }
    })
}

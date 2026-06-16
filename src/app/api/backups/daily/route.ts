import { NextRequest, NextResponse } from 'next/server'
import { createContentBackup, pruneOldBackups } from '@/app/lib/backups'

export async function GET(req: NextRequest): Promise<Response> {
    const cronKey = process.env.CRON_KEY
    if (!cronKey) {
        return NextResponse.json({ error: 'cron-key-not-configured' }, { status: 500 })
    }

    if (req.nextUrl.searchParams.get('key') !== cronKey) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const result = await createContentBackup('automatic')
    const pruned = await pruneOldBackups()

    return NextResponse.json({
        backup: result.backup,
        created: result.created,
        pruned
    })
}

import ContentEntityEditor from '@/app/studio/editor/[id]/ContentEntityEditor'
import { redirect } from 'next/navigation'
import { requireUser } from '@/app/login/login-actions'
import { tryAcquireLock } from '@/app/lib/lock/lock-typicals'
import { getContentEntity } from '@/app/studio/editor/entity-actions'

export default async function StudioContentEntityEditor({ params, searchParams }: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ token?: string | null }>
}) {
    const user = await requireUser()

    const entity = await getContentEntity(parseInt((await params).id))
    if (entity == null) {
        redirect('/studio')
    }
    if (entity.type === 'page') {
        redirect(`/studio/pages/${entity.id}/editor?token=${(await searchParams).token ?? ''}`)
    }

    const token = await tryAcquireLock({
        entityType: entity.type,
        entityId: entity.id,
        userId: user.id,
        currentToken: (await searchParams).token ?? undefined
    })
    if (typeof token !== 'string') {
        return token
    }

    return <ContentEntityEditor
        init={entity}
        user={user}
        lockToken={token}
        uploadPrefix={process.env.UPLOAD_SERVE_PATH!}
    />
}

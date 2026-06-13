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
    const requestedToken = (await searchParams).token ?? undefined
    if (entity.type === 'page') {
        redirect(`/studio/pages/${entity.id}/editor?token=${requestedToken ?? ''}`)
    }

    const token = await tryAcquireLock({
        entityType: entity.type,
        entityId: entity.id,
        currentToken: requestedToken
    })
    if (typeof token !== 'string') {
        return token
    }
    if (requestedToken !== token) {
        redirect(`/studio/editor/${entity.id}?token=${token}`)
    }

    return <div className="p-16">
        <ContentEntityEditor init={entity} user={user}
                             lockToken={token} uploadPrefix={process.env.UPLOAD_SERVE_PATH!}/>
    </div>
}

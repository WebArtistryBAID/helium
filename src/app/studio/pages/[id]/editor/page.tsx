import { redirect } from 'next/navigation'
import { requireUser } from '@/app/login/login-actions'
import { tryAcquireLock } from '@/app/lib/lock/lock-typicals'
import { getContentEntity } from '@/app/studio/editor/entity-actions'
import PageEditor from '@/app/studio/pages/[id]/editor/PageEditor'

export default async function StudioPageEditor({ params, searchParams }: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ token?: string | null }>
}) {
    const user = await requireUser()

    const entity = await getContentEntity(parseInt((await params).id))
    if (entity == null) {
        redirect('/studio')
    }

    const requestedToken = (await searchParams).token ?? undefined
    const token = await tryAcquireLock({
        entityType: entity.type,
        entityId: entity.id,
        currentToken: requestedToken
    })
    if (typeof token !== 'string') {
        return token
    }
    if (requestedToken !== token) {
        redirect(`/studio/pages/${entity.id}/editor?token=${token}`)
    }

    return <PageEditor init={entity} lockToken={token} user={user}/>
}

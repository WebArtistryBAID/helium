import { redirect } from 'next/navigation'
import { requireUser } from '@/app/login/login-actions'
import { tryAcquireLock } from '@/app/lib/lock/lock-typicals'
import { getContentEntity } from '@/app/studio/editor/entity-actions'
import PageEditor from '@/app/studio/pages/[id]/editor/PageEditor'
import { WEBSITE_METADATA_SLUG, WEBSITE_METADATA_STUDIO_PATH } from '@/app/lib/website-metadata-types'

export default async function StudioPageEditor({ params, searchParams }: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ token?: string | null }>
}) {
    const user = await requireUser()

    const entity = await getContentEntity(parseInt((await params).id))
    if (entity == null) {
        redirect('/studio')
    }
    if (entity.slug === WEBSITE_METADATA_SLUG) {
        redirect(WEBSITE_METADATA_STUDIO_PATH)
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

    return <PageEditor init={entity} lockToken={token} user={user} host={process.env.HOST!}/>
}

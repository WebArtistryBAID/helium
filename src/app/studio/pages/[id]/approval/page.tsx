import { requireUser } from '@/app/login/login-actions'
import { getContentEntity } from '@/app/studio/editor/entity-actions'
import { redirect } from 'next/navigation'
import PageApprovalWrapper from '@/app/studio/pages/[id]/approval/PageApprovalWrapper'
import { WEBSITE_METADATA_SLUG, WEBSITE_METADATA_STUDIO_PATH } from '@/app/lib/website-metadata-types'

export default async function StudioPageApproval({ params }: {
    params: Promise<{ id: string }>,
}) {
    await requireUser()

    const entity = await getContentEntity(parseInt((await params).id))
    if (entity == null) {
        redirect('/studio')
    }
    if (entity.slug === WEBSITE_METADATA_SLUG) {
        redirect(`${WEBSITE_METADATA_STUDIO_PATH}#approval`)
    }

    return <PageApprovalWrapper page={entity}/>
}

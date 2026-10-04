import { redirect } from 'next/navigation'
import { requireUser } from '@/app/login/login-actions'
import { getContentEntity } from '@/app/studio/editor/entity-actions'
import PageEditor from '@/app/studio/pages/[id]/editor/PageEditor'
import { WEBSITE_METADATA_SLUG, WEBSITE_METADATA_STUDIO_PATH } from '@/app/lib/metadata/website-metadata-types'
import { getPuckCommentThreads } from '@/app/studio/pages/[id]/editor/comment-actions'

export default async function StudioPageEditor({ params }: {
    params: Promise<{ id: string }>
}) {
    const user = await requireUser()

    const entity = await getContentEntity(parseInt((await params).id))
    if (entity == null) {
        redirect('/studio')
    }
    if (entity.slug === WEBSITE_METADATA_SLUG) {
        redirect(WEBSITE_METADATA_STUDIO_PATH)
    }

    const commentThreads = await getPuckCommentThreads(entity.id)

    return <PageEditor init={entity} user={user} host={process.env.HOST!}
                       initialCommentThreads={commentThreads}/>
}

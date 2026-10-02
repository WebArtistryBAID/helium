import ContentEntityEditor from '@/app/studio/editor/[id]/ContentEntityEditor'
import { redirect } from 'next/navigation'
import { requireUser } from '@/app/login/login-actions'
import { getContentEntity } from '@/app/studio/editor/entity-actions'
import { getPlateCommentThreads } from '@/app/studio/editor/comment-actions'
import { convertLegacyMarkdownContent } from '@/app/lib/services/entities'
import { getStudioActor } from '@/app/lib/services/studio-actor'

export default async function StudioContentEntityEditor({ params }: {
    params: Promise<{ id: string }>
}) {
    const user = await requireUser()

    const id = parseInt((await params).id)
    await convertLegacyMarkdownContent(await getStudioActor(), id)
    const entity = await getContentEntity(id)
    if (entity == null) {
        redirect('/studio')
    }
    if (entity.type === 'page') {
        redirect(`/studio/pages/${entity.id}/editor`)
    }

    const commentThreads = await getPlateCommentThreads(entity.id)

    return <div className="p-16">
        <ContentEntityEditor init={entity} user={user} initialCommentThreads={commentThreads}
                             uploadPrefix={process.env.UPLOAD_SERVE_PATH!}
                             host={process.env.HOST!}/>
    </div>
}

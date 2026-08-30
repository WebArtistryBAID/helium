import { requireUser } from '@/app/login/login-actions'
import { getContentEntity } from '@/app/studio/editor/entity-actions'
import { redirect } from 'next/navigation'
import { Render } from '@measured/puck'
import { PUCK_CONFIG } from '@/app/lib/puck/puck-config'
import PreviewToolbar from '@/app/studio/pages/[id]/preview/PreviewToolbar'
import { Role } from '@/generated/prisma/client'
import { WEBSITE_METADATA_SLUG, WEBSITE_METADATA_STUDIO_PATH } from '@/app/lib/website-metadata-types'

export default async function StudioPagePreview({ params, searchParams }: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ lang?: 'zh' | 'en' | null }>
}) {
    const user = await requireUser()

    const entity = await getContentEntity(parseInt((await params).id))
    if (entity == null) {
        redirect('/studio')
    }
    if (entity.slug === WEBSITE_METADATA_SLUG) {
        redirect(WEBSITE_METADATA_STUDIO_PATH)
    }

    const lang = (await searchParams).lang ?? 'zh'

    return <>
        <PreviewToolbar pageId={entity.id} currentLang={lang} isAdmin={user.roles.includes(Role.admin)}/>
        <Render config={PUCK_CONFIG}
                data={lang === 'zh' ? JSON.parse(entity.contentDraftZH) : JSON.parse(entity.contentDraftEN)}/>
    </>
}

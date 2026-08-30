import { redirect } from 'next/navigation'
import { requireUser } from '@/app/login/login-actions'
import { tryAcquireLock } from '@/app/lib/lock/lock-typicals'
import { EntityType } from '@/generated/prisma/client'
import WebsiteMetadataEditor from '@/app/studio/settings/website-metadata/WebsiteMetadataEditor'
import {
    getWebsiteMetadataEditorState,
    getWebsitePageOptions
} from '@/app/studio/settings/website-metadata/website-metadata-actions'
import { WEBSITE_METADATA_STUDIO_PATH } from '@/app/lib/website-metadata-types'

export default async function WebsiteMetadataPage({ searchParams }: {
    searchParams: Promise<{ token?: string | null }>
}) {
    const user = await requireUser()
    const [ init, pageOptions ] = await Promise.all([
        getWebsiteMetadataEditorState(),
        getWebsitePageOptions()
    ])
    const requestedToken = (await searchParams).token ?? undefined
    const token = await tryAcquireLock({
        entityType: EntityType.page,
        entityId: init.entity.id,
        currentToken: requestedToken,
        returnUri: WEBSITE_METADATA_STUDIO_PATH
    })
    if (typeof token !== 'string') return token
    if (requestedToken !== token) {
        redirect(`${WEBSITE_METADATA_STUDIO_PATH}?token=${token}`)
    }

    return <WebsiteMetadataEditor init={init} user={user} lockToken={token} pageOptions={pageOptions}/>
}

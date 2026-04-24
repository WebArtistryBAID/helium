import ContentEntityLibrary from '@/app/studio/editor/ContentEntityLibrary'
import { getContentEntities, getLibraryLandingBlocks } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/client'
import { requireUser } from '@/app/login/login-actions'
import { LIBRARY_CONFIG } from '@/app/studio/editor/library-config'

export default async function ContentLibraryPage({ type }: { type: EntityType }) {
    const user = await requireUser()
    const config = LIBRARY_CONFIG[type]
    const landingPages = config.landingPages ?? []

    return <div className="p-10">
        <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">Studio Content</p>
            <h1 className="mt-2 text-4xl font-bold">{config.title}</h1>
        </div>
        <ContentEntityLibrary
            init={await getContentEntities(0, type)}
            title={config.title}
            type={type}
            user={user}
            landingBlocks={await getLibraryLandingBlocks(type, landingPages.map(page => page.slug))}
        />
    </div>
}

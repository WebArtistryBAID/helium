import ContentEntityLibrary from '@/app/studio/editor/ContentEntityLibrary'
import { getContentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/client'
import { requireUser } from '@/app/login/login-actions'

export default async function PagePageLibrary() {
    const user = await requireUser()

    return <div className="p-16">
        <h1 className="text-2xl mb-3">页面</h1>
        <ContentEntityLibrary init={await getContentEntities(0, EntityType.page)} title="页面" type={EntityType.page}
                              user={user}/>
    </div>
}

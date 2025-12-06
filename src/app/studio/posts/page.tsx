import ContentEntityLibrary from '@/app/studio/editor/ContentEntityLibrary'
import { getContentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/client'
import { requireUser } from '@/app/login/login-actions'

export default async function PagePostLibrary() {
    const user = await requireUser()

    return <div className="p-16">
        <h1 className="text-2xl mb-3">文章</h1>
        <ContentEntityLibrary init={await getContentEntities(0, EntityType.post)} title="文章" type={EntityType.post}
                              user={user}/>
    </div>
}

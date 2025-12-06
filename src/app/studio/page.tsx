import StudioHome from '@/app/studio/StudioHome'
import { getMyPendingApprovals, getRecentEntities } from '@/app/studio/editor/entity-actions'
import { EntityType } from '@/generated/prisma/client'

export default async function PageStudio() {
    return <div className="p-16">
        <StudioHome pages={await getRecentEntities(EntityType.page)} posts={await getRecentEntities(EntityType.post)}
                    pendingApprovals={await getMyPendingApprovals()} uploadServePath={process.env.UPLOAD_SERVE_PATH!}/>
    </div>
}

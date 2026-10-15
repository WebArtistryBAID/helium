'use client'

import { HydratedContentEntity } from '@/app/lib/data-types'
import ApprovalProcess from '@/app/lib/approval/ApprovalProcess'
import { EntityType } from '@/generated/prisma/browser'
import { alignContentEntity } from '@/app/studio/editor/entity-actions'

export default function PageApprovalWrapper({ page }: { page: HydratedContentEntity }) {
    return <div className="p-8">
        <ApprovalProcess entityType={EntityType.page} entityId={page.id} entity={page}
                         doAlign={async force => {
                             return alignContentEntity(page.id, force)
                         }}/>
    </div>
}

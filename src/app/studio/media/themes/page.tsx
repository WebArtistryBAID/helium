import { Role } from '@/generated/prisma/client'

import { getMyUser } from '@/app/login/login-actions'
import ThemeManager from '@/app/studio/media/ThemeManager'
import { getMediaTaxonomyAction } from '@/app/studio/media/taxonomy-actions'

/** Studio page for nested theme folders and their relation network. */
export default async function PageMediaThemes() {
    const user = await getMyUser()
    const init = await getMediaTaxonomyAction()
    return <div className="p-16">
        <ThemeManager init={init} canWrite={user?.roles.includes(Role.writer) ?? false}/>
    </div>
}

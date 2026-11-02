import { Role } from '@/generated/prisma/client'
import { getMyUser } from '@/app/login/login-actions'
import TagManager from '@/app/studio/media/TagManager'
import { getMediaTaxonomyAction } from '@/app/studio/media/taxonomy-actions'

export default async function PageMediaTags() {
    const [ init, user ] = await Promise.all([ getMediaTaxonomyAction(), getMyUser() ])
    return <TagManager init={init} canWrite={user?.roles.includes(Role.writer) ?? false}/>
}

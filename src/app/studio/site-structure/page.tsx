import { requireUser } from '@/app/login/login-actions'
import { getAllPageEntities } from '@/app/studio/editor/entity-actions'
import { getSiteStructureTree } from '@/app/lib/site-structure-actions'
import SiteStructureEditor from '@/app/studio/wangzhanjiegou/SiteStructureEditor'

export default async function SiteStructurePage() {
    await requireUser()

    const [ structure, pageEntities ] = await Promise.all([
        getSiteStructureTree(),
        getAllPageEntities()
    ])

    return <SiteStructureEditor initialTree={structure} pageEntities={pageEntities}/>
}

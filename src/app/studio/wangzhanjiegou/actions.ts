'use server'

import { SiteStructureFormNode } from '@/app/lib/site-structure-schema'
import { saveSiteStructureTree as saveSiteStructureTreeAction } from '@/app/lib/site-structure-actions'

export async function saveSiteStructureTree(tree: SiteStructureFormNode[]) {
    return saveSiteStructureTreeAction(tree)
}

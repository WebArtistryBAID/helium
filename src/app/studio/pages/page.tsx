import ContentLibraryPage from '@/app/studio/editor/library-page'
import { EntityType } from '@/generated/prisma/client'

export default async function PagePagesLibrary() {
    return <ContentLibraryPage type={EntityType.page}/>
}

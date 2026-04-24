import ContentLibraryPage from '@/app/studio/editor/library-page'
import { EntityType } from '@/generated/prisma/client'

export default async function PageClubsLibrary() {
    return <ContentLibraryPage type={EntityType.club}/>
}

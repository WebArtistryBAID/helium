import ContentLibraryPage from '@/app/studio/editor/library-page'
import { EntityType } from '@/generated/prisma/client'

export default async function PageActivitiesLibrary() {
    return <ContentLibraryPage type={EntityType.activity}/>
}

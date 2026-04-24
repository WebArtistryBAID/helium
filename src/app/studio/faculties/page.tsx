import ContentLibraryPage from '@/app/studio/editor/library-page'
import { EntityType } from '@/generated/prisma/client'

export default async function PageFacultiesLibrary() {
    return <ContentLibraryPage type={EntityType.faculty}/>
}

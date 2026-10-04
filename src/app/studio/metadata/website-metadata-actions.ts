'use server'

import {
    WebsiteMetadataDraft,
    WebsiteMetadataEditorState,
    WebsitePageOption
} from '@/app/lib/metadata/website-metadata-types'
import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/website-metadata'

export async function getWebsiteMetadataEditorState(): Promise<WebsiteMetadataEditorState> {
    return services.getWebsiteMetadataEditorState(await getStudioActor())
}

export async function getWebsitePageOptions(): Promise<WebsitePageOption[]> {
    return services.getWebsitePageOptions(await getStudioActor())
}

export async function saveWebsiteMetadata(
    entityId: number,
    draft: WebsiteMetadataDraft,
    expectedUpdatedAt?: Date | string
): Promise<WebsiteMetadataEditorState> {
    return services.saveWebsiteMetadata(await getStudioActor(), entityId, draft, expectedUpdatedAt)
}

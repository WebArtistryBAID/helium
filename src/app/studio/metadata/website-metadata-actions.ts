'use server'

import {
    WebsiteMetadataDraft,
    WebsiteMetadataEditorState,
    WebsitePageOption
} from '@/app/lib/metadata/website-metadata-types'
import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as services from '@/app/lib/services/website-metadata'
import { getPublishedWebsiteLogo as getPublishedLogo } from '@/app/lib/metadata/website-metadata.server'

export async function getPublishedWebsiteLogo(): Promise<{ sha1: string, altText: string } | null> {
    return getPublishedLogo()
}

export async function getWebsiteMetadataEditorState(): Promise<WebsiteMetadataEditorState> {
    return services.getWebsiteMetadataEditorState(await getStudioActor())
}

export async function getWebsitePageOptions(): Promise<WebsitePageOption[]> {
    return services.getWebsitePageOptions(await getStudioActor())
}

export async function saveWebsiteMetadata(
    entityId: number,
    draft: WebsiteMetadataDraft,
    logoImageId: number | null,
    expectedUpdatedAt?: Date | string
): Promise<WebsiteMetadataEditorState> {
    return services.saveWebsiteMetadata(await getStudioActor(), entityId, draft, logoImageId, expectedUpdatedAt)
}

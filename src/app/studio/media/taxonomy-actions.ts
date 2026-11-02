'use server'

import { revalidatePath } from 'next/cache'

import { getStudioActor } from '@/app/lib/services/studio-actor'
import * as taxonomy from '@/app/lib/services/media-taxonomy'

export type {
    TagSummary,
    CollectionSummary,
    CollectionLinkSummary,
    MediaTaxonomy,
    CollectionRef
} from '@/app/lib/services/media-taxonomy'

/**
 * Mutations report validation failures as data instead of throwing. Production React masks thrown
 * server action errors, so duplicate names and other user mistakes could not reach the dialog
 * otherwise. Authentication errors are rethrown so clients can show the permission dialog.
 */
export type TaxonomyActionResult<T> = { ok: true; data: T } | { ok: false; message: string }

function revalidateMediaPages(): void {
    revalidatePath('/studio/media')
    revalidatePath('/studio/media/tags')
    revalidatePath('/studio/media/themes')
}

async function runMutation<T>(operation: () => Promise<T>): Promise<TaxonomyActionResult<T>> {
    try {
        return { ok: true, data: await operation() }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) throw error
        if (error instanceof Error) {
            console.error('Media taxonomy operation failed:', error.message)
            return { ok: false, message: error.message || '操作失败，请重试' }
        }
        console.error('Media taxonomy operation failed:', error)
        return { ok: false, message: '操作失败，请重试' }
    }
}

export async function getMediaTaxonomyAction(): Promise<taxonomy.MediaTaxonomy> {
    return taxonomy.getMediaTaxonomy(await getStudioActor())
}

export async function createTagAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.TagSummary>> {
    const result = await runMutation(async () => taxonomy.createTag(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function updateTagAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.TagSummary>> {
    const result = await runMutation(async () => taxonomy.updateTag(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function deleteTagAction(tagId: number): Promise<TaxonomyActionResult<void>> {
    const result = await runMutation(async () => taxonomy.deleteTag(await getStudioActor(), tagId))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function addTagsToImagesAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.TagSummary[]>> {
    const result = await runMutation(async () => taxonomy.addTagsToImages(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function removeTagsFromImagesAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.TagSummary[]>> {
    const result = await runMutation(async () => taxonomy.removeTagsFromImages(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function createCollectionAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.CollectionSummary>> {
    const result = await runMutation(async () => taxonomy.createCollection(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function updateCollectionAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.CollectionSummary>> {
    const result = await runMutation(async () => taxonomy.updateCollection(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function deleteCollectionAction(collectionId: number): Promise<TaxonomyActionResult<{ deleted: number }>> {
    const result = await runMutation(async () => taxonomy.deleteCollection(await getStudioActor(), collectionId))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function addImagesToCollectionAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.CollectionSummary>> {
    const result = await runMutation(async () => taxonomy.addImagesToCollection(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function removeImageFromCollectionAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.CollectionSummary>> {
    const result = await runMutation(async () => taxonomy.removeImageFromCollection(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function createCollectionLinkAction(input: unknown): Promise<TaxonomyActionResult<taxonomy.CollectionLinkSummary>> {
    const result = await runMutation(async () => taxonomy.createCollectionLink(await getStudioActor(), input))
    if (result.ok) revalidateMediaPages()
    return result
}

export async function deleteCollectionLinkAction(linkId: number): Promise<TaxonomyActionResult<void>> {
    const result = await runMutation(async () => taxonomy.deleteCollectionLink(await getStudioActor(), linkId))
    if (result.ok) revalidateMediaPages()
    return result
}

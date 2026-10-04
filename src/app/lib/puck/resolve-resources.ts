import * as media from '@/app/studio/media/media-actions'
import * as entities from '@/app/studio/editor/entity-actions'

export { getAllPublishedCourses, getPublishedProjectsByCategoriesForInit } from '@/app/studio/editor/entity-actions'

const resources = new Map<string, { expires: number; promise: Promise<unknown> }>()

export function clearPuckResources() {
    resources.clear()
}

function resource<T>(key: string, fetch: () => Promise<T>): Promise<T> {
    // Server rendering always reads current data; only editor/browser reads share requests.
    if (typeof window === 'undefined') return fetch()
    const cached = resources.get(key)
    if (cached && cached.expires > Date.now()) return cached.promise as Promise<T>
    const promise = fetch()
    resources.set(key, { expires: Date.now() + 60_000, promise })
    void promise.catch(() => {
        if (resources.get(key)?.promise === promise) resources.delete(key)
    })
    return promise
}

export const getImage: typeof media.getImage = id => resource(`image:${id}`, () => media.getImage(id))
export const getUploadServePath: typeof media.getUploadServePath = () => resource('uploads', media.getUploadServePath)
export const getPublishedContentEntity: typeof entities.getPublishedContentEntity = id =>
    resource(`entity:${id}`, () => entities.getPublishedContentEntity(id))
export const getPublishedContentEntities: typeof entities.getPublishedContentEntities = (...args) =>
    resource(`entities:${JSON.stringify(args)}`, () => entities.getPublishedContentEntities(...args))

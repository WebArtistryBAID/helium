import type { CollectionSummary } from '@/app/studio/media/taxonomy-actions'

export type CollectionNode = CollectionSummary & {
    depth: number
    children: CollectionNode[]
}

/** Builds the nested theme tree from the flat taxonomy list. Orphans are treated as roots. */
export function buildCollectionTree(collections: CollectionSummary[]): CollectionNode[] {
    const nodes = new Map<number, CollectionNode>()
    for (const collection of collections) {
        nodes.set(collection.id, { ...collection, depth: 0, children: [] })
    }
    const roots: CollectionNode[] = []
    for (const node of nodes.values()) {
        const parent = node.parentId == null ? null : nodes.get(node.parentId)
        if (parent == null) {
            roots.push(node)
        } else {
            parent.children.push(node)
        }
    }
    const sortRecursively = (list: CollectionNode[], depth: number) => {
        list.sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
        for (const node of list) {
            node.depth = depth
            sortRecursively(node.children, depth + 1)
        }
    }
    sortRecursively(roots, 0)
    return roots
}

export function flattenCollectionTree(nodes: CollectionNode[]): CollectionNode[] {
    return nodes.flatMap(node => [ node, ...flattenCollectionTree(node.children) ])
}

/** Returns the collection and every nested descendant, used to prevent reparenting cycles. */
export function getCollectionSubtreeIds(collections: CollectionSummary[], rootId: number): Set<number> {
    const childrenByParent = new Map<number, number[]>()
    for (const collection of collections) {
        if (collection.parentId == null) continue
        const siblings = childrenByParent.get(collection.parentId) ?? []
        siblings.push(collection.id)
        childrenByParent.set(collection.parentId, siblings)
    }
    const visited = new Set<number>()
    const stack = [ rootId ]
    while (stack.length > 0) {
        const id = stack.pop()!
        if (visited.has(id)) continue
        visited.add(id)
        stack.push(...(childrenByParent.get(id) ?? []))
    }
    return visited
}

export function collectionPath(collections: CollectionSummary[], collectionId: number): CollectionSummary[] {
    const byId = new Map(collections.map(collection => [ collection.id, collection ]))
    const path: CollectionSummary[] = []
    let cursor = byId.get(collectionId)
    const visited = new Set<number>()
    while (cursor != null && !visited.has(cursor.id)) {
        visited.add(cursor.id)
        path.unshift(cursor)
        cursor = cursor.parentId == null ? undefined : byId.get(cursor.parentId)
    }
    return path
}

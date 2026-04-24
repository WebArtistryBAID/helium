import { EntityType } from '@/generated/prisma/browser'

export type LibraryLandingPageConfig = {
    slug: string
    title: string
    description: string
}

export type LibraryConfig = {
    title: string
    description: string
    createLabel: string
    examples: string[]
    entryPathLabel: string
    publicPathHint: string
    sectionDescription?: string
    categorySuggestions?: string[]
    landingPages?: LibraryLandingPageConfig[]
    structureParentSlug?: string
}

export type LibraryLandingBlock = {
    pageId: number
    pageSlug: string
    pageTitle: string
    pageEditorPath: string
    pagePublicPath: string
    componentId: string
    componentType: 'EntityShowcaseConfig' | 'EntityFilterWallConfig'
    title: string
    eyebrow: string
    entityType: EntityType
    manualEntityIds: number[]
    categoryEN: string
    categoryZH: string
}

export type LibraryEntityPlacement = {
    entityId: number
    pageId: number
    pageTitle: string
    pageSlug: string
    componentId: string
    componentTitle: string
    componentType: 'EntityShowcaseConfig' | 'EntityFilterWallConfig'
}

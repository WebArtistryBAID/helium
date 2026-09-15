'use client'

import { createContext, type ReactNode, useContext } from 'react'
import {
    PlateElement,
    PlateLeaf,
    type PlateElementProps,
    type PlateLeafProps,
    useEditorReadOnly,
    useEditorRef,
    usePath,
    useSelected
} from 'platejs/react'
import type { TImageElement, TLinkElement } from 'platejs'
import type { Image } from '@/generated/prisma/browser'
import { Button } from 'flowbite-react'
import { HiTrash } from 'react-icons/hi2'
import { getCommentKeyId, getCommentKeys } from '@platejs/comment'
import { getInlineSuggestionData } from '@platejs/suggestion'

const PlateMediaContext = createContext<{
    images: Map<number, Image>
    uploadPrefix: string
}>({ images: new Map(), uploadPrefix: '' })

const PlateCommentContext = createContext<{
    activeId: string | null
    onActivate: (threadId: string) => void
    unresolvedIds: Set<string>
}>({ activeId: null, onActivate: () => undefined, unresolvedIds: new Set() })

const PlateSuggestionContext = createContext<{
    activeId: string | null
    onActivate: (suggestionId: string) => void
}>({ activeId: null, onActivate: () => undefined })

export function PlateMediaProvider({ children, images, uploadPrefix }: {
    children: ReactNode
    images: Map<number, Image>
    uploadPrefix: string
}) {
    return <PlateMediaContext.Provider value={{ images, uploadPrefix }}>{children}</PlateMediaContext.Provider>
}

export function PlateCommentProvider({ activeId, children, onActivate, unresolvedIds }: {
    activeId: string | null
    children: ReactNode
    onActivate: (threadId: string) => void
    unresolvedIds: Set<string>
}) {
    return <PlateCommentContext.Provider value={{ activeId, onActivate, unresolvedIds }}>
        {children}
    </PlateCommentContext.Provider>
}

export function PlateSuggestionProvider({ activeId, children, onActivate }: {
    activeId: string | null
    children: ReactNode
    onActivate: (suggestionId: string) => void
}) {
    return <PlateSuggestionContext.Provider value={{ activeId, onActivate }}>
        {children}
    </PlateSuggestionContext.Provider>
}

function useBlockSuggestion(element: PlateElementProps['element']) {
    const { activeId, onActivate } = useContext(PlateSuggestionContext)
    const suggestion = 'suggestion' in element && typeof element.suggestion === 'object' && element.suggestion != null
        ? element.suggestion as { id: string, type: string }
        : null
    if (suggestion == null) return { className: '', attributes: {} }

    return {
        className: suggestion.type === 'remove'
            ? `cursor-pointer bg-red-100 text-red-700 line-through ${activeId === suggestion.id ? 'ring-2 ring-red-400' : ''}`
            : `cursor-pointer bg-green-100 text-green-700 ${activeId === suggestion.id ? 'ring-2 ring-green-400' : ''}`,
        attributes: {
            onClick: () => onActivate(suggestion.id),
            'data-suggestion-id': suggestion.id
        }
    }
}

export const ParagraphElement = (props: PlateElementProps) => {
    const suggestion = useBlockSuggestion(props.element)
    return <PlateElement {...props} as="p" attributes={{ ...props.attributes, ...suggestion.attributes }}
                         className={`mb-4 w-full leading-7 last:mb-0 ${suggestion.className}`}/>
}

export const BlockquoteElement = (props: PlateElementProps) => {
    const suggestion = useBlockSuggestion(props.element)
    return <PlateElement {...props} as="blockquote" attributes={{ ...props.attributes, ...suggestion.attributes }}
                         className={`my-5 w-full border-l-4 border-gray-300 pl-4 text-gray-600 ${suggestion.className}`}/>
}

function HeadingElement({ as, className, ...props }: PlateElementProps & {
    as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    className: string
}) {
    const suggestion = useBlockSuggestion(props.element)
    return <PlateElement {...props} as={as} attributes={{ ...props.attributes, ...suggestion.attributes }}
                         className={`${className} ${suggestion.className}`}/>
}

export const H1Element = (props: PlateElementProps) =>
    <HeadingElement {...props} as="h1" className="mb-4 mt-8 w-full text-3xl font-bold first:mt-0"/>
export const H2Element = (props: PlateElementProps) =>
    <HeadingElement {...props} as="h2" className="mb-3 mt-7 w-full text-2xl font-bold first:mt-0"/>
export const H3Element = (props: PlateElementProps) =>
    <HeadingElement {...props} as="h3" className="mb-3 mt-6 w-full text-xl font-bold first:mt-0"/>
export const H4Element = (props: PlateElementProps) =>
    <HeadingElement {...props} as="h4" className="mb-2 mt-5 w-full text-lg font-bold first:mt-0"/>
export const H5Element = (props: PlateElementProps) =>
    <HeadingElement {...props} as="h5" className="mb-2 mt-5 w-full font-bold first:mt-0"/>
export const H6Element = (props: PlateElementProps) =>
    <HeadingElement {...props} as="h6" className="mb-2 mt-5 w-full font-semibold first:mt-0"/>

export const HorizontalRuleElement = ({ children, ...props }: PlateElementProps) =>
    <PlateElement {...props} as="div" className="my-6 w-full">
        <hr className="border-gray-200"/>
        {children}
    </PlateElement>

export const BulletedListElement = (props: PlateElementProps) =>
    <PlateElement {...props} as="ul" className="my-4 w-full list-disc space-y-1 pl-6"/>

export const NumberedListElement = (props: PlateElementProps) =>
    <PlateElement {...props} as="ol" className="my-4 w-full list-decimal space-y-1 pl-6"/>

export const ListItemElement = (props: PlateElementProps) => <PlateElement {...props} as="li"/>
export const ListItemContentElement = (props: PlateElementProps) => <PlateElement {...props} as="div"/>

export const LinkElement = (props: PlateElementProps<TLinkElement>) =>
    <PlateElement {...props} as="a" attributes={{ ...props.attributes, href: props.element.url }}
                  className="text-blue-600 underline decoration-blue-300 underline-offset-2"/>

export const ImageElement = ({ children, ...props }: PlateElementProps<TImageElement & { imageId?: number }>) => {
    const { images, uploadPrefix } = useContext(PlateMediaContext)
    const editor = useEditorRef()
    const path = usePath()
    const selected = useSelected()
    const readOnly = useEditorReadOnly()
    const imageId = props.element.imageId
    const image = imageId == null ? null : images.get(imageId)
    const src = image == null ? props.element.url : `${uploadPrefix}/${image.sha1}.webp`
    const alt = image?.altText ?? ''
    const index = path[0]
    const previous = typeof index === 'number' ? editor.children[index - 1] : null
    const next = typeof index === 'number' ? editor.children[index + 1] : null
    const grouped = (previous != null && 'type' in previous && previous.type === 'img') ||
        (next != null && 'type' in next && next.type === 'img')
    let firstImageIndex = typeof index === 'number' ? index : 0
    while (firstImageIndex > 0) {
        const candidate = editor.children[firstImageIndex - 1]
        if (!('type' in candidate) || candidate.type !== 'img') break
        firstImageIndex--
    }
    const firstImageNode = editor.children[firstImageIndex]
    const firstImageId = firstImageNode != null && 'imageId' in firstImageNode &&
    typeof firstImageNode.imageId === 'number' ? firstImageNode.imageId : null
    const firstImage = firstImageId == null ? null : images.get(firstImageId)
    const groupAspectRatio = firstImage != null && firstImage.width > 0 && firstImage.height > 0
        ? `${firstImage.width} / ${firstImage.height}`
        : undefined

    return <PlateElement {...props} as="div"
                         className={`relative box-border rounded-xl border-2 align-top ${
                             grouped ? 'my-2 block w-full sm:w-1/2 sm:px-2' : 'my-5 block w-full'
                         } ${selected ? 'border-blue-500' : 'border-transparent'}`}>
        {selected && !readOnly && <div contentEditable={false} className="absolute right-2 top-2 z-10">
            <Button pill size="xs" color="red"
                    onMouseDown={event => {
                        event.preventDefault()
                        event.stopPropagation()
                    }}
                    onClick={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        const currentPath = editor.api.findPath(props.element)
                        if (currentPath != null) editor.tf.removeNodes({ at: currentPath })
                    }}>
                <HiTrash className="mr-1 size-4" aria-hidden="true"/>
                删除图片
            </Button>
        </div>}
        {src
            ? <img contentEditable={false} src={src} alt={alt}
                   style={grouped && groupAspectRatio ? { aspectRatio: groupAspectRatio } : undefined}
                   className={`!m-0 mx-auto w-full !rounded-xl ${
                       grouped ? 'max-h-[28rem] !object-cover' : 'max-h-[36rem] object-contain'
                   }`}/>
            : <div contentEditable={false}
                   className="flex min-h-32 items-center justify-center rounded-3xl bg-gray-100 text-sm text-gray-500">
                图片加载中
            </div>}
        {children}
    </PlateElement>
}

export const BoldLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="strong"/>
export const CodeLeaf = (props: PlateLeafProps) =>
    <PlateLeaf {...props} as="code" className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm"/>
export const HighlightLeaf = (props: PlateLeafProps) =>
    <PlateLeaf {...props} as="mark" className="bg-yellow-200"/>
export const ItalicLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="em"/>
export const StrikethroughLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="s"/>
export const SubscriptLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="sub"/>
export const SuperscriptLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="sup"/>
export const UnderlineLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="u"/>

export const SuggestionLeaf = (props: PlateLeafProps) => {
    const { activeId, onActivate } = useContext(PlateSuggestionContext)
    const suggestion = getInlineSuggestionData(props.leaf)
    if (suggestion == null) return <PlateLeaf {...props}/>

    const active = activeId === suggestion.id
    const className = suggestion.type === 'remove'
        ? `cursor-pointer bg-red-100 text-red-700 line-through ${active ? 'ring-2 ring-red-400' : ''}`
        : suggestion.type === 'update'
            ? `cursor-pointer bg-amber-100 text-amber-800 ${active ? 'ring-2 ring-amber-400' : ''}`
            : `cursor-pointer bg-green-100 text-green-700 underline decoration-green-500 ${active ? 'ring-2 ring-green-400' : ''}`

    return <PlateLeaf {...props} className={className}
                      attributes={{
                          ...props.attributes,
                          onClick: () => onActivate(suggestion.id),
                          'data-suggestion-id': suggestion.id
                      }}/>
}

export const CommentLeaf = (props: PlateLeafProps) => {
    const { activeId, onActivate, unresolvedIds } = useContext(PlateCommentContext)
    const ids = getCommentKeys(props.leaf).map(getCommentKeyId)
    const threadId = ids.find(id => unresolvedIds.has(id)) ?? ids[0]
    const active = threadId != null && activeId === threadId
    const unresolved = ids.some(id => unresolvedIds.has(id))

    return <PlateLeaf {...props} as="span"
                      attributes={{
                          ...props.attributes,
                          onClick: () => threadId && onActivate(threadId)
                      }}
                      className={`${unresolved ? 'bg-yellow-200' : ''} ${active ? 'ring-2 ring-blue-500' : ''} cursor-pointer rounded-sm`}/>
}

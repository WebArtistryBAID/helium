'use client'

import FocusImage from '@/app/lib/FocusImage'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import {
    PlateElement,
    PlateLeaf,
    type PlateElementProps,
    type PlateLeafProps,
    useEditorReadOnly,
    useEditorRef,
    useFocused,
    usePath,
    useSelected
} from 'platejs/react'
import type { TImageElement, TLinkElement, TTableCellElement, TTableElement } from 'platejs'
import type { Image } from '@/generated/prisma/browser'
import { Button } from 'flowbite-react'
import { HiTrash } from 'react-icons/hi2'
import { getCommentKeyId, getCommentKeys } from '@platejs/comment'
import { getInlineSuggestionData } from '@platejs/suggestion'
import { getColSpan, getRowSpan } from '@platejs/table'
import { TablePlugin, useIsCellSelected } from '@platejs/table/react'

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
    suggestionIds: Set<string>
}>({ activeId: null, onActivate: () => undefined, suggestionIds: new Set() })

export function PlateMediaProvider({ children, images, uploadPrefix }: {
    children: ReactNode
    images: Map<number, Image>
    uploadPrefix: string
}) {
    const value = useMemo(() => ({ images, uploadPrefix }), [ images, uploadPrefix ])
    return <PlateMediaContext.Provider value={value}>{children}</PlateMediaContext.Provider>
}

export function PlateCommentProvider({ activeId, children, onActivate, unresolvedIds }: {
    activeId: string | null
    children: ReactNode
    onActivate: (threadId: string) => void
    unresolvedIds: Set<string>
}) {
    const value = useMemo(() => ({ activeId, onActivate, unresolvedIds }), [ activeId, onActivate, unresolvedIds ])
    return <PlateCommentContext.Provider value={value}>
        {children}
    </PlateCommentContext.Provider>
}

export function PlateSuggestionProvider({ activeId, children, onActivate, suggestionIds }: {
    activeId: string | null
    children: ReactNode
    onActivate: (suggestionId: string) => void
    suggestionIds: Set<string>
}) {
    const value = useMemo(() => ({ activeId, onActivate, suggestionIds }), [ activeId, onActivate, suggestionIds ])
    return <PlateSuggestionContext.Provider value={value}>
        {children}
    </PlateSuggestionContext.Provider>
}

function useBlockSuggestion(element: PlateElementProps['element']) {
    const { activeId, onActivate, suggestionIds } = useContext(PlateSuggestionContext)
    const suggestion = 'suggestion' in element && typeof element.suggestion === 'object' && element.suggestion != null
        ? element.suggestion as { id: string, type: string }
        : null
    if (suggestion == null || !suggestionIds.has(suggestion.id)) return { className: '', attributes: {} }

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
                         className={`m-0 w-full pb-4 leading-7 last:pb-0 ${suggestion.className}`}/>
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

function TableAction({ children, color = 'alternative', onClick }: {
    children: ReactNode
    color?: 'alternative' | 'red'
    onClick: () => void
}) {
    return <Button pill size="xs" color={color} type="button"
                   onMouseDown={event => event.preventDefault()} onClick={onClick}>
        {children}
    </Button>
}

export const TableElement = ({ children, ...props }: PlateElementProps<TTableElement>) => {
    const editor = useEditorRef()
    const selected = useSelected()
    const readOnly = useEditorReadOnly()
    const table = editor.getTransforms(TablePlugin)
    const editTable = (action: () => void) => {
        action()
        editor.tf.focus()
    }

    return <div className="my-5 w-full overflow-hidden rounded-xl border border-gray-200">
        {selected && !readOnly && <div contentEditable={false}
                                       className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
            <TableAction onClick={() => editTable(() => table.insert.tableRow({ header: false }))}>添加行</TableAction>
            <TableAction onClick={() => editTable(() => table.insert.tableColumn())}>添加列</TableAction>
            <TableAction onClick={() => editTable(() => table.remove.tableRow())}>删除行</TableAction>
            <TableAction onClick={() => editTable(() => table.remove.tableColumn())}>删除列</TableAction>
            <TableAction color="red" onClick={() => editTable(() => table.remove.table())}>删除表格</TableAction>
        </div>}
        <div className="overflow-x-auto">
            <PlateElement {...props} as="table"
                          className="helium-plate-table w-full min-w-[24rem] border-separate border-spacing-0 text-left text-sm">
                {props.element.colSizes && <colgroup contentEditable={false}>
                    {props.element.colSizes.map((width, index) => <col key={index} style={{ width }}/>)}
                </colgroup>}
                <tbody>{children}</tbody>
            </PlateElement>
        </div>
    </div>
}

export const TableRowElement = (props: PlateElementProps) => <PlateElement {...props} as="tr"/>

function TableCell({ as, ...props }: PlateElementProps<TTableCellElement> & { as: 'td' | 'th' }) {
    const selected = useIsCellSelected(props.element)
    return <PlateElement {...props} as={as}
                         attributes={{
                             ...props.attributes,
                             colSpan: getColSpan(props.element),
                             rowSpan: getRowSpan(props.element),
                             ...(as === 'th' ? { scope: 'col' as const } : {})
                         }}
                         className={`min-w-28 px-3 py-2 align-top [&>p]:pb-0 ${
                             as === 'th' ? 'bg-gray-50 font-semibold' : 'bg-white'
                         } ${selected ? '!bg-blue-50' : ''}`}/>
}

export const TableCellElement = (props: PlateElementProps<TTableCellElement>) =>
    <TableCell {...props} as="td"/>

export const TableCellHeaderElement = (props: PlateElementProps<TTableCellElement>) =>
    <TableCell {...props} as="th"/>

function isImageNode(candidate: unknown): candidate is TImageElement & { imageId?: number } {
    return candidate != null && typeof candidate === 'object' && 'type' in candidate && candidate.type === 'img'
}

export const ImageElement = ({ children, ...props }: PlateElementProps<TImageElement & { imageId?: number }>) => {
    const { images, uploadPrefix } = useContext(PlateMediaContext)
    const editor = useEditorRef()
    usePath()
    const selected = useSelected()
    const focused = useFocused()
    const readOnly = useEditorReadOnly()
    const imageId = props.element.imageId
    const image = imageId == null ? null : images.get(imageId)
    const src = image == null ? props.element.url : `${uploadPrefix}/${image.sha1}.webp`
    const alt = image?.altText ?? ''
    // usePath can briefly point at the previous position while Slate removes or moves a sibling.
    // Resolve this element again so layout is always based on its current neighbours.
    const currentPath = editor.api.findPath(props.element)
    const index = currentPath?.length === 1 ? currentPath[0] : undefined
    let firstImageIndex = typeof index === 'number' ? index : 0
    while (firstImageIndex > 0) {
        const candidate = editor.children[firstImageIndex - 1]
        if (!isImageNode(candidate)) break
        firstImageIndex--
    }
    let imageCount = 0
    while (isImageNode(editor.children[firstImageIndex + imageCount])) imageCount++
    const grouped = typeof index === 'number' && imageCount > 1 && imageCount % 2 === 0
    const firstImageNode = editor.children[firstImageIndex]
    const firstImageId = isImageNode(firstImageNode) && typeof firstImageNode.imageId === 'number'
        ? firstImageNode.imageId
        : null
    const firstImage = firstImageId == null ? null : images.get(firstImageId)
    const groupAspectRatio = firstImage != null && firstImage.width > 0 && firstImage.height > 0
        ? `${firstImage.width} / ${firstImage.height}`
        : undefined
    const imageStyle = {
        borderRadius: '0.75rem',
        ...(grouped && groupAspectRatio ? { aspectRatio: groupAspectRatio } : {})
    }

    return <PlateElement {...props} as="div"
                         className={`relative box-border rounded-xl border-2 align-top ${
                             grouped
                                 ? 'my-2 block w-full sm:w-1/2 sm:px-2'
                                 : 'mx-auto my-5 block w-fit max-w-full overflow-hidden'
                         } ${selected && focused ? 'border-blue-500' : 'border-transparent'}`}>
        <div contentEditable={false}
             onMouseDown={event => {
                 if (readOnly || event.button !== 0 || event.shiftKey) return
                 // Focus while selecting the void so subsequent text clicks start in the focused editor.
                 const path = editor.api.findPath(props.element)
                 if (path == null) return
                 event.preventDefault()
                 editor.tf.focus({ at: path })
             }}>
            {selected && focused && !readOnly && <div contentEditable={false} className="absolute right-2 top-2 z-10">
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
                ? <FocusImage image={grouped ? image : null} draggable={false} src={src} alt={alt}
                       style={imageStyle}
                       className={`!m-0 mx-auto ${
                           grouped
                               ? 'w-full max-h-[28rem] !object-cover'
                               : 'block h-auto max-h-[36rem] max-w-full object-contain'
                       }`}/>
                : <div contentEditable={false}
                       className="flex min-h-32 items-center justify-center rounded-3xl bg-gray-100 text-sm text-gray-500">
                    图片加载中
                </div>}
        </div>
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
    const { activeId, onActivate, suggestionIds } = useContext(PlateSuggestionContext)
    const suggestion = getInlineSuggestionData(props.leaf)
    if (suggestion == null || !suggestionIds.has(suggestion.id)) return <PlateLeaf {...props}/>

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
    const threadId = ids.find(id => unresolvedIds.has(id))
    const active = threadId != null && activeId === threadId
    const unresolved = threadId != null

    return <PlateLeaf {...props} as="span"
                      attributes={threadId == null ? props.attributes : {
                          ...props.attributes, onClick: () => onActivate(threadId)
                      }}
                      className={`${unresolved ? 'cursor-pointer bg-yellow-200' : ''} ${active ? 'ring-2 ring-blue-500' : ''} rounded-sm`}/>
}

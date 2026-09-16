import { SlateElement, SlateLeaf, type SlateElementProps, type SlateLeafProps } from 'platejs/static'
import type { TImageElement, TLinkElement } from 'platejs'

export const ParagraphStatic = (props: SlateElementProps) =>
    <SlateElement {...props} as="p" className="mb-4 w-full leading-7 last:mb-0"/>

export const BlockquoteStatic = (props: SlateElementProps) =>
    <SlateElement {...props} as="blockquote"
                  className="my-5 w-full border-l-4 border-gray-300 pl-4 text-gray-600"/>

export const H1Static = (props: SlateElementProps) =>
    <SlateElement {...props} as="h1" className="mb-4 mt-8 w-full text-3xl font-bold first:mt-0"/>
export const H2Static = (props: SlateElementProps) =>
    <SlateElement {...props} as="h2" className="mb-3 mt-7 w-full text-2xl font-bold first:mt-0"/>
export const H3Static = (props: SlateElementProps) =>
    <SlateElement {...props} as="h3" className="mb-3 mt-6 w-full text-xl font-bold first:mt-0"/>
export const H4Static = (props: SlateElementProps) =>
    <SlateElement {...props} as="h4" className="mb-2 mt-5 w-full text-lg font-bold first:mt-0"/>
export const H5Static = (props: SlateElementProps) =>
    <SlateElement {...props} as="h5" className="mb-2 mt-5 w-full font-bold first:mt-0"/>
export const H6Static = (props: SlateElementProps) =>
    <SlateElement {...props} as="h6" className="mb-2 mt-5 w-full font-semibold first:mt-0"/>

export const HorizontalRuleStatic = ({ children, ...props }: SlateElementProps) =>
    <SlateElement {...props} as="div" className="my-6 w-full">
        <hr className="border-gray-200"/>
        {children}
    </SlateElement>

export const BulletedListStatic = (props: SlateElementProps) =>
    <SlateElement {...props} as="ul" className="my-4 w-full list-disc space-y-1 pl-6"/>
export const NumberedListStatic = (props: SlateElementProps) =>
    <SlateElement {...props} as="ol" className="my-4 w-full list-decimal space-y-1 pl-6"/>
export const ListItemStatic = (props: SlateElementProps) => <SlateElement {...props} as="li"/>
export const ListItemContentStatic = (props: SlateElementProps) => <SlateElement {...props} as="div"/>

export const LinkStatic = (props: SlateElementProps<TLinkElement>) =>
    <SlateElement {...props} as="a" attributes={{ ...props.attributes, href: props.element.url }}
                  className="text-blue-600 underline decoration-blue-300 underline-offset-2"/>

function isImageNode(candidate: unknown): candidate is TImageElement & {
    imageHeight?: number
    imageWidth?: number
} {
    return candidate != null && typeof candidate === 'object' && 'type' in candidate && candidate.type === 'img'
}

export const ImageStatic = ({ children, ...props }: SlateElementProps<TImageElement & {
    alt?: string
    imageHeight?: number
    imageWidth?: number
}>) => {
    const index = props.path[0]
    const previous = typeof index === 'number' ? props.editor.children[index - 1] : null
    const next = typeof index === 'number' ? props.editor.children[index + 1] : null
    const grouped = isImageNode(previous) || isImageNode(next)
    let firstImageIndex = typeof index === 'number' ? index : 0
    while (firstImageIndex > 0) {
        const candidate = props.editor.children[firstImageIndex - 1]
        if (!isImageNode(candidate)) break
        firstImageIndex--
    }
    const firstImageNode = props.editor.children[firstImageIndex]
    const groupAspectRatio = isImageNode(firstImageNode) && typeof firstImageNode.imageWidth === 'number' &&
    typeof firstImageNode.imageHeight === 'number' && firstImageNode.imageWidth > 0 &&
    firstImageNode.imageHeight > 0
        ? `${firstImageNode.imageWidth} / ${firstImageNode.imageHeight}`
        : undefined
    const imageStyle = {
        borderRadius: '0.75rem',
        ...(grouped && groupAspectRatio ? { aspectRatio: groupAspectRatio } : {})
    }

    return <SlateElement {...props} as="figure"
                         className={`box-border rounded-xl align-top ${
                             grouped
                                 ? 'my-2 block w-full sm:w-1/2 sm:px-2'
                                 : 'mx-auto my-5 block w-fit max-w-full overflow-hidden'
                         }`}>
        <img src={props.element.url} alt={props.element.alt ?? ''} loading="lazy"
             style={imageStyle}
             className={`!m-0 mx-auto ${
                 grouped
                     ? 'w-full max-h-[28rem] !object-cover'
                     : 'block h-auto max-h-[36rem] max-w-full object-contain'
             }`}/>
        {children}
    </SlateElement>
}

export const BoldStatic = (props: SlateLeafProps) => <SlateLeaf {...props} as="strong"/>
export const CodeStatic = (props: SlateLeafProps) =>
    <SlateLeaf {...props} as="code" className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm"/>
export const HighlightStatic = (props: SlateLeafProps) =>
    <SlateLeaf {...props} as="mark" className="bg-yellow-200"/>
export const ItalicStatic = (props: SlateLeafProps) => <SlateLeaf {...props} as="em"/>
export const StrikethroughStatic = (props: SlateLeafProps) => <SlateLeaf {...props} as="s"/>
export const SubscriptStatic = (props: SlateLeafProps) => <SlateLeaf {...props} as="sub"/>
export const SuperscriptStatic = (props: SlateLeafProps) => <SlateLeaf {...props} as="sup"/>
export const UnderlineStatic = (props: SlateLeafProps) => <SlateLeaf {...props} as="u"/>

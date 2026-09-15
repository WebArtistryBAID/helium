'use client'

import { createPlateEditor, ParagraphPlugin } from 'platejs/react'
import {
    BlockquotePlugin,
    BoldPlugin,
    CodePlugin,
    H1Plugin,
    H2Plugin,
    H3Plugin,
    H4Plugin,
    H5Plugin,
    H6Plugin,
    HighlightPlugin,
    HorizontalRulePlugin,
    ItalicPlugin,
    StrikethroughPlugin,
    SubscriptPlugin,
    SuperscriptPlugin,
    UnderlinePlugin
} from '@platejs/basic-nodes/react'
import { LinkPlugin } from '@platejs/link/react'
import {
    BulletedListPlugin,
    ListItemContentPlugin,
    ListItemPlugin,
    ListPlugin,
    NumberedListPlugin
} from '@platejs/list-classic/react'
import { MarkdownPlugin } from '@platejs/markdown'
import { ImagePlugin } from '@platejs/media/react'
import { CommentPlugin } from '@platejs/comment/react'
import {
    FontBackgroundColorPlugin,
    FontColorPlugin,
    FontSizePlugin,
    LineHeightPlugin,
    TextAlignPlugin
} from '@platejs/basic-styles/react'
import {
    BlockquoteElement,
    BoldLeaf,
    BulletedListElement,
    CodeLeaf,
    CommentLeaf,
    H1Element,
    H2Element,
    H3Element,
    H4Element,
    H5Element,
    H6Element,
    HighlightLeaf,
    HorizontalRuleElement,
    ItalicLeaf,
    ImageElement,
    LinkElement,
    ListItemContentElement,
    ListItemElement,
    NumberedListElement,
    ParagraphElement,
    StrikethroughLeaf,
    SubscriptLeaf,
    SuperscriptLeaf,
    UnderlineLeaf
} from '@/app/lib/plate/plate-elements'
import { EMPTY_PLATE_VALUE, type HeliumPlateValue } from '@/app/lib/plate/plate-types'

export const HELIUM_PLATE_EDITOR_PLUGINS = [
    ParagraphPlugin.withComponent(ParagraphElement),
    BlockquotePlugin.withComponent(BlockquoteElement),
    H1Plugin.withComponent(H1Element),
    H2Plugin.withComponent(H2Element),
    H3Plugin.withComponent(H3Element),
    H4Plugin.withComponent(H4Element),
    H5Plugin.withComponent(H5Element),
    H6Plugin.withComponent(H6Element),
    HorizontalRulePlugin.withComponent(HorizontalRuleElement),
    BoldPlugin.withComponent(BoldLeaf),
    CodePlugin.withComponent(CodeLeaf),
    HighlightPlugin.withComponent(HighlightLeaf),
    ItalicPlugin.withComponent(ItalicLeaf),
    StrikethroughPlugin.withComponent(StrikethroughLeaf),
    SubscriptPlugin.withComponent(SubscriptLeaf),
    SuperscriptPlugin.withComponent(SuperscriptLeaf),
    UnderlinePlugin.withComponent(UnderlineLeaf),
    LinkPlugin.withComponent(LinkElement),
    ImagePlugin.withComponent(ImageElement),
    CommentPlugin.withComponent(CommentLeaf),
    ListPlugin,
    BulletedListPlugin.withComponent(BulletedListElement),
    NumberedListPlugin.withComponent(NumberedListElement),
    ListItemPlugin.withComponent(ListItemElement),
    ListItemContentPlugin.withComponent(ListItemContentElement),
    FontBackgroundColorPlugin,
    FontColorPlugin,
    FontSizePlugin,
    LineHeightPlugin,
    TextAlignPlugin,
    MarkdownPlugin
]

export function createHeliumPlateEditor(value: HeliumPlateValue = structuredClone(EMPTY_PLATE_VALUE)) {
    return createPlateEditor({
        plugins: HELIUM_PLATE_EDITOR_PLUGINS,
        value
    })
}

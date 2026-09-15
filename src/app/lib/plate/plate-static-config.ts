import { BaseParagraphPlugin } from 'platejs'
import { createStaticEditor } from 'platejs/static'
import {
    BaseBlockquotePlugin,
    BaseBoldPlugin,
    BaseCodePlugin,
    BaseH1Plugin,
    BaseH2Plugin,
    BaseH3Plugin,
    BaseH4Plugin,
    BaseH5Plugin,
    BaseH6Plugin,
    BaseHighlightPlugin,
    BaseHorizontalRulePlugin,
    BaseItalicPlugin,
    BaseStrikethroughPlugin,
    BaseSubscriptPlugin,
    BaseSuperscriptPlugin,
    BaseUnderlinePlugin
} from '@platejs/basic-nodes'
import { BaseLinkPlugin } from '@platejs/link'
import { BaseImagePlugin } from '@platejs/media'
import {
    BaseBulletedListPlugin,
    BaseListItemContentPlugin,
    BaseListItemPlugin,
    BaseListPlugin,
    BaseNumberedListPlugin
} from '@platejs/list-classic'
import {
    BaseFontBackgroundColorPlugin,
    BaseFontColorPlugin,
    BaseFontSizePlugin,
    BaseLineHeightPlugin,
    BaseTextAlignPlugin
} from '@platejs/basic-styles'
import {
    BlockquoteStatic,
    BoldStatic,
    BulletedListStatic,
    CodeStatic,
    H1Static,
    H2Static,
    H3Static,
    H4Static,
    H5Static,
    H6Static,
    HighlightStatic,
    HorizontalRuleStatic,
    ItalicStatic,
    ImageStatic,
    LinkStatic,
    ListItemContentStatic,
    ListItemStatic,
    NumberedListStatic,
    ParagraphStatic,
    StrikethroughStatic,
    SubscriptStatic,
    SuperscriptStatic,
    UnderlineStatic
} from '@/app/lib/plate/plate-static-elements'
import { EMPTY_PLATE_VALUE, type HeliumPlateValue } from '@/app/lib/plate/plate-types'
import { BaseSuggestionPlugin } from '@platejs/suggestion'

export const HELIUM_PLATE_STATIC_PLUGINS = [
    BaseParagraphPlugin.withComponent(ParagraphStatic),
    BaseBlockquotePlugin.withComponent(BlockquoteStatic),
    BaseH1Plugin.withComponent(H1Static),
    BaseH2Plugin.withComponent(H2Static),
    BaseH3Plugin.withComponent(H3Static),
    BaseH4Plugin.withComponent(H4Static),
    BaseH5Plugin.withComponent(H5Static),
    BaseH6Plugin.withComponent(H6Static),
    BaseHorizontalRulePlugin.withComponent(HorizontalRuleStatic),
    BaseBoldPlugin.withComponent(BoldStatic),
    BaseCodePlugin.withComponent(CodeStatic),
    BaseHighlightPlugin.withComponent(HighlightStatic),
    BaseItalicPlugin.withComponent(ItalicStatic),
    BaseStrikethroughPlugin.withComponent(StrikethroughStatic),
    BaseSubscriptPlugin.withComponent(SubscriptStatic),
    BaseSuperscriptPlugin.withComponent(SuperscriptStatic),
    BaseUnderlinePlugin.withComponent(UnderlineStatic),
    BaseLinkPlugin.withComponent(LinkStatic),
    BaseImagePlugin.withComponent(ImageStatic),
    BaseListPlugin,
    BaseBulletedListPlugin.withComponent(BulletedListStatic),
    BaseNumberedListPlugin.withComponent(NumberedListStatic),
    BaseListItemPlugin.withComponent(ListItemStatic),
    BaseListItemContentPlugin.withComponent(ListItemContentStatic),
    BaseFontBackgroundColorPlugin,
    BaseFontColorPlugin,
    BaseFontSizePlugin,
    BaseLineHeightPlugin,
    BaseTextAlignPlugin,
    BaseSuggestionPlugin
]

export function createHeliumPlateStaticEditor(value: HeliumPlateValue = structuredClone(EMPTY_PLATE_VALUE)) {
    return createStaticEditor({
        plugins: HELIUM_PLATE_STATIC_PLUGINS,
        value
    })
}

import type { ComponentConfig } from '@puckeditor/core'
import { mediaTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { convertDatesToStrings } from '@/app/lib/data-types'
import ScatteredImageText from './ScatteredImageText'

const imageFields = {
    image: mediaTypeField('图片', [ 'image' ]),
    text: { label: '图片文字', type: 'textarea' as const, contentEditable: true },
    link: { label: '链接 (可选)', type: 'text' as const }
}
const quoteFields = {
    text: { label: '引言', type: 'textarea' as const, contentEditable: true },
    attribution: { label: '署名', type: 'text' as const, contentEditable: true }
}
const imageKeys = [ 'firstImage', 'firstPortrait', 'secondPortrait', 'lastImage' ] as const

const ScatteredImageTextConfig: ComponentConfig = {
    label: '杂乱图文排布',
    fields: {
        firstImage: { label: '左上横图', type: 'object', objectFields: imageFields },
        firstQuote: { label: '上方引言', type: 'object', objectFields: quoteFields },
        firstPortrait: { label: '右上竖图', type: 'object', objectFields: imageFields },
        secondPortrait: { label: '左下竖图', type: 'object', objectFields: imageFields },
        secondQuote: { label: '下方引言', type: 'object', objectFields: quoteFields },
        lastImage: { label: '右下横图', type: 'object', objectFields: imageFields },
        resolvedImages: {
            type: 'object',
            visible: false,
            objectFields: Object.fromEntries(imageKeys.map(key => [ key, RESOLVED_IMAGE_TYPE ]))
        },
        uploadPrefix: { type: 'text', visible: false }
    },
    defaultProps: {
        firstImage: { text: '在这里填写图片文字' }, firstPortrait: {},
        secondPortrait: { text: '在这里填写图片文字' }, lastImage: { text: '在这里填写图片文字' },
        firstQuote: { text: '在这里填写引言', attribution: '署名' },
        secondQuote: { text: '在这里填写引言', attribution: '署名' }
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const images = await Promise.all(imageKeys.map(async key => {
            const value = props[key]?.image
            const id = Number(typeof value === 'object' && value != null ? value.id : value)
            return [ key, Number.isInteger(id) && id > 0 ? convertDatesToStrings(await getImage(id)) : null ]
        }))
        return { props: { resolvedImages: Object.fromEntries(images), uploadPrefix: await getUploadServePath() } }
    },
    render: ({
                 firstImage,
                 firstPortrait,
                 secondPortrait,
                 lastImage,
                 firstQuote,
                 secondQuote,
                 resolvedImages,
                 uploadPrefix
             }) =>
        <ScatteredImageText firstImage={{ ...firstImage, image: resolvedImages?.firstImage }}
                            firstPortrait={{ ...firstPortrait, image: resolvedImages?.firstPortrait }}
                            secondPortrait={{ ...secondPortrait, image: resolvedImages?.secondPortrait }}
                            lastImage={{ ...lastImage, image: resolvedImages?.lastImage }}
                            firstQuote={firstQuote} secondQuote={secondQuote} uploadPrefix={uploadPrefix}/>
}

export default ScatteredImageTextConfig

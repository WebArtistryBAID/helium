import type { ComponentConfig } from '@puckeditor/core'
import type { Image } from '@/generated/prisma/browser'
import FocusImage from '@/app/lib/FocusImage'
import { mediaTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { convertDatesToStrings } from '@/app/lib/data-types'
import { getImage, getUploadServePath } from '@/app/lib/puck/resolve-resources'

const ASPECT_RATIOS: Record<string, string> = {
    '1:1': '1 / 1',
    '4:3': '4 / 3',
    '3:2': '3 / 2',
    '5:4': '5 / 4',
    '16:9': '16 / 9',
    '21:9': '21 / 9',
    '3:4': '3 / 4',
    '2:3': '2 / 3',
    '4:5': '4 / 5',
    '9:16': '9 / 16'
}

function ImageComponent({ image, uploadPrefix, align, aspectRatio, width, height }: {
    image?: Image | null
    uploadPrefix?: string
    align?: string
    aspectRatio?: string
    width?: string
    height?: string
}) {
    if (!image?.sha1 || !uploadPrefix) return null
    const alignment = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

    return <div className={`flex w-full ${alignment}`}>
        <FocusImage image={image} src={`${uploadPrefix}/${image.sha1}.${image.extension || 'webp'}`}
                    alt={image.altText ?? ''} className="block max-w-full object-cover"
                    style={{
                        width: width?.trim() || '100%',
                        height: height?.trim() || 'auto',
                        aspectRatio: ASPECT_RATIOS[aspectRatio ?? '']
                    }}/>
    </div>
}

const ImageConfig: ComponentConfig = {
    label: '图片',
    fields: {
        image: mediaTypeField('图片', [ 'image' ]),
        align: {
            label: '对齐',
            type: 'select',
            options: [
                { label: '左对齐', value: 'left' },
                { label: '居中', value: 'center' },
                { label: '右对齐', value: 'right' }
            ]
        },
        aspectRatio: {
            label: '宽高比',
            type: 'select',
            options: [
                { label: '自由', value: 'free' },
                ...Object.keys(ASPECT_RATIOS).map(ratio => ({ label: ratio, value: ratio }))
            ]
        },
        width: { label: '宽度', type: 'text' },
        height: { label: '高度', type: 'text' },
        resolvedImage: RESOLVED_IMAGE_TYPE,
        resolvedUploadPrefix: { type: 'text', visible: false }
    },
    defaultProps: {
        image: null,
        align: 'center',
        aspectRatio: 'free',
        width: '100%',
        height: 'auto'
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const imageId = Number(typeof props.image === 'object' && props.image != null ? props.image.id : props.image)
        return {
            props: {
                resolvedImage: Number.isInteger(imageId) && imageId > 0 ? convertDatesToStrings(await getImage(imageId)) : null,
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ resolvedImage, resolvedUploadPrefix, align, aspectRatio, width, height }) =>
        <ImageComponent image={resolvedImage} uploadPrefix={resolvedUploadPrefix} align={align}
                        aspectRatio={aspectRatio} width={width} height={height}/>
}

export default ImageConfig

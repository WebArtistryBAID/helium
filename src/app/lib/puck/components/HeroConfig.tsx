import { ComponentConfig } from '@puckeditor/core'
import { colorTypeField, mediaTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import Hero from '@/app/lib/puck/components/Hero'
import { convertDatesToStrings } from '@/app/lib/data-types'

const HeroConfig: ComponentConfig = {
    label: '基础首屏',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        image: mediaTypeField('图片', [ 'image' ]),
        backgroundColor: colorTypeField('背景颜色'),
        lightText: {
            label: '浅色文字',
            type: 'radio',
            options: [
                { label: '启用', value: true },
                { label: '关闭', value: false }
            ]
        },
        topPadding: {
            label: '顶部空白',
            type: 'radio',
            options: [
                { label: '启用', value: true },
                { label: '关闭', value: false }
            ]
        },
        resolvedImage: {
            type: 'object',
            objectFields: {},
            visible: false
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        return {
            props: {
                ...props,
                resolvedImage: props.image != null ? convertDatesToStrings(await getImage(parseInt(props.image))) : null,
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        title: 'About Us',
        backgroundColor: '#ffffff',
        lightText: false,
        topPadding: false
    },
    render: ({ title, lightText, resolvedImage, backgroundColor, topPadding, resolvedUploadPrefix }) =>
        <Hero title={title} lightText={lightText} image={resolvedImage} backgroundColor={backgroundColor}
              topPadding={topPadding} uploadPrefix={resolvedUploadPrefix}/>
}

export default HeroConfig

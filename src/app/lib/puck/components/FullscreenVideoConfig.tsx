import type { ComponentConfig } from '@puckeditor/core'
import { mediaTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { convertDatesToStrings } from '@/app/lib/data-types'
import { getImage, getUploadServePath, type MediaType } from '@/app/studio/media/media-actions'
import FullscreenVideo from '@/app/lib/puck/components/FullscreenVideo'

type MediaValue = string | number | { id?: number } | null | undefined

async function resolveMedia(value: MediaValue, expectedType: MediaType) {
    const id = typeof value === 'object' && value != null ? Number(value.id) : Number(value)
    if (!Number.isInteger(id) || id <= 0) return null
    try {
        const media = await getImage(id)
        if (media?.mediaType !== expectedType) return null
        return convertDatesToStrings(media)
    } catch (error) {
        console.error(`Unable to resolve fullscreen ${expectedType} ${id}:`, error)
        return null
    }
}

const FullscreenVideoConfig: ComponentConfig = {
    label: '全屏视频',
    fields: {
        video: mediaTypeField('视频', [ 'video' ]),
        poster: mediaTypeField('视频加载前显示的图片', [ 'image' ]),
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        titleSize: {
            label: '大小',
            type: 'select',
            options: [
                { label: '小', value: 'sm' },
                { label: '中', value: 'base' },
                { label: '大', value: 'lg' },
                { label: '2x 大', value: 'xl' },
                { label: '3x 大', value: '2xl' },
                { label: '4x 大', value: '3xl' },
                { label: '5x 大', value: '4xl' },
                { label: '6x 大', value: '5xl' },
                { label: '7x 大', value: '6xl' },
                { label: '8x 大', value: '7xl' }
            ]
        },
        content: {
            label: '正文',
            type: 'textarea',
            contentEditable: true
        },
        link: {
            label: '链接',
            type: 'text'
        },
        linkText: {
            label: '链接文字',
            type: 'text',
            contentEditable: true
        },
        resolvedVideo: RESOLVED_IMAGE_TYPE,
        resolvedPoster: RESOLVED_IMAGE_TYPE,
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    defaultProps: {
        title: '在这里填写标题',
        titleSize: '3xl',
        content: '在这里填写正文'
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const [ resolvedVideo, resolvedPoster, resolvedUploadPrefix ] = await Promise.all([
            resolveMedia(props.video, 'video'),
            resolveMedia(props.poster, 'image'),
            getUploadServePath()
        ])
        return { props: { resolvedVideo, resolvedPoster, resolvedUploadPrefix } }
    },
    render: ({
                 title, titleSize, content, link, linkText, resolvedVideo, resolvedPoster, resolvedUploadPrefix
             }) => <FullscreenVideo title={title} titleSize={titleSize} content={content} link={link}
                                    linkText={linkText}
                                    video={resolvedVideo} poster={resolvedPoster} uploadPrefix={resolvedUploadPrefix}/>
}

export default FullscreenVideoConfig

import { ComponentConfig } from '@measured/puck'
import { imageTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { convertDatesToStrings } from '@/app/lib/data-types'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import ImageGallery from '@/app/lib/puck/components/ImageGallery'

const ImageGalleryConfig: ComponentConfig = {
    label: '全屏图片轮播',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        slides: {
            label: '幻灯片',
            type: 'array',
            arrayFields: {
                image: imageTypeField('图片'),
                title: {
                    label: '标题',
                    type: 'text',
                    contentEditable: true
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
                }
            },
            min: 1
        },
        resolvedSlides: {
            type: 'array',
            visible: false,
            arrayFields: {
                image: RESOLVED_IMAGE_TYPE,
                title: {
                    type: 'text'
                },
                content: {
                    type: 'text'
                },
                link: {
                    type: 'text'
                },
                linkText: {
                    type: 'text'
                }
            }
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    defaultProps: {
        title: '图片轮播',
        slides: [
            {
                title: '在这里填写标题',
                content: '在这里填写正文'
            }
        ]
    },
    resolveData: async ({ props }) => {
        return {
            props: {
                resolvedSlides: await Promise.all((props.slides ?? []).map(async (slide: {
                    image: string | null | undefined,
                    title: string | undefined,
                    content: string | undefined,
                    link: string | undefined,
                    linkText: string | undefined
                }) => {
                    if (!slide) return null
                    return {
                        title: slide.title,
                        content: slide.content,
                        link: slide.link,
                        linkText: slide.linkText,
                        image: (slide.image == null || slide.image === '') ? null : convertDatesToStrings(await getImage(parseInt(slide.image)))
                    }
                })),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ title, resolvedSlides, resolvedUploadPrefix }) =>
        <ImageGallery title={title} slides={resolvedSlides} uploadPrefix={resolvedUploadPrefix}/>
}

export default ImageGalleryConfig

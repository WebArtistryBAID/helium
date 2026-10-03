import type { ComponentConfig } from '@puckeditor/core'
import { mediaTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { convertDatesToStrings } from '@/app/lib/data-types'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import ReadMore from './ReadMore'

const HalfScreenImageTextConfig: ComponentConfig = {
    label: '半屏图文排布',
    fields: {
        image: mediaTypeField('图片', [ 'image' ]),
        title: { label: '标题', type: 'text', contentEditable: true },
        text: { label: '文字', type: 'textarea', contentEditable: true },
        link: { label: '链接', type: 'text' },
        linkText: { label: '链接文字', type: 'text' },
        resolvedImage: RESOLVED_IMAGE_TYPE,
        uploadPrefix: { type: 'text', visible: false }
    },
    defaultProps: {
        title: '在这里填写标题',
        text: '在这里填写文字',
        link: '',
        linkText: '了解更多'
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const value = props.image
        const id = Number(typeof value === 'object' && value != null ? value.id : value)
        return {
            props: {
                resolvedImage: Number.isInteger(id) && id > 0 ? convertDatesToStrings(await getImage(id)) : null,
                uploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ title, text, link, linkText, resolvedImage, uploadPrefix }) => {
        const href = typeof link === 'string' ? link.trim() : ''
        const label = typeof linkText === 'string' ? linkText.trim() : ''
        return <section className="container py-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="aspect-[3/2] w-full">
                    {resolvedImage && <img src={`${uploadPrefix}/${resolvedImage.sha1}.webp`}
                                           alt={resolvedImage.altText ?? ''}
                                           className="h-full w-full object-cover"/>}
                </div>
                <div className="min-w-0">
                    {title &&
                        <h2 className="mb-5 break-words text-3xl font-bold leading-tight lg:text-4xl">{title}</h2>}
                    {text &&
                        <p className="whitespace-pre-line break-words font-serif text-base leading-relaxed lg:text-lg">{text}</p>}
                    {href && label && <div className="mt-5"><ReadMore text={label} to={href}/></div>}
                </div>
            </div>
        </section>
    }
}

export default HalfScreenImageTextConfig

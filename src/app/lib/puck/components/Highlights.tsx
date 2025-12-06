import { Image } from '@/generated/prisma/browser'
import If from '@/app/lib/If'
import ReadMore from '@/app/lib/puck/components/ReadMore'
import { ComponentConfig } from '@measured/puck'
import { imageTypeField } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { convertDatesToStrings } from '@/app/lib/data-types'

interface Highlight {
    image: Image | null
    title: string
    text: string
    link: string | null
    linkText: string | null
}

function Highlights({ highlights, uploadPrefix }: { highlights: Highlight[] | null, uploadPrefix: string }) {
    return <section
        aria-label="Highlights"
        className="border-t border-gray-200 my-0 mx-auto"
    >
        <h2
            id="highlights-heading"
            className="sr-only"
        >
            Highlights
        </h2>
        <div
            className="flex flex-col md:flex-row container"
            aria-labelledby="highlights-heading"
            role="list"
        >
            {highlights?.map((highlight, index) => <div key={index}
                                                        className="w-full md:w-1/3 md:border-r border-gray-200 last:md:border-r-0 p-6 md:p-12 bg-white group block"
                                                        role="listitem"
                                                        tabIndex={0}>
                <div className="flex justify-center items-center w-full h-48 overflow-hidden rounded-3xl mb-5">
                    <img alt={highlight.image?.altText} src={`${uploadPrefix}/${highlight.image?.sha1}.webp`}
                         className="w-full h-full object-cover group-hover-scale"/>
                </div>
                <p className="fancy-link text-3xl mb-1 font-serif font-bold">
                    {highlight.title}
                </p>
                <p>{highlight.text}</p>
                <If condition={highlight.link != null && highlight.linkText != null}>
                    <div className="mt-2">
                        <ReadMore text={highlight.linkText ?? ''}
                                  to={highlight.link == null ? '' : highlight.link}/>
                    </div>
                </If>
            </div>)}
        </div>
    </section>
}

const HighlightsConfig: ComponentConfig = {
    label: '图文卡片',
    fields: {
        highlights: {
            label: '项目',
            type: 'array',
            arrayFields: {
                title: {
                    label: '标题',
                    type: 'text',
                    contentEditable: true
                },
                text: {
                    label: '文字',
                    type: 'textarea',
                    contentEditable: true
                },
                image: imageTypeField('图片'),
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
            max: 3,
            min: 1
        },
        resolvedHighlights: {
            type: 'array',
            arrayFields: {
                title: { type: 'text' },
                text: { type: 'textarea' },
                image: { type: 'object', objectFields: {} },
                link: { type: 'text' },
                linkText: { type: 'text' }
            },
            visible: false
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    resolveData: async ({ props }) => {
        // Resolve all images with getImage(id).
        const resolvedHighlights = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (props.highlights ?? []).map(async (highlight: any) => ({
                title: highlight.title,
                text: highlight.text,
                image: (highlight.image == null || highlight.image === '') ? null : convertDatesToStrings(await getImage(parseInt(highlight.image))),
                link: highlight.link,
                linkText: highlight.linkText
            }))
        )
        const resolvedUploadPrefix = await getUploadServePath()
        return {
            props: {
                resolvedHighlights,
                resolvedUploadPrefix
            }
        }
    },
    render: ({ resolvedHighlights, resolvedUploadPrefix }) =>
        <Highlights highlights={resolvedHighlights} uploadPrefix={resolvedUploadPrefix}/>
}

export default HighlightsConfig


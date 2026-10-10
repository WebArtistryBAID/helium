import { isValidElement, type ReactNode } from 'react'
import { Image } from '@/generated/prisma/browser'
import { ComponentConfig } from '@puckeditor/core'
import { mediaTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/lib/puck/resolve-resources'
import { convertDatesToStrings } from '@/app/lib/data-types'

type QuoteItem = {
    title?: ReactNode
    content?: ReactNode
}

function hasContent(value: ReactNode): boolean {
    if (typeof value === 'string') return value.trim().length > 0
    // Studio inline fields expose their original text through the value prop.
    return isValidElement<{ value?: string }>(value) && Boolean(value.props.value?.trim())
}

function Quote({ text, source, image, uploadPrefix, items }: {
    text: string | null,
    source: string | null,
    image: Image | null,
    uploadPrefix: string | null,
    items?: (QuoteItem | null | undefined)[]
}) {
    const visibleItems = (items ?? []).filter((item): item is QuoteItem =>
        item != null && (hasContent(item.title) || hasContent(item.content)))
    if (!hasContent(text) && !hasContent(source) && visibleItems.length === 0 && !image?.sha1) return null

    return <section
        className="container relative my-12 flex flex-col-reverse items-center gap-8 px-8 py-16 sm:px-12 md:my-20 md:flex-row md:px-20 md:py-20 lg:px-36"
        aria-labelledby="principal-quote-heading">
        <h2
            id="principal-quote-heading"
            className="sr-only"
        >
            Quote
        </h2>
        <div className="w-full md:w-1/2">
            {hasContent(text) && <p
                className="!mb-3 break-words !text-2xl leading-relaxed sm:!text-3xl"
                aria-label="Quote"
                role="region"
            >{text}</p>}
            {visibleItems.length > 0 && <ol aria-label="Message items" className="mt-8 space-y-8">
                {visibleItems.map((item, index) => <li key={index} className="flex items-center gap-4 sm:gap-6">
                    <span aria-hidden="true"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--standard-red)] text-xl font-bold text-white sm:h-16 sm:w-16 sm:text-2xl">
                        {index + 1}
                    </span>
                    <div className="min-w-0">
                        {hasContent(item.title) && <h3 className="mb-1 break-words text-xl font-bold sm:text-2xl">
                            {item.title}
                        </h3>}
                        {hasContent(item.content) &&
                            <p className="whitespace-pre-line break-words text-lg leading-relaxed sm:text-xl">
                                {item.content}
                            </p>}
                    </div>
                </li>)}
            </ol>}
            {hasContent(source) &&
                <p className={`${visibleItems.length > 0 ? 'mt-8 ' : ''}w-full text-right font-sans text-base sm:text-lg`}>
                    — {source}
                </p>}
        </div>
        <div className="w-full md:w-1/2 flex justify-center items-center">
            <img
                src={`${uploadPrefix}/${image?.sha1}.webp`}
                alt={image?.altText ?? ''}
                className="h-auto w-48 max-w-full rounded-none object-contain sm:w-56 md:w-64"/>
        </div>

        <div
            aria-hidden="true"
            className="absolute left-4 top-0"
        >
            <svg
                fill="none"
                height="53"
                viewBox="0 0 56.55765920826161 53"
                width="56.55765920826161"
            >
                <defs>
                    <rect
                        id="path_0"
                        height="53"
                        width="56.55765920826162"
                        x="0"
                        y="0"
                    />
                </defs>
                <g
                    opacity="1"
                    transform="translate(0 0)  rotate(0 28.27882960413081 26.5)"
                >
                    <mask
                        id="bg-mask-0"
                        fill="white"
                    >
                        <use xlinkHref="#path_0"/>
                    </mask>
                    <g mask="url(#bg-mask-0)">
                        <g
                            opacity="1"
                            transform="translate(0 0)  rotate(0 28.27882960413081 26.5)"
                        >
                            <path
                                id="path 1"
                                d="M0,53L8.98,53C17.66,53 24.69,46.41 24.69,38.28L24.69,27.75L12.8,27.75C13.1,19.28 19.42,11.52 24.69,9.99L24.69,0C15.06,1.8 0,11.79 0,28.72L0,53Z "
                                fillRule="evenodd"
                                opacity="1"
                                style={{ fill: '#122a28' }}
                                transform="translate(31.867098865540292 0)  rotate(0 12.345280171360663 26.5)"
                            />
                            <path
                                id="path 2"
                                d="M0,53L8.83,53C17.51,53 24.54,46.41 24.54,38.28L24.54,27.75L12.8,27.75C13.1,19.28 19.42,11.52 24.69,9.99L24.69,0C15.06,1.8 0,11.79 0,28.72L0,53Z "
                                fillRule="evenodd"
                                opacity="1"
                                style={{ fill: '#122a28' }}
                                transform="translate(0 0)  rotate(0 12.345280171360665 26.5)"
                            />
                        </g>
                    </g>
                </g>
            </svg>
        </div>
        <div
            aria-hidden="true"
            className="absolute right-4 bottom-0"
        >
            <svg
                fill="none"
                height="53"
                viewBox="0 0 56.55765920826161 53"
                width="56.55765920826161"
            >
                <defs>
                    <rect
                        id="path_0"
                        height="53"
                        width="56.55765920826162"
                        x="0"
                        y="0"
                    />
                </defs>
                <g
                    opacity="1"
                    transform="translate(0 0)  rotate(0 28.27882960413081 26.5)"
                >
                    <mask
                        id="bg-mask-0"
                        fill="white"
                    >
                        <use xlinkHref="#path_0"/>
                    </mask>
                    <g mask="url(#bg-mask-0)">
                        <g
                            opacity="1"
                            transform="translate(0 0)  rotate(0 28.27882960413081 26.5)"
                        >
                            <path
                                id="path 1"
                                d="M24.69,0L15.71,0C7.03,0 0,6.59 0,14.72L0,25.25L11.89,25.25C11.59,33.72 5.27,41.48 0,43.01L0,53C9.64,51.2 24.69,41.21 24.69,24.28L24.69,0Z "
                                fillRule="evenodd"
                                opacity="1"
                                style={{ fill: '#122a28' }}
                                transform="translate(0 0)  rotate(0 12.345280171360665 26.5)"
                            />
                            <path
                                id="path 2"
                                d="M24.69,0L15.86,0C7.18,0 0.15,6.59 0.15,14.72L0.15,25.25L11.89,25.25C11.59,33.72 5.27,41.48 0,43.01L0,53C9.64,51.2 24.69,41.21 24.69,24.28L24.69,0Z "
                                fillRule="evenodd"
                                opacity="1"
                                style={{ fill: '#122a28' }}
                                transform="translate(31.867098865540356 0)  rotate(0 12.345280171360667 26.5)"
                            />
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    </section>
}

const QuoteConfig: ComponentConfig = {
    label: '寄语',
    fields: {
        text: {
            label: '内容',
            type: 'textarea',
            contentEditable: true
        },
        source: {
            label: '来源',
            type: 'textarea',
            contentEditable: true
        },
        items: {
            label: '项目',
            type: 'array',
            arrayFields: {
                title: {
                    label: '标题',
                    type: 'textarea',
                    contentEditable: true
                },
                content: {
                    label: '内容',
                    type: 'textarea',
                    contentEditable: true
                }
            },
            defaultItemProps: { title: '', content: '' }
        },
        image: mediaTypeField('图片', [ 'image' ]),
        resolvedImage: RESOLVED_IMAGE_TYPE,
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
                resolvedImage: props.image == null ? null : convertDatesToStrings(await getImage(parseInt(props.image))),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        text: '我们会让校园成为师生的精神家园，让校园成为师生的学习中心，让校园成为师生的创新沃土，进而让孩子们能爱别人、帮助别人、尊重别人。',
        source: '北京中学校长 夏青峰',
        items: []
    },
    render: ({ text, source, items, resolvedImage, resolvedUploadPrefix }) =>
        <Quote text={text} source={source} items={items} image={resolvedImage} uploadPrefix={resolvedUploadPrefix}/>
}

export default QuoteConfig

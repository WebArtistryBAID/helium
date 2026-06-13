import If from '@/app/lib/If'
import { Image } from '@/generated/prisma/browser'
import Link from 'next/link'
import { ComponentConfig } from '@measured/puck'
import { imageTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { convertDatesToStrings } from '@/app/lib/data-types'

export default function Card({ href, image, title, shortContent, uploadPrefix }: {
    href: string | null | undefined,
    image: Image | null | undefined,
    title: string | null | undefined,
    shortContent: string | null | undefined,
    uploadPrefix: string | null | undefined
}) {
    const content = <>
        <div className="overflow-hidden h-48 w-full">
            <If condition={image != null}>
                <img src={`${uploadPrefix}/${image?.sha1}_thumb.webp`}
                     alt={image?.altText ?? ''}
                     className="object-cover h-full w-full group-hover-scale"/>
            </If>
            <If condition={image == null}>
                <div
                    className="w-full h-full from-blue-300 to-blue-500 bg-gradient-to-tr group-hover-scale"/>
            </If>
        </div>

        <div className="p-8">
            <p className="text-xl font-bold mb-1 fancy-link">{title}</p>
            <p className="text-sm secondary">{shortContent}</p>
        </div>
    </>
    const className = 'block bg-gray-50 hover:bg-gray-100 hover:shadow-lg transition-all duration-100 group w-full h-full'

    return href
        ? <Link href={href} className={`${className} cursor-pointer`}>{content}</Link>
        : <div className={className}>{content}</div>
}

export const CardConfig: ComponentConfig = {
    label: '卡片',
    fields: {
        href: {
            label: '链接',
            type: 'text'
        },
        image: imageTypeField('图片'),
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        shortContent: {
            label: '简介',
            type: 'textarea',
            contentEditable: true
        },
        resolvedImage: RESOLVED_IMAGE_TYPE,
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    resolveData: async ({ props }) => {
        return {
            props: {
                resolvedUploadPrefix: await getUploadServePath(),
                resolvedImage: props.image == null ? null : convertDatesToStrings(await getImage(parseInt(props.image)))
            }
        }
    },
    render: ({ href, resolvedImage, title, shortContent, resolvedUploadPrefix }) =>
        <Card href={href} image={resolvedImage} title={title} shortContent={shortContent}
              uploadPrefix={resolvedUploadPrefix}/>
}

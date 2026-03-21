import { ComponentConfig } from '@measured/puck'
import { colorTypeField, imageTypeField } from '@/app/lib/puck/custom-fields'
import { convertDatesToStrings } from '@/app/lib/data-types'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { Image } from '@/generated/prisma/client'
import ReadMore from '@/app/lib/puck/components/ReadMore'

function ImageTextLayout({
                             topText,
                             title,
                             text,
                             link,
                             linkText,
                             backgroundColor,
                             lightText,
                             inverseOrder,
                             resolvedImage,
                             uploadPrefix
                         }: {
    topText: string | undefined,
    title: string | undefined,
    text: string | undefined,
    link: string | undefined,
    linkText: string | undefined,
    backgroundColor: string | undefined,
    lightText: boolean | undefined,
    inverseOrder: boolean | undefined,
    resolvedImage: Image | undefined,
    uploadPrefix: string | undefined
}) {

    return <div className={`flex w-full flex-col ${inverseOrder ? 'md:flex-row-reverse' : 'md:flex-row'}`}
                data-surface={lightText ? 'dark' : 'light'}>
        <div className="w-full md:w-1/2">
            <img src={`${uploadPrefix}/${resolvedImage?.sha1}.webp`} alt={resolvedImage?.altText}
                 className="h-64 w-full object-cover object-center sm:h-80 md:h-full"/>
        </div>
        <div className="flex w-full flex-col justify-center p-5 sm:p-6 md:w-1/2 md:p-8 lg:p-10"
             style={{
                 backgroundColor,
                 color: lightText ? 'white' : 'black'
             }}>
            <p className="mb-2 text-sm font-bold sm:text-base">{topText}</p>
            <h2 className="mb-4 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">{title}</h2>
            <p className="text-sm opacity-80 sm:text-base">{text}</p>

            {link != null && linkText != null && <div className="mt-5">
                <ReadMore text={linkText} to={link} color={lightText ? 'white' : '#82181a'}/>
            </div>}
        </div>
    </div>
}

const ImageTextLayoutConfig: ComponentConfig = {
    label: '图文排布',
    fields: {
        image: imageTypeField('图片'),
        topText: {
            label: '顶部小标题',
            type: 'text',
            contentEditable: true
        },
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
        link: {
            label: '链接',
            type: 'text'
        },
        linkText: {
            label: '链接文字',
            type: 'text',
            contentEditable: true
        },
        backgroundColor: colorTypeField('背景颜色'),
        lightText: {
            label: '浅色文字',
            type: 'radio',
            options: [
                { label: '启用', value: true },
                { label: '关闭', value: false }
            ]
        },
        inverseOrder: {
            label: '翻转方向',
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
    resolveData: async ({ props }) => {
        const resolvedImage = (props.image == null || props.image === '') ? null : convertDatesToStrings(await getImage(parseInt(props.image)))
        return {
            props: {
                resolvedImage,
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        lightText: false,
        inverseOrder: false
    },
    render: ({
                 topText,
                 title,
                 text,
                 link,
                 linkText,
                 backgroundColor,
                 lightText,
                 inverseOrder,
                 resolvedImage,
                 resolvedUploadPrefix
             }) =>
        <ImageTextLayout topText={topText} title={title} text={text} link={link} linkText={linkText}
                         backgroundColor={backgroundColor} lightText={lightText} resolvedImage={resolvedImage}
                         uploadPrefix={resolvedUploadPrefix} inverseOrder={inverseOrder}/>
}

export default ImageTextLayoutConfig

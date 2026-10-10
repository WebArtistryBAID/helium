import { Image } from '@/generated/prisma/browser'
import { ComponentConfig } from '@puckeditor/core'
import { mediaTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/lib/puck/resolve-resources'
import { convertDatesToStrings } from '@/app/lib/data-types'
import FocusImage from '@/app/lib/FocusImage'
import { hasImageFocus } from '@/app/lib/image-focus'

function Contacts({ title, description, emailText, emails, phoneText, phones, backgroundImage, qrCode, uploadPrefix }: {
    title: string | undefined,
    description: string | undefined,
    emailText: string | undefined,
    emails: ({ text: string } | undefined)[] | undefined,
    phoneText: string | undefined,
    phones: ({ text: string } | undefined)[] | undefined,
    backgroundImage: Image | undefined,
    qrCode: Image | null | undefined,
    uploadPrefix: string | undefined
}) {
    emails = (emails?.filter(email => email !== undefined) ?? []) as { text: string }[]
    phones = (phones?.filter(phone => phone !== undefined) ?? []) as { text: string }[]

    const bgUrl = uploadPrefix && backgroundImage?.sha1 ? `${uploadPrefix}/${backgroundImage.sha1}.webp` : undefined
    const qrCodeUrl = uploadPrefix && qrCode?.sha1 ? `${uploadPrefix}/${qrCode.sha1}.${qrCode.extension || 'webp'}` : undefined

    return (
        <div
            style={bgUrl && !hasImageFocus(backgroundImage) ? { backgroundImage: `url(${bgUrl})` } : undefined}
            className="relative bg-cover"
            aria-labelledby="contact-heading"
            role="region"
        >
            {hasImageFocus(backgroundImage) && <FocusImage image={backgroundImage} src={bgUrl} alt=""
                                                           aria-hidden="true"
                                                           className="absolute inset-0 h-full w-full object-cover"/>}
            <section aria-labelledby="contact-heading"
                     className={`relative section container mt-12 py-12 md:!mt-20 md:!py-20${qrCodeUrl ? ' flex flex-col gap-8 md:flex-row md:items-center md:gap-12' : ''}`}>
                <div className={qrCodeUrl ? 'min-w-0 flex-1' : undefined}>
                    <h2 id="contact-heading" className="mb-4 break-words text-3xl font-bold sm:text-4xl">
                        {title}
                    </h2>
                    {description ? (
                        <p className="!mb-4 text-lg sm:text-xl md:text-2xl">{description}</p>
                    ) : null}

                    <div className="w-full max-w-md rounded-none bg-white p-4 sm:p-5">
                        {emailText ? <p className="font-bold">{emailText}</p> : null}
                        <ul aria-label="Contact emails" className="list-inside list-disc mb-2 text-lg" role="list">
                            {(emails ?? []).map((email) => (
                                <li key={email!.text} role="listitem" className="break-words">
                                    {email!.text}
                                </li>
                            ))}
                        </ul>

                        {phoneText ? <p className="font-bold">{phoneText}</p> : null}
                        <ul aria-label="Contact phone numbers" className="list-inside list-disc text-lg" role="list">
                            {(phones ?? []).map((phone) => (
                                <li key={phone!.text} role="listitem" className="break-words">
                                    {phone!.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                {qrCodeUrl && <div className="flex justify-center md:w-1/3 md:shrink-0">
                    <img src={qrCodeUrl} alt={qrCode?.altText || 'QR code'}
                         className="h-auto w-64 max-w-full object-contain lg:w-72"/>
                </div>}
            </section>
        </div>
    )
}

const ContactsConfig: ComponentConfig = {
    label: '联系方式',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        description: {
            label: '介绍',
            type: 'text',
            contentEditable: true
        },
        emailText: {
            label: '邮件标题',
            type: 'text',
            contentEditable: true
        },
        emails: {
            label: '邮件列表',
            type: 'array',
            arrayFields: {
                text: {
                    label: '邮件',
                    type: 'text',
                    contentEditable: true
                }
            }
        },
        phoneText: {
            label: '电话标题',
            type: 'text',
            contentEditable: true
        },
        phones: {
            label: '电话列表',
            type: 'array',
            arrayFields: {
                text: {
                    label: '电话',
                    type: 'text',
                    contentEditable: true
                }
            }
        },
        backgroundImage: mediaTypeField('背景图片', [ 'image' ]),
        qrCode: mediaTypeField('二维码', [ 'image' ]),
        resolvedBackgroundImage: RESOLVED_IMAGE_TYPE,
        resolvedQrCode: RESOLVED_IMAGE_TYPE,
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const qrCodeId = Number(typeof props.qrCode === 'object' && props.qrCode != null ? props.qrCode.id : props.qrCode)
        return {
            props: {
                ...props,
                resolvedBackgroundImage: props.backgroundImage == null ? null : convertDatesToStrings(await getImage(parseInt(props.backgroundImage))),
                resolvedQrCode: Number.isInteger(qrCodeId) && qrCodeId > 0 ? convertDatesToStrings(await getImage(qrCodeId)) : null,
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    defaultProps: {
        title: '联系我们',
        description: '如有任何疑问，欢迎随时与我们联系。',
        emailText: '邮箱:',
        emails: [ { text: 'baid@bjacademy.com.cn' } ],
        phoneText: '电话:',
        phones: [ { text: '+86 ... .... ....' } ],
        qrCode: null
    },
    render: ({
                 title,
                 description,
                 emailText,
                 emails,
                 phoneText,
                 phones,
                 resolvedBackgroundImage,
                 resolvedQrCode,
                 resolvedUploadPrefix
             }) =>
        <Contacts title={title} description={description} emailText={emailText} emails={emails}
                  phoneText={phoneText} phones={phones} backgroundImage={resolvedBackgroundImage}
                  qrCode={resolvedQrCode}
                  uploadPrefix={resolvedUploadPrefix}/>
}

export default ContactsConfig

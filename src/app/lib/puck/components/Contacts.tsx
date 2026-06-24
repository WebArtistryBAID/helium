import { Image } from '@/generated/prisma/browser'
import { ComponentConfig } from '@measured/puck'
import { imageTypeField, RESOLVED_IMAGE_TYPE } from '@/app/lib/puck/custom-fields'
import { getImage, getUploadServePath } from '@/app/studio/media/media-actions'
import { convertDatesToStrings } from '@/app/lib/data-types'

function Contacts({ title, description, emailText, emails, phoneText, phones, backgroundImage, uploadPrefix }: {
    title: string | undefined,
    description: string | undefined,
    emailText: string | undefined,
    emails: ({ text: string } | undefined)[] | undefined,
    phoneText: string | undefined,
    phones: ({ text: string } | undefined)[] | undefined,
    backgroundImage: Image | undefined,
    uploadPrefix: string | undefined
}) {
    emails = (emails?.filter(email => email !== undefined) ?? []) as { text: string }[]
    phones = (phones?.filter(phone => phone !== undefined) ?? []) as { text: string }[]

    const bgUrl = uploadPrefix && backgroundImage?.sha1 ? `${uploadPrefix}/${backgroundImage.sha1}.webp` : undefined

    return (
        <div
            style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined}
            className="bg-cover"
            aria-labelledby="contact-heading"
            role="region"
        >
            <section aria-labelledby="contact-heading" className="section mt-12 md:!mt-24 py-12 md:!py-24 container">
                <h2 id="contact-heading" className="text-4xl font-bold mb-5">
                    {title}
                </h2>
                {description ? (
                    <p className="text-2xl !mb-3">{description}</p>
                ) : null}

                <div className="rounded-3xl p-4 md:p-5 bg-white max-w-md w-full">
                    {emailText ? <p className="font-bold">{emailText}</p> : null}
                    <ul aria-label="Contact emails" className="list-inside list-disc mb-2" role="list">
                        {(emails ?? []).map((email) => (
                            <li key={email!.text} role="listitem" className="break-words">
                                {email!.text}
                            </li>
                        ))}
                    </ul>

                    {phoneText ? <p className="font-bold">{phoneText}</p> : null}
                    <ul aria-label="Contact phone numbers" className="list-inside list-disc" role="list">
                        {(phones ?? []).map((phone) => (
                            <li key={phone!.text} role="listitem" className="break-words">
                                {phone!.text}
                            </li>
                        ))}
                    </ul>
                </div>
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
        backgroundImage: imageTypeField('背景图片'),
        resolvedBackgroundImage: RESOLVED_IMAGE_TYPE,
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    resolveData: async ({ props }) => {
        return {
            props: {
                ...props,
                resolvedBackgroundImage: props.backgroundImage == null ? null : convertDatesToStrings(await getImage(parseInt(props.backgroundImage))),
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
        phones: [ { text: '+86 ... .... ....' } ]
    },
    render: ({
                 title,
                 description,
                 emailText,
                 emails,
                 phoneText,
                 phones,
                 resolvedBackgroundImage,
                 resolvedUploadPrefix
             }) =>
        <Contacts title={title} description={description} emailText={emailText} emails={emails}
                  phoneText={phoneText} phones={phones} backgroundImage={resolvedBackgroundImage}
                  uploadPrefix={resolvedUploadPrefix}/>
}

export default ContactsConfig

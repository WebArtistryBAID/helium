import { ComponentConfig } from '@measured/puck'
import { prefixLink } from '@/app/lib/data-types'
import serverLanguage from '@/app/[[...slug]]/serverLanguage'

interface Step {
    name: string | undefined
    content: string | undefined
    link: string | undefined
    linkText: string | undefined
}

async function ApplicationSteps({ title, steps }: { title: string, steps: (Step | undefined)[] | undefined }) {
    const lang = await serverLanguage()
    const list: Step[] = (steps ?? []).filter((s): s is Step => !!s)

    const dotClass = (idx: number) => {
        switch (idx) {
            case 0:
                return 'bg-[var(--standard-blue)]'
            case 1:
                return 'bg-[var(--standard-red)]'
            case 2:
                return 'bg-[var(--standard-blue)] md:bg-[var(--standard-red)]'
            case 3:
                return 'bg-[var(--standard-red)] md:bg-[var(--standard-blue)]'
            default:
                return 'bg-[var(--standard-blue)]'
        }
    }

    if (!list.length) return null

    return (
        <section aria-labelledby="application-steps-heading" className="section !mt-24">
            <h2 id="application-steps-heading" className="text-3xl md:text-4xl font-bold !mb-8">
                {title}
            </h2>

            <div aria-label="Application steps" className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8" role="list">
                {list.map((step, idx) =>
                    <div key={idx} className="flex items-center gap-8" role="listitem" tabIndex={0}>
                        <div
                            className={`${dotClass(idx)} rounded-full w-16 h-16 flex-shrink-0 flex justify-center items-center text-white text-2xl`}>
                            {idx + 1}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-1">{step.name}</h3>
                            <div className="!text-lg">{step.content}</div>
                            {step.link && step.linkText ? (
                                <a href={prefixLink(lang, step.link)}
                                   className="inline-block py-1 px-2 font-sans rounded-full bg-[var(--standard-blue)] text-white">
                                    {step.linkText}
                                </a>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

const ApplicationStepsConfig: ComponentConfig = {
    label: '申请步骤',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        steps: {
            label: '步骤',
            type: 'array',
            arrayFields: {
                name: {
                    label: '名称',
                    type: 'text',
                    contentEditable: true
                },
                content: {
                    label: '内容',
                    type: 'textarea',
                    contentEditable: true
                },
                link: {
                    label: '链接',
                    type: 'text'
                },
                linkText: {
                    label: '链接文本',
                    type: 'text',
                    contentEditable: true
                }
            },
            max: 4
        }
    },
    defaultProps: {
        title: '开始申请',
        steps: [
            {
                name: '下载申请表格',
                content: '点击下方链接下载申请表格。',
                link: 'https://example.com',
                linkText: '下载'
            },
            {
                name: '填写并提交申请',
                content: '填写完毕后，将申请表格通过电子邮件发往 baid@bjacademy.com.cn。'
            },
            {
                name: '等待通知',
                content: '我们的招生老师将联系您，告知后续流程，并协助安排面试。'
            },
            {
                name: '结果公布',
                content: '我们将在您获录取后第一时间与您联系。'
            }
        ]
    },
    render: ({ title, steps }) => <ApplicationSteps title={title} steps={steps}/>
}

export default ApplicationStepsConfig

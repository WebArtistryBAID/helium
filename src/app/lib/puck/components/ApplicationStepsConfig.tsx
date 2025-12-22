import { ComponentConfig } from '@measured/puck'
import ApplicationSteps from '@/app/lib/puck/components/ApplicationSteps'

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
import { ComponentConfig } from '@measured/puck'

function HorizontalTopText({ title, text }: { title: string | undefined, text: string | undefined }) {
    return <section aria-labelledby="mission-heading" className="section !mt-24 container">
        <div className="flex flex-col md:flex-row gap-5">
            <div className="w-full md:w-1/3">
                <h2 id="mission-heading" className="text-3xl md:text-4xl font-bold">
                    {title}
                </h2>
            </div>
            <div className="w-full md:w-2/3">
                <p className="text-2xl md:text-3xl lg:text-4xl" style={{ lineHeight: '3rem' }}>
                    {text}
                </p>
            </div>
        </div>
    </section>
}

const HorizontalTopTextConfig: ComponentConfig = {
    label: '横向顶部文字',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        text: {
            label: '文字',
            type: 'textarea',
            contentEditable: true
        }
    },
    defaultProps: {
        title: '我们的使命',
        text: '以立足北京、植根中国、面向世界的现代教育，培养全面发展的未来领袖。'
    },
    render: ({ title, text }) =>
        <HorizontalTopText title={title} text={text}/>
}

export default HorizontalTopTextConfig

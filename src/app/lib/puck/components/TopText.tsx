import ReadMore from '@/app/lib/puck/components/ReadMore'
import If from '@/app/lib/If'
import { ComponentConfig } from '@measured/puck'

function TopText({ title, text, to = null, linkText = null }: {
    title: string,
    text: string,
    to: string | null,
    linkText: string | null
}) {
    return <div className="container">
        <div className="max-w-xl">
            <h2 className="text-3xl font-serif font-bold">
                {title}
            </h2>
            <p className="text-xl">{text}</p>
            <If condition={to != null && to.length > 0}>
                <div className="flex justify-end mt-5">
                    <ReadMore text={linkText ?? '了解更多'} to={to ?? ''}/>
                </div>
            </If>
        </div>
    </div>
}

const TopTextConfig: ComponentConfig = {
    label: '顶部文字',
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
        },
        to: {
            label: '链接',
            type: 'text'
        },
        linkText: {
            label: '链接文字',
            type: 'text',
            contentEditable: true
        }
    },
    defaultProps: {
        title: '我们是 BAID',
        text: '在 BAID，你可以尽情探索热爱，收获深厚情谊，并在日常点滴中不断发现通往自我潜能的新路径。',
        to: '/about',
        linkText: '关于我们'
    },
    render: ({ title, text, to, linkText }) =>
        <TopText title={title} text={text} to={to} linkText={linkText}/>
}

export default TopTextConfig

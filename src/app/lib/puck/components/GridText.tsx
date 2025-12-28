import { ComponentConfig } from '@measured/puck'

function GridText({ title, texts }: { title: string | undefined, texts: (string | undefined)[] | undefined }) {
    texts = texts?.filter((text) => text != null) ?? []
    return <section aria-labelledby="overview-heading" className="section container !py-16 !mb-24">
        <h2 id="overview-heading" className="text-4xl font-sans font-bold mb-5">
            {title}
        </h2>
        <div className="w-full grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 !text-2xl md:!text-xl lg:!text-2xl"
             role="list" style={{ lineHeight: '3rem' }}>
            {texts.map((text, index) => <p key={index} role="listitem" tabIndex={0}>{text}</p>)}
        </div>
    </section>
}

const GridTextConfig: ComponentConfig = {
    label: '文字排布',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        texts: {
            label: '内容',
            type: 'array',
            arrayFields: {
                text: {
                    label: '文字',
                    type: 'text',
                    contentEditable: true
                }
            }
        }
    },
    defaultProps: {
        title: '总览',
        texts: [
            { text: '北京中学成立于 2013 年 9 月，是经北京市政府批准，由朝阳区政府创办的一所十二年一贯制的公办学校，致力于办成一所具有北京风格、中国气质与世界胸怀的现代学校。' },
            { text: '2020 年，北京中学中外合作办学项目 (北京中学国际部) 获北京市教委批准。我们是 AP 授权校、CIS 认证成员学校、ACT 考试中心与剑桥国际课程学校。北京中学国际部提供中国高中课程、AP 课程与特色课程融合的课程体系。' },
            { text: '北京中学始终致力于学生的全面与自由成长。我们相信，在全体师生的努力下，“世界因我更美好”的校训将真正照进现实。' }
        ]
    },
    render: ({ title, texts }) => <GridText title={title}
                                            texts={texts?.map((item: { text: string } | undefined) => item?.text)}/>
}

export default GridTextConfig

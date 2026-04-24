'use client'

import { useState } from 'react'
import { ComponentConfig } from '@measured/puck'

function FAQItem({ questionEN, questionZH, answerEN, answerZH }: {
    questionEN: string
    questionZH: string
    answerEN: string
    answerZH: string
}) {
    const [ open, setOpen ] = useState(false)
    return (
        <div className="border-b border-gray-200 last:border-0">
            <button className="w-full text-left py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition"
                    onClick={() => setOpen(o => !o)}>
                <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">{questionEN}</p>
                    <p className="text-gray-500 text-sm">{questionZH}</p>
                </div>
                <svg className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            {open && (
                <div className="pb-4 text-gray-600 text-sm">
                    <p>{answerEN}</p>
                    <p className="text-gray-400 mt-1">{answerZH}</p>
                </div>
            )}
        </div>
    )
}

function FAQAccordion({ titleEN, titleZH, items }: {
    titleEN: string
    titleZH: string
    items: Array<{ questionEN?: string; questionZH?: string; answerEN?: string; answerZH?: string }>
}) {
    return (
        <div className="my-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-2">{titleZH}</p>
            <div className="bg-white rounded-xl px-4">
                {items?.map((item, i) => (
                    <FAQItem key={i} questionEN={item.questionEN ?? ''} questionZH={item.questionZH ?? ''}
                             answerEN={item.answerEN ?? ''} answerZH={item.answerZH ?? ''}/>
                ))}
            </div>
        </div>
    )
}

const FAQAccordionConfig: ComponentConfig = {
    label: '常见问题',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        items: {
            label: '问题',
            type: 'array',
            arrayFields: {
                questionEN: { label: '问题（英文）', type: 'text' },
                questionZH: { label: '问题（中文）', type: 'text' },
                answerEN: { label: '回答（英文）', type: 'textarea' },
                answerZH: { label: '回答（中文）', type: 'textarea' }
            }
        }
    },
    defaultProps: {
        titleEN: 'Frequently Asked Questions',
        titleZH: '家长常见问题',
        items: [
            { questionEN: 'Where should families find the latest admissions information?', questionZH: '家长应该在哪里查看最新招生信息？', answerEN: 'Please refer to the current admissions page and official school notices for the most accurate information.', answerZH: '请以当年招生页面和学校官方通知为准。' },
            { questionEN: 'Can students visit the campus before applying?', questionZH: '申请前可以了解校园吗？', answerEN: 'When open events are available, the school will share registration details through official channels.', answerZH: '如有开放活动，学校会通过官方渠道发布报名信息。' }
        ]
    },
    render: ({ titleEN, titleZH, items }) => <FAQAccordion titleEN={titleEN} titleZH={titleZH} items={items}/>
}

export default FAQAccordionConfig

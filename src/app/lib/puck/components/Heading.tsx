import { ComponentConfig } from '@puckeditor/core'
import { colorTypeField } from '@/app/lib/puck/custom-fields'
import React from 'react'
import { Property } from 'csstype'
import TextAlign = Property.TextAlign

function Heading({ level, text, size, color, align, bold, italic }: {
    level: number,
    text: string,
    size: string,
    color: string,
    align: string,
    bold: boolean,
    italic: boolean
}) {
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements
    return <Tag className={`text-${size} ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''}`}
                style={{ color, textAlign: align as (TextAlign | undefined) }}>{text}</Tag>
}

const HeadingConfig: ComponentConfig = {
    label: '标题',
    fields: {
        text: {
            label: '文字',
            type: 'text',
            contentEditable: true
        },
        level: {
            label: '级别',
            type: 'select',
            options: [
                { label: '一级', value: 1 },
                { label: '二级', value: 2 },
                { label: '三级', value: 3 },
                { label: '四级', value: 4 },
                { label: '五级', value: 5 },
                { label: '六级', value: 6 }
            ]
        },
        size: {
            label: '大小',
            type: 'select',
            options: [
                { label: '小', value: 'sm' },
                { label: '中', value: 'base' },
                { label: '大', value: 'lg' },
                { label: '2x 大', value: 'xl' },
                { label: '3x 大', value: '2xl' },
                { label: '4x 大', value: '3xl' },
                { label: '5x 大', value: '4xl' },
                { label: '6x 大', value: '5xl' },
                { label: '7x 大', value: '6xl' },
                { label: '8x 大', value: '7xl' }
            ]
        },
        bold: {
            label: '加粗',
            type: 'radio',
            options: [
                { label: '启用', value: true },
                { label: '关闭', value: false }
            ]
        },
        italic: {
            label: '斜体',
            type: 'radio',
            options: [
                { label: '启用', value: true },
                { label: '关闭', value: false }
            ]
        },
        align: {
            label: '对齐',
            type: 'select',
            options: [
                { label: '左对齐', value: 'left' },
                { label: '居中', value: 'center' },
                { label: '右对齐', value: 'right' },
                { label: '两端对齐', value: 'justify' }
            ]
        },
        color: colorTypeField('颜色')
    },
    defaultProps: {
        level: 1,
        size: '4xl',
        align: 'left',
        bold: true,
        italic: false,
        color: '#000000'
    },
    render: ({ text, level, size, color, align, bold, italic }) => <Heading text={text} level={level} size={size}
                                                                            color={color}
                                                                            align={align} bold={bold} italic={italic}/>
}

export default HeadingConfig

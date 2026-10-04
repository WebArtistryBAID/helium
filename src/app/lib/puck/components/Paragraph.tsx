import { ComponentConfig } from '@puckeditor/core'
import { colorTypeField } from '@/app/lib/puck/custom-fields'
import { Property } from 'csstype'
import TextAlign = Property.TextAlign

const PARAGRAPH_SIZE_CLASSES: Record<string, string> = {
    sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-lg sm:text-xl',
    '2xl': 'text-xl sm:text-2xl', '3xl': 'text-xl sm:text-2xl md:text-3xl',
    '4xl': 'text-2xl sm:text-3xl md:text-4xl', '5xl': 'text-3xl sm:text-4xl md:text-5xl',
    '6xl': 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
    '7xl': 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl'
}

function Paragraph({ text, size, color, align, bold, italic }: {
    text: string,
    size: string,
    color: string,
    align: string,
    bold: boolean,
    italic: boolean
}) {
    return <p
        className={`break-words leading-relaxed ${PARAGRAPH_SIZE_CLASSES[size] ?? 'text-base'} ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''}`}
              style={{ color, textAlign: align as (TextAlign | undefined) }}>{text}</p>
}

const ParagraphConfig: ComponentConfig = {
    label: '段落',
    fields: {
        text: {
            label: '文字',
            type: 'text',
            contentEditable: true
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
        color: colorTypeField('颜色')
    },
    defaultProps: {
        size: 'base',
        align: 'left',
        bold: false,
        italic: false,
        color: '#000000'
    },
    render: ({ text, size, align, bold, italic, color }) => <Paragraph text={text} size={size} bold={bold}
                                                                       italic={italic} align={align} color={color}/>
}

export default ParagraphConfig

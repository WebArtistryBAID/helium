import ButtonWidget from '@/app/lib/puck/components/ButtonWidget'
import { ComponentConfig } from '@measured/puck'

const ButtonConfig: ComponentConfig = {
    label: '按钮',
    fields: {
        text: {
            label: '文字',
            type: 'text',
            contentEditable: true
        },
        link: {
            label: '链接',
            type: 'text'
        },
        blank: {
            label: '在新标签页中打开',
            type: 'radio',
            options: [
                { label: '启用', value: true },
                { label: '关闭', value: false }
            ]
        },
        color: {
            label: '颜色',
            type: 'select',
            options: [
                { label: '蓝色', value: 'blue' },
                { label: '青色', value: 'cyan' },
                { label: '透明', value: 'alternative' },
                { label: '黑色', value: 'dark' },
                { label: '白色', value: 'light' },
                { label: '绿色', value: 'green' },
                { label: '红色', value: 'red' },
                { label: '黄色', value: 'yellow' },
                { label: '紫色', value: 'purple' }
            ]
        },
        size: {
            label: '大小',
            type: 'select',
            options: [
                { label: '更小', value: 'xs' },
                { label: '小', value: 'sm' },
                { label: '中', value: 'md' },
                { label: '大', value: 'lg' },
                { label: '更大', value: 'xl' }
            ]
        },
        align: {
            label: '对齐',
            type: 'select',
            options: [
                { label: '左对齐', value: 'start' },
                { label: '居中', value: 'center' },
                { label: '右对齐', value: 'end' },
                { label: '基线', value: 'baseline' }
            ]
        }
    },
    defaultProps: {
        text: '按钮',
        link: '/',
        blank: false,
        color: 'blue',
        size: 'md',
        align: 'start'
    },
    render: ({ text, link, blank, color, size, align }) => <ButtonWidget text={text} link={link} blank={blank}
                                                                         color={color} size={size} align={align}/>
}

export default ButtonConfig

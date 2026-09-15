import { ComponentConfig } from '@puckeditor/core'
import Curriculum from '@/app/lib/puck/components/Curriculum'

const CurriculumConfig: ComponentConfig = {
    label: '课程体系',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        curricula: {
            label: '项目',
            type: 'array',
            arrayFields: {
                title: {
                    label: '名称',
                    type: 'text',
                    contentEditable: true
                },
                description: {
                    label: '介绍',
                    type: 'textarea',
                    contentEditable: true
                },
                courses: {
                    label: '课程',
                    type: 'array',
                    arrayFields: {
                        name: {
                            label: '课程名称',
                            type: 'text',
                            contentEditable: true
                        }
                    }
                }
            }
        }
    },
    defaultProps: {
        title: '课程体系',
        curricula: [
            {
                title: '基础课程',
                description: '基础课程服务于学生全面发展，夯实学生语文、英语、数学、科学与人文等核心学科基础。',
                courses: [
                    { name: '语文' },
                    { name: '核心英语' },
                    { name: '核心数学' },
                    { name: '核心科学' },
                    { name: '核心人文' }
                ]
            },
            {
                title: '拓展课程',
                description: '拓展课程服务于学生多元发展，提供「处处皆课堂，时时可成长」的学习机会。',
                courses: [
                    { name: '学院系列' },
                    { name: '阅历系列' },
                    { name: '雅趣系列' },
                    { name: '健身系列' },
                    { name: '服务系列' }
                ]
            },
            {
                title: '潜能课程',
                description: '潜能课程服务于学生卓越发展，培养学生领导力、创造力，及优势力。',
                courses: [
                    { name: '领导力系列' },
                    { name: '创造力系列 ' },
                    { name: '优势力系列 ' }
                ]
            }
        ]
    },
    render: ({ title, curricula }) => <Curriculum title={title} curricula={curricula}/>
}

export default CurriculumConfig

import { ComponentConfig } from '@measured/puck'
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
                        },
                        description: {
                            label: '课程说明',
                            type: 'textarea',
                            contentEditable: true
                        },
                        href: {
                            label: '跳转链接',
                            type: 'text'
                        }
                    },
                    getItemSummary: item => item.name || '课程项'
                },
                primaryLabel: {
                    label: '区块按钮文字',
                    type: 'text'
                },
                primaryLink: {
                    label: '区块按钮链接',
                    type: 'text'
                }
            },
            getItemSummary: item => item.title || '课程分组'
        }
    },
    defaultProps: {
        title: '课程体系',
        curricula: [
            {
                title: '基础课程',
                description: '基础课程服务于学生全面发展，夯实学生语文、英语、数学、科学与人文等核心学科基础。',
                courses: [
                    { name: '语文', description: '阅读、写作、讨论与文化理解并重', href: '/academics/high-school#courses-overview' },
                    { name: '英语', description: '语言表达、学术阅读与跨文化沟通' },
                    { name: '数学', description: '逻辑建模、问题解决与学科衔接' },
                    { name: '科学', description: '围绕生物、物理、化学建立科学方法' },
                    { name: '社会', description: '把社会观察、历史理解与现实议题连接起来' }
                ],
                primaryLabel: '查看课程总览',
                primaryLink: '/academics/high-school'
            },
            {
                title: '拓展课程',
                description: '拓展课程服务于学生多元发展，提供「处处皆课堂，时时可成长」的学习机会。',
                courses: [
                    { name: '文化体验 - 英语', description: '把英语学习放入真实文化语境中' },
                    { name: '合唱和音乐欣赏', description: '让感受、表达与合作在音乐里发生' },
                    { name: '国际标准舞', description: '用身体表达、秩序与节奏建立自信' },
                    { name: '体育', description: '把体能、团队与长期运动习惯结合起来' },
                    { name: '电影作品赏析', description: '通过影像阅读训练审美与判断' }
                ],
                primaryLabel: '浏览公开课程页',
                primaryLink: '/academics/high-school'
            },
            {
                title: '潜能课程',
                description: '潜能课程服务于学生卓越发展，培养学生领导力、创造力，及优势力。',
                courses: [
                    { name: 'AP 生物', description: '实验、探究与学术表达并重', href: '/academics/high-school#courses-overview' },
                    { name: '电影空间艺术设计', description: '把创意、空间与叙事能力结合起来' },
                    { name: '项目式学习延展', description: '将兴趣变成真实问题驱动的探索' }
                ],
                primaryLabel: '进入高中项目',
                primaryLink: '/academics/high-school'
            }
        ]
    },
    render: ({ title, curricula }) => <Curriculum title={title} curricula={curricula}/>
}

export default CurriculumConfig

import { ComponentConfig } from '@puckeditor/core'
import { getAllPublishedCourses } from '@/app/lib/puck/resolve-resources'
import { convertDatesToStrings, SimplifiedContentEntity } from '@/app/lib/data-types'
import Courses from '@/app/lib/puck/components/Courses'

const CoursesConfig: ComponentConfig = {
    label: '课程列表',
    fields: {
        title: {
            label: '标题',
            type: 'textarea',
            contentEditable: true
        },
        linkToCourse: {
            label: '链接到课程',
            type: 'radio',
            options: [
                { label: '关闭', value: false },
                { label: '开启', value: true }
            ]
        },
        categoryENList: {
            label: '英文分类筛选',
            type: 'array',
            arrayFields: {
                value: {
                    label: '分类英文名',
                    type: 'text'
                }
            }
        },
        resolvedCourses: {
            type: 'object',
            objectFields: {},
            visible: false
        }
    },
    defaultProps: {
        title: '我们的课程',
        linkToCourse: false,
        categoryENList: []
    },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        const categoryFilters = (props.categoryENList ?? [])
            .map((item: { value?: string | null } | null | undefined) => item?.value?.trim() ?? '')
            .filter(Boolean)
        const legacyCategoryFilter = typeof props.categoryEN === 'string' ? props.categoryEN.trim() : ''
        const activeCategoryFilters = categoryFilters.length > 0
            ? new Set(categoryFilters)
            : legacyCategoryFilter
                ? new Set([ legacyCategoryFilter ])
                : null
        const current: { [courseName: string]: (SimplifiedContentEntity | undefined)[] | undefined } = {}
        for (const course of convertDatesToStrings(await getAllPublishedCourses())) {
            if (activeCategoryFilters && !activeCategoryFilters.has(course.categoryEN ?? '')) continue

            const categoryKey = course.categoryEN ?? course.categoryZH
            if (categoryKey == null) continue

            if (current[categoryKey] == null) current[categoryKey] = []
            current[categoryKey]!.push(course)
        }
        return {
            props: {
                ...props,
                resolvedCourses: current
            }
        }
    },
    render: ({ title, linkToCourse, categoryENList, resolvedCourses }) =>
        <Courses title={title} courses={resolvedCourses} linkToCourse={linkToCourse}
                 categoryOrder={(categoryENList ?? []).map((item: {
                     value?: string | null
                 } | null | undefined) => item?.value?.trim() ?? '').filter(Boolean)}/>
}

export default CoursesConfig

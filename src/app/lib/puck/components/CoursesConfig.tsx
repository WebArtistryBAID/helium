import { ComponentConfig } from '@measured/puck'
import { getAllPublishedCourses } from '@/app/studio/editor/entity-actions'
import { convertDatesToStrings, SimplifiedContentEntity } from '@/app/lib/data-types'
import Courses from '@/app/lib/puck/components/Courses'

const CoursesConfig: ComponentConfig = {
    label: '课程列表',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
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
        categoryENList: []
    },
    resolveData: async ({ props }) => {
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
    render: ({ title, resolvedCourses }) => <Courses title={title} courses={resolvedCourses}/>
}

export default CoursesConfig

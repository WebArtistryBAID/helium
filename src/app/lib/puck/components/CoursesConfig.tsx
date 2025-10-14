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
        resolvedCourses: {
            type: 'object',
            objectFields: {},
            visible: false
        }
    },
    defaultProps: {
        title: '我们的课程'
    },
    resolveData: async ({ props }) => {
        const current: { [courseName: string]: (SimplifiedContentEntity | undefined)[] | undefined } = {}
        for (const course of convertDatesToStrings(await getAllPublishedCourses())) {
            if (course.categoryZH != null) {
                if (current[course.categoryZH] == null) current[course.categoryZH] = []
                current[course.categoryZH]!.push(course)
            }
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

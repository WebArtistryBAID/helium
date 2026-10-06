import { contentSortField } from '@/app/lib/content-sort'
import { ComponentConfig } from '@puckeditor/core'
import { getPublishedProjectsByCategoriesForInit } from '@/app/lib/puck/resolve-resources'
import { getUploadServePath } from '@/app/lib/puck/resolve-resources'
import ProjectCategory from '@/app/lib/puck/components/ProjectCategory'
import { convertDatesToStrings, Paginated, SimplifiedContentEntity } from '@/app/lib/data-types'

const ProjectCategoryConfig: ComponentConfig = {
    label: '项目列表',
    fields: {
        sort: contentSortField,
        resolvedProjectsInit: {
            type: 'array',
            visible: false,
            arrayFields: {}
        },
        resolvedUploadPrefix: {
            type: 'text',
            visible: false
        }
    },
    defaultProps: { sort: 'title-en-asc' },
    resolveData: async ({ props }, { trigger }) => {
        if (trigger === 'move') return { props }
        return {
            props: {
                resolvedProjectsInit: convertDatesToStrings(await getPublishedProjectsByCategoriesForInit(props.sort ?? 'title-en-asc')),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ sort, resolvedProjectsInit, resolvedUploadPrefix }) => {
        if (resolvedProjectsInit == null) {
            return <></>
        }
        return <>
            {resolvedProjectsInit.map((proj: {
                categoryEN: string,
                categoryZH: string,
                projects: Paginated<SimplifiedContentEntity>
            }) =>
                <ProjectCategory sort={sort} titleEN={proj.categoryEN} titleZH={proj.categoryZH} init={proj.projects}
                                 key={proj.categoryEN}
                                 uploadPrefix={resolvedUploadPrefix}/>)}
        </>
    }
}

export default ProjectCategoryConfig

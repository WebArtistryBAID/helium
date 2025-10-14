import { ComponentConfig } from '@measured/puck'
import { getPublishedProjectsByCategoriesForInit } from '@/app/studio/editor/entity-actions'
import { getUploadServePath } from '@/app/studio/media/media-actions'
import ProjectCategory from '@/app/lib/puck/components/ProjectCategory'
import { convertDatesToStrings, Paginated, SimplifiedContentEntity } from '@/app/lib/data-types'

const ProjectCategoryConfig: ComponentConfig = {
    label: '项目列表',
    fields: {
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
    resolveData: async () => {
        return {
            props: {
                resolvedProjectsInit: convertDatesToStrings(await getPublishedProjectsByCategoriesForInit()),
                resolvedUploadPrefix: await getUploadServePath()
            }
        }
    },
    render: ({ resolvedProjectsInit, resolvedUploadPrefix }) => {
        if (resolvedProjectsInit == null) {
            return <></>
        }
        return <>
            {resolvedProjectsInit.map((proj: {
                categoryEN: string,
                categoryZH: string,
                projects: Paginated<SimplifiedContentEntity>
            }) =>
                <ProjectCategory titleEN={proj.categoryEN} titleZH={proj.categoryZH} init={proj.projects}
                                 key={proj.categoryEN}
                                 uploadPrefix={resolvedUploadPrefix}/>)}
        </>
    }
}

export default ProjectCategoryConfig

import type { ComponentConfig } from '@puckeditor/core'

const GridConfig: ComponentConfig = {
    label: '网格',
    fields: {
        columns: { label: '列数', type: 'number', min: 1, max: 6, step: 1 },
        gap: { label: '间距', type: 'text' },
        children: { label: '内容', type: 'slot' }
    },
    defaultProps: {
        columns: 2,
        gap: '24px',
        children: []
    },
    render: ({ columns, gap, children: Children }) => {
        const count = Number(columns)
        const columnCount = Number.isFinite(count) ? Math.max(1, Math.min(6, Math.floor(count))) : 2
        return <Children className="grid max-md:!grid-cols-1 [&>*]:min-w-0" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            gap: typeof gap === 'string' ? gap.trim() || '24px' : '24px'
        }}/>
    }
}

export default GridConfig

import { ComponentConfig } from '@measured/puck'

function ImageGalleryBlock({ titleEN, titleZH, images, layout }: {
    titleEN: string
    titleZH: string
    images: Array<{ url?: string; alt?: string; captionEN?: string; captionZH?: string }>
    layout: string
}) {
    if (!images || images.length === 0) {
        return (
            <div className="my-8 bg-gray-100 rounded-xl p-8 text-center text-gray-500">
                <p>请在编辑器中添加图片</p>
            </div>
        )
    }

    const gridClass = layout === 'slider'
        ? 'flex gap-4 overflow-x-auto pb-4'
        : layout === 'masonry'
            ? 'columns-2 md:columns-3 gap-4 space-y-4'
            : 'grid grid-cols-2 md:grid-cols-3 gap-4'

    return (
        <div className="my-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-pink-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">{titleZH}</p>
            <div className={gridClass}>
                {images.map((img, i) => img.url ? (
                    <figure key={i} className={layout === 'slider' ? 'flex-shrink-0 w-64' : ''}>
                        <img src={img.url} alt={img.alt ?? ''}
                             className={`rounded-xl w-full object-cover ${layout === 'masonry' ? '' : 'h-48'}`}/>
                        {(img.captionEN || img.captionZH) && (
                            <figcaption className="text-gray-500 text-xs mt-1">{img.captionEN} {img.captionZH}</figcaption>
                        )}
                    </figure>
                ) : null)}
            </div>
        </div>
    )
}

const ImageGalleryBlockConfig: ComponentConfig = {
    label: '图片集',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        layout: {
            label: '布局',
            type: 'select',
            options: [
                { label: '网格', value: 'grid' },
                { label: '瀑布流', value: 'masonry' },
                { label: '滑动', value: 'slider' }
            ]
        },
        images: {
            label: '图片',
            type: 'array',
            arrayFields: {
                url: { label: '图片链接', type: 'text' },
                alt: { label: '替代文字', type: 'text' },
                captionEN: { label: '说明（英文）', type: 'text' },
                captionZH: { label: '说明（中文）', type: 'text' }
            }
        }
    },
    defaultProps: {
        titleEN: 'Campus Moments',
        titleZH: '校园瞬间',
        layout: 'grid',
        images: []
    },
    render: ({ titleEN, titleZH, images, layout }) =>
        <ImageGalleryBlock titleEN={titleEN} titleZH={titleZH} images={images} layout={layout}/>
}

export default ImageGalleryBlockConfig

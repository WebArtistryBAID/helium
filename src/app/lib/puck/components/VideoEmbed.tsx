import { ComponentConfig } from '@measured/puck'

function VideoEmbed({ titleEN, titleZH, url, captionEN, captionZH }: {
    titleEN: string
    titleZH: string
    url: string
    captionEN: string
    captionZH: string
}) {
    // Convert YouTube watch URLs to embed URLs
    let embedUrl = url
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) {
        embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
    }

    if (!url) {
        return (
            <div className="my-8 bg-gray-100 rounded-xl p-8 text-center text-gray-500">
                <p>请在编辑器中填写视频链接</p>
            </div>
        )
    }

    return (
        <div className="my-8">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-700" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-3">{titleZH}</p>
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                    className="w-full h-full"
                    src={embedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={titleEN}
                />
            </div>
            {(captionEN || captionZH) && (
                <p className="text-gray-500 text-sm mt-2">{captionEN} {captionZH}</p>
            )}
        </div>
    )
}

const VideoEmbedConfig: ComponentConfig = {
    label: '视频',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        url: { label: '视频链接（YouTube/Vimeo）', type: 'text' },
        captionEN: { label: '说明（英文）', type: 'text' },
        captionZH: { label: '说明（中文）', type: 'text' }
    },
    defaultProps: {
        titleEN: 'Campus Video',
        titleZH: '校园视频',
        url: '',
        captionEN: 'Use this space for a campus tour, student story, event recap, or program introduction.',
        captionZH: '可用于校园参观、学生故事、活动回顾或项目介绍。'
    },
    render: ({ titleEN, titleZH, url, captionEN, captionZH }) =>
        <VideoEmbed titleEN={titleEN} titleZH={titleZH} url={url} captionEN={captionEN} captionZH={captionZH}/>
}

export default VideoEmbedConfig

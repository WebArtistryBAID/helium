import { ComponentConfig } from '@measured/puck'

function LocationCard({ titleEN, titleZH, venueEN, venueZH, addressEN, addressZH, mapUrl }: {
    titleEN: string
    titleZH: string
    venueEN: string
    venueZH: string
    addressEN: string
    addressZH: string
    mapUrl?: string
}) {
    return (
        <div className="bg-yellow-50 rounded-2xl p-6 my-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{titleEN}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">{titleZH}</p>
            <div className="space-y-3">
                {(venueEN || venueZH) && (
                    <div className="flex gap-2">
                        <span className="font-semibold text-gray-700 text-sm">地点 / Venue:</span>
                        <span className="text-gray-900 text-sm">{venueEN} {venueZH}</span>
                    </div>
                )}
                {(addressEN || addressZH) && (
                    <div className="flex gap-2">
                        <span className="font-semibold text-gray-700 text-sm">地址 / Address:</span>
                        <span className="text-gray-900 text-sm">{addressEN} {addressZH}</span>
                    </div>
                )}
                {mapUrl && (
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mt-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                        </svg>
                        在地图上查看 / View on map
                    </a>
                )}
            </div>
        </div>
    )
}

const LocationCardConfig: ComponentConfig = {
    label: '地点',
    fields: {
        titleEN: { label: '标题（英文）', type: 'text' },
        titleZH: { label: '标题（中文）', type: 'text' },
        venueEN: { label: '地点名称（英文）', type: 'text' },
        venueZH: { label: '地点名称（中文）', type: 'text' },
        addressEN: { label: '地址（英文）', type: 'text' },
        addressZH: { label: '地址（中文）', type: 'text' },
        mapUrl: { label: '地图链接（可选）', type: 'text' }
    },
    defaultProps: {
        titleEN: 'Campus Location',
        titleZH: '校园地点',
        venueEN: 'Beijing Academy International Division',
        venueZH: '北京中学国际部',
        addressEN: 'Please refer to official school notices for event-specific venues.',
        addressZH: '具体活动地点请以学校官方通知为准。',
        mapUrl: ''
    },
    render: ({ titleEN, titleZH, venueEN, venueZH, addressEN, addressZH, mapUrl }) =>
        <LocationCard titleEN={titleEN} titleZH={titleZH} venueEN={venueEN} venueZH={venueZH}
                      addressEN={addressEN} addressZH={addressZH} mapUrl={mapUrl}/>
}

export default LocationCardConfig

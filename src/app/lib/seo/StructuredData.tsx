import { buildStructuredData, serializeStructuredData } from './structured-data'

export default function StructuredData(props: Parameters<typeof buildStructuredData>[0]) {
    const data = buildStructuredData(props)
    return data ? <script type="application/ld+json"
                          dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}/> : null
}

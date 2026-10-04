import { ComponentConfig } from '@puckeditor/core'

function Spacer({ height }: { height: string }) {
    return <div style={{ height }}/>
}

const SpacerConfig: ComponentConfig = {
    label: '空白',
    fields: {
        height: {
            label: '高度',
            type: 'text'
        }
    },
    defaultProps: {
        height: '64px'
    },
    render: ({ height }) => <Spacer height={height}/>
}

export default SpacerConfig

import type { NextConfig } from 'next'
import withFlowbiteReact from 'flowbite-react/plugin/nextjs'

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: [
                'isba.beijingacademy.com.cn',
                'baid.beijingacademy.com.cn',
                '10.85.160.111',
                '10.85.160.111:8523'
            ]
        }
    }
}

export default withFlowbiteReact(nextConfig)

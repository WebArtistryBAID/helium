import type { NextConfig } from 'next'
import withFlowbiteReact from 'flowbite-react/plugin/nextjs'

const nextConfig: NextConfig = {
    poweredByHeader: false,
    // Include verification metadata in the initial HTML head for every user agent.
    htmlLimitedBots: /.*/,
    async rewrites() {
        // Next.js reserves these paths for static metadata files, so the logo-backed routes live elsewhere.
        return [
            { source: '/favicon.ico', destination: '/site-icon.ico' },
            { source: '/icon.png', destination: '/site-icon.png' }
        ]
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Content-Security-Policy', value: 'frame-ancestors \'self\'; base-uri \'self\'; object-src \'none\'' }
                ]
            }
        ]
    },
    experimental: {
        proxyClientMaxBodySize: '250mb',
        serverActions: {
            allowedOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS
                ? process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
                : [
                    'isba.beijingacademy.com.cn',
                    'baid.beijingacademy.com.cn',
                    '10.85.160.111',
                    '10.85.160.111:8523'
                ]
        }
    }
}

export default withFlowbiteReact(nextConfig)

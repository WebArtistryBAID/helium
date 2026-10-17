'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from 'flowbite-react'
import { createAnalyticsSession } from './actions'

export default function AnalyticsRedirect() {
    const started = useRef(false)
    const [ error, setError ] = useState<string | null>(null)

    async function openAnalytics() {
        setError(null)
        try {
            const result = await createAnalyticsSession()
            if ('error' in result) {
                setError(result.error ?? '无法登录统计服务。')
                return
            }
            localStorage.setItem('umami.auth', JSON.stringify(result.token))
            window.location.replace(result.destination)
        } catch {
            setError('无法打开统计数据，请确认浏览器允许本地存储后重试。')
        }
    }

    useEffect(() => {
        if (started.current) return
        started.current = true
        void openAnalytics()
    }, [])

    return <div className="p-16">
        <h1 className="text-2xl mb-3">统计数据</h1>
        {error ? <div role="alert">
            <p className="mb-4 text-red-600">{error}</p>
            <Button onClick={() => void openAnalytics()}>重试</Button>
        </div> : <p role="status">请稍等，正在加载统计数据...</p>}
    </div>
}

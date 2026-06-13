'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from 'flowbite-react'
import { HiCheckCircle, HiLink } from 'react-icons/hi2'
import { getFeishuAuthUrl } from '@/app/studio/settings/feishu-actions'

export default function FeishuSettings({ isLinked, result }: {
    isLinked: boolean
    result?: { success?: string; error?: string }
}) {
    const [ authUrl, setAuthUrl ] = useState('')
    const [ authError, setAuthError ] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        getFeishuAuthUrl()
            .then(setAuthUrl)
            .catch(error => {
                console.error('Failed to create Feishu authorization URL:', error)
                setAuthError(true)
            })
    }, [])

    useEffect(() => {
        if (result?.success || result?.error) {
            router.replace(pathname)
        }
    }, [ pathname, result, router ])

    const feedback = result?.success === 'linked'
        ? { success: true, message: '飞书账号绑定成功。' }
        : result?.error
            ? { success: false, message: '飞书账号绑定失败，请重试或检查应用配置。' }
            : authError
                ? { success: false, message: '飞书应用配置不完整。' }
                : null

    return <div className="p-16">
        <h1 className="text-2xl mb-8">飞书设置</h1>

        <div className="bg-gray-50 rounded-3xl p-8 space-y-6 max-w-2xl">
            <div>
                <p className="secondary mt-2">
                    绑定飞书账号后，你可以收到内容审核请求、审核进度和发布状态通知。
                </p>
            </div>

            {feedback ? (
                <p role={feedback.success ? 'status' : 'alert'}
                   className={feedback.success ? 'text-green-600' : 'text-red-600'}>
                    {feedback.message}
                </p>
            ) : null}

            <div>
                <p className="font-bold text-sm secondary mb-2">绑定状态</p>
                {isLinked ? (
                    <div className="flex items-center gap-3">
                        <HiCheckCircle className="text-green-600 text-2xl"/>
                        <div>
                            <p className="text-xl">已绑定</p>
                            <p className="text-sm secondary">当前账号已关联飞书通知。</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-xl mb-3">未绑定</p>
                        {authUrl ? (
                            <Button as="a" href={authUrl} pill color="blue">
                                <HiLink className="mr-2"/>
                                绑定飞书账号
                            </Button>
                        ) : (
                            <Button pill color="blue" disabled>
                                <HiLink className="mr-2"/>
                                正在准备绑定...
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
}

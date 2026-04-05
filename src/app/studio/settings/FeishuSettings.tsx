'use client'

import { useEffect, useState } from 'react'
import { Button, Card } from 'flowbite-react'
import { getFeishuAuthUrl } from '@/app/studio/settings/feishu-actions'
import { HiLink, HiCheckCircle } from 'react-icons/hi2'

export default function FeishuSettings({ user }: { user: any }) {
  const [ authUrl, setAuthUrl ] = useState('')
  const [ isLinked, setIsLinked ] = useState(!!user?.feishuOpenId)

  useEffect(() => {
    (async () => {
      setAuthUrl(await getFeishuAuthUrl())
    })()
  }, [])

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">飞书设置</h1>

      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">飞书账号绑定</h2>
        <p className="text-gray-600 mb-4">
          绑定你的飞书账号后，当有页面需要审核时会收到飞书通知。
        </p>

        {isLinked ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <HiCheckCircle className="text-green-600 text-2xl" />
            <div>
              <p className="font-semibold text-green-900">已绑定飞书账号</p>
              <p className="text-sm text-green-700">你将收到页面更新通知</p>
            </div>
          </div>
        ) : (
          <a href={authUrl}>
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <HiLink className="mr-2" />
              绑定飞书账号
            </Button>
          </a>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">通知设置</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-gray-700">页面更新通知</span>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-gray-700">审核请求通知</span>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>
        </div>
      </Card>
    </div>
  )
}

'use server'

import { getMyUser } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'
import { analyticsConfig, loginToAnalytics } from '@/app/lib/analytics-login'

export async function createAnalyticsSession() {
    const user = await getMyUser()
    if (!user?.roles.includes(Role.admin)) {
        return { error: '仅管理员可以访问统计数据。' }
    }
    try {
        return await loginToAnalytics(analyticsConfig(process.env))
    } catch (error) {
        const message = error instanceof Error ? error.message : ''
        const allowed = [
            'ANALYTICS_HOST must be a relative path such as /analytics.',
            'HOST must use HTTP or HTTPS.',
            'Please configure UMAMI_USERNAME and UMAMI_PASSWORD on the server.',
            'Umami 登录失败，请检查服务器上的账号配置。',
            'Umami 返回了无效的登录结果。',
            '此 Umami 账号启用了双重验证，请使用 Umami 登录页面完成验证。'
        ]
        return { error: allowed.includes(message) ? message : '无法连接统计服务，请检查服务器配置后重试。' }
    }
}

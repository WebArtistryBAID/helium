export function analyticsConfig(env: Record<string, string | undefined>) {
    const path = (env.ANALYTICS_HOST?.trim() || '/analytics').replace(/\/+$/, '')
    if (!path.startsWith('/') || path.startsWith('//') || /[\\?#\s]/.test(path)) {
        throw new Error('ANALYTICS_HOST must be a relative path such as /analytics.')
    }
    const origin = new URL(env.HOST || '')
    if (![ 'http:', 'https:' ].includes(origin.protocol)) throw new Error('HOST must use HTTP or HTTPS.')
    const destination = new URL(path, origin.origin)
    if (destination.origin !== origin.origin || destination.pathname !== path) {
        throw new Error('ANALYTICS_HOST must be a relative path such as /analytics.')
    }
    if (!env.UMAMI_USERNAME || !env.UMAMI_PASSWORD) {
        throw new Error('Please configure UMAMI_USERNAME and UMAMI_PASSWORD on the server.')
    }
    return {
        path,
        loginUrl: `${destination.href}/api/auth/login`,
        username: env.UMAMI_USERNAME,
        password: env.UMAMI_PASSWORD
    }
}

export async function loginToAnalytics(config: ReturnType<typeof analyticsConfig>, request = fetch) {
    const response = await request(config.loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: config.username, password: config.password }),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(15_000)
    })
    if (!response.ok) throw new Error('Umami 登录失败，请检查服务器上的账号配置。')
    const data: unknown = await response.json()
    if (!data || typeof data !== 'object') throw new Error('Umami 返回了无效的登录结果。')
    if ('requiresTwoFactor' in data && data.requiresTwoFactor) {
        throw new Error('此 Umami 账号启用了双重验证，请使用 Umami 登录页面完成验证。')
    }
    if (!('token' in data) || typeof data.token !== 'string' || !data.token) {
        throw new Error('Umami 返回了无效的登录结果。')
    }
    return { token: data.token, destination: config.path }
}

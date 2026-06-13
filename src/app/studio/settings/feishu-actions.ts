'use server'

import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'

const FEISHU_PASSPORT_API = 'https://passport.feishu.cn/suite/passport/oauth'

function getRedirectUri() {
    if (!process.env.HOST) {
        throw new Error('HOST not set')
    }
    return `${process.env.HOST}/studio/settings/feishu/callback`
}

export async function getFeishuAuthUrl() {
    await requireUser()
    const clientId = process.env.FEISHU_CLIENT_ID
    if (!clientId) {
        throw new Error('FEISHU_CLIENT_ID not set')
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getRedirectUri(),
        response_type: 'code'
    })
    return `${FEISHU_PASSPORT_API}/authorize?${params.toString()}`
}

export async function exchangeFeishuCode(code: string) {
    await requireUser()
    const clientId = process.env.FEISHU_CLIENT_ID
    const clientSecret = process.env.FEISHU_CLIENT_SECRET
    if (!clientId || !clientSecret) {
        throw new Error('FEISHU_CLIENT_ID / FEISHU_CLIENT_SECRET not set')
    }

    const response = await fetch(`${FEISHU_PASSPORT_API}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: getRedirectUri()
        }).toString()
    })
    const token = await response.json() as {
        access_token?: string
        user_access_token?: string
        msg?: string
        error?: string
    }
    const userAccessToken = token.access_token ?? token.user_access_token
    if (!response.ok || !userAccessToken) {
        throw new Error(token.error ?? token.msg ?? `Feishu token exchange failed: ${response.status}`)
    }

    const userResponse = await fetch(`${FEISHU_PASSPORT_API}/userinfo`, {
        headers: { Authorization: `Bearer ${userAccessToken}` }
    })
    const user = await userResponse.json() as {
        open_id?: string
        sub?: string
        msg?: string
        error?: string
    }
    const openId = user.open_id ?? user.sub
    if (!userResponse.ok || !openId) {
        throw new Error(user.error ?? user.msg ?? `Feishu user info failed: ${userResponse.status}`)
    }

    return openId
}

export async function linkFeishuAccount(userId: number, feishuOpenId: string) {
    const currentUser = await requireUser()
    if (currentUser.id !== userId && !currentUser.roles.includes(Role.admin)) {
        throw new Error('Unauthorized')
    }

    await prisma.user.update({
        where: { id: userId },
        data: { feishuOpenId }
    })
}

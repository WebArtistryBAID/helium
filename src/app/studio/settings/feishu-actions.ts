'use server'

import { requireUser, requireUserWithRole } from '@/app/login/login-actions'
import { prisma } from '@/app/lib/prisma'
import { EntityType, Role } from '@/generated/prisma/client'
import { sendApprovalNotification } from '@/app/lib/feishu-approval'

const FEISHU_API = 'https://open.feishu.cn/open-apis'
const FEISHU_PASSPORT_API = 'https://passport.feishu.cn/suite/passport/oauth'

export async function getFeishuAuthUrl(): Promise<string> {
  await requireUser()
  const clientId = process.env.FEISHU_CLIENT_ID
  const redirectUri = `${process.env.HOST}/studio/settings/feishu/callback`
  const params = new URLSearchParams({
    client_id: clientId ?? '',
    redirect_uri: redirectUri,
    response_type: 'code'
  })

  return `${FEISHU_PASSPORT_API}/authorize?${params.toString()}`
}

export async function exchangeFeishuCode(code: string): Promise<{ openId: string; userId: string }> {
  await requireUser()
  const redirectUri = `${process.env.HOST}/studio/settings/feishu/callback`
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.FEISHU_CLIENT_ID ?? '',
    client_secret: process.env.FEISHU_CLIENT_SECRET ?? '',
    code,
    redirect_uri: redirectUri
  })

  const res = await fetch(`${FEISHU_PASSPORT_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  const data = await res.json() as {
    access_token?: string
    user_access_token?: string
    msg?: string
    error?: string
  }

  if (!res.ok || (!data.access_token && !data.user_access_token)) {
    throw new Error(data.error ?? data.msg ?? `Feishu token exchange failed with status ${res.status}`)
  }

  const userInfoRes = await fetch(`${FEISHU_PASSPORT_API}/userinfo`, {
    headers: {
      'Authorization': `Bearer ${data.access_token ?? data.user_access_token}`
    }
  })
  const userInfo = await userInfoRes.json() as {
    open_id?: string
    user_id?: string
    sub?: string
    msg?: string
    error?: string
  }

  const openId = userInfo.open_id ?? userInfo.sub
  if (!userInfoRes.ok || !openId) {
    throw new Error(userInfo.error ?? userInfo.msg ?? `Feishu user info failed with status ${userInfoRes.status}`)
  }

  return {
    openId,
    userId: userInfo.user_id ?? ''
  }
}

export async function linkFeishuAccount(userId: number, feishuOpenId: string): Promise<void> {
  const currentUser = await requireUser()
  if (currentUser.id !== userId && !currentUser.roles.includes(Role.admin)) {
    throw new Error('Unauthorized')
  }
  await prisma.user.update({
    where: { id: userId },
    data: { feishuOpenId }
  })
}

export async function sendFeishuNotification(feishuOpenId: string, title: string, content: string): Promise<void> {
  const tenantToken = await getFeishuTenantToken()
  const res = await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=open_id`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenantToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      receive_id: feishuOpenId,
      msg_type: 'text',
      content: JSON.stringify({
        text: `${title}\n${content}`
      })
    })
  })

  if (!res.ok) {
    throw new Error(`Feishu send failed with status ${res.status}`)
  }

  const data = await res.json() as { code?: number; msg?: string }
  if (data.code && data.code !== 0) {
    throw new Error(data.msg ?? `Feishu send failed with code ${data.code}`)
  }
}

async function getFeishuTenantToken(): Promise<string> {
  const res = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.FEISHU_CLIENT_ID,
      app_secret: process.env.FEISHU_CLIENT_SECRET
    })
  })
  const data = await res.json()
  return data.tenant_access_token
}

function getStudioReviewUrls(entityType: EntityType, entityId: number) {
  const baseUrl = process.env.HOST || 'http://localhost:3000'

  if (entityType === EntityType.page) {
    return {
      previewUrl: `${baseUrl}/studio/pages/${entityId}/preview`,
      approvalUrl: `${baseUrl}/studio/pages/${entityId}/approval`
    }
  }

  return {
    previewUrl: `${baseUrl}/studio/editor/${entityId}#preview`,
    approvalUrl: `${baseUrl}/studio/editor/${entityId}#approval`
  }
}

export async function notifyEditorsOnUpdate(entityId: number, entityTitle: string): Promise<void> {
  const editors = await prisma.user.findMany({
    where: { roles: { has: 'editor' } }
  })

  for (const editor of editors) {
    if (editor.feishuOpenId) {
      await sendFeishuNotification(
        editor.feishuOpenId,
        '页面更新通知',
        `页面 "${entityTitle}" 有新的更新需要审核`
      )
    }
  }
}

export async function sendFeishuTestMessage(): Promise<{ ok: boolean; detail: string }> {
  const user = await requireUser()

  if (!process.env.FEISHU_CLIENT_ID || !process.env.FEISHU_CLIENT_SECRET) {
    return {
      ok: false,
      detail: '缺少 FEISHU_CLIENT_ID 或 FEISHU_CLIENT_SECRET'
    }
  }

  if (!user.feishuOpenId) {
    return {
      ok: false,
      detail: '当前账号还没有绑定飞书 open_id'
    }
  }

  const title = 'Helium 飞书测试消息'
  const content = [
    `你好，${user.name}`,
    '这是一条从 Helium 后台发送的测试消息。',
    `发送时间：${new Date().toLocaleString('zh-CN')}`,
    `站点地址：${process.env.HOST}`
  ].join('\n')

  try {
    await sendFeishuNotification(user.feishuOpenId, title, content)

    await prisma.feishuMessage.create({
      data: {
        type: 'test_message',
        recipient: user.name,
        recipientId: user.feishuOpenId,
        content: `${title}\n${content}`,
        status: 'sent',
        sentAt: new Date()
      }
    })

    return {
      ok: true,
      detail: '测试消息已发送，请去飞书里查看'
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : '发送失败'

    await prisma.feishuMessage.create({
      data: {
        type: 'test_message',
        recipient: user.name,
        recipientId: user.feishuOpenId,
        content: `${title}\n${content}`,
        status: 'failed',
        error: detail
      }
    })

    return {
      ok: false,
      detail
    }
  }
}

export async function sendFeishuApprovalCardTest(): Promise<{ ok: boolean; detail: string }> {
  const user = await requireUser()

  if (!user.feishuOpenId) {
    return {
      ok: false,
      detail: '当前账号还没有绑定飞书 open_id'
    }
  }

  const latestEntity = await prisma.contentEntity.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      type: true,
      titleDraftEN: true,
      titleDraftZH: true
    }
  })

  const entityType = latestEntity?.type ?? EntityType.post
  const entityId = latestEntity?.id ?? 0
  const title = latestEntity?.titleDraftZH ?? latestEntity?.titleDraftEN ?? '审核卡片测试'
  const { previewUrl, approvalUrl } = latestEntity
    ? getStudioReviewUrls(entityType, entityId)
    : {
        previewUrl: `${process.env.HOST}/studio/settings`,
        approvalUrl: `${process.env.HOST}/studio/settings/feishu`
      }

  const result = await sendApprovalNotification({
    entityId,
    entityType,
    title,
    previewUrl,
    approvalUrl,
    requestedBy: user.name
  }, [
    {
      id: user.id,
      name: user.name,
      feishuOpenId: user.feishuOpenId
    }
  ])

  return result.ok
    ? { ok: true, detail: '审核卡片测试已发送，请去飞书查看样式。' }
    : { ok: false, detail: '审核卡片测试发送失败，请检查飞书消息日志。' }
}

export async function getFeishuMessages() {
  await requireUserWithRole(Role.admin)

  return prisma.feishuMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  })
}

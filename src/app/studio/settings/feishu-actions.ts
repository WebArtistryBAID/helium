'use server'

import { prisma } from '@/app/lib/prisma'

const FEISHU_API = 'https://open.feishu.cn/open-apis'

export async function getFeishuAuthUrl(): Promise<string> {
  const clientId = process.env.FEISHU_CLIENT_ID
  const redirectUri = `${process.env.HOST}/studio/settings/feishu/callback`
  return `https://open.feishu.cn/open-apis/oauth2/v3/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=contact:user.id:readonly+im:message:create_personal_message`
}

export async function exchangeFeishuCode(code: string): Promise<{ openId: string; userId: string }> {
  const res = await fetch(`${FEISHU_API}/oauth2/v3/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.FEISHU_CLIENT_ID,
      client_secret: process.env.FEISHU_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.HOST}/studio/settings/feishu/callback`
    })
  })
  const data = await res.json()
  return { openId: data.data.open_id, userId: data.data.user_id }
}

export async function linkFeishuAccount(userId: number, feishuOpenId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { feishuOpenId }
  })
}

export async function sendFeishuNotification(feishuOpenId: string, title: string, content: string): Promise<void> {
  const tenantToken = await getFeishuTenantToken()
  await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=open_id`, {
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

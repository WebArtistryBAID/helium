import { redirect } from 'next/navigation'
import { exchangeFeishuCode, linkFeishuAccount } from '@/app/studio/settings/feishu-actions'
import { requireUser } from '@/app/login/login-actions'

export default async function FeishuCallback({ searchParams }: {
  searchParams: Promise<{ code?: string; state?: string }>
}) {
  const user = await requireUser()
  const { code } = await searchParams

  if (!code) {
    redirect('/studio/settings')
  }

  try {
    const { openId } = await exchangeFeishuCode(code)
    await linkFeishuAccount(user.id, openId)
  } catch (error) {
    console.error('Feishu linking failed:', error)
  }

  redirect('/studio/settings')
}

import { redirect } from 'next/navigation'
import { exchangeFeishuCode, linkFeishuAccount } from '@/app/studio/settings/feishu-actions'
import { requireUser } from '@/app/login/login-actions'

function isNextRedirect(error: unknown): error is { digest: string } {
  return typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
}

export default async function FeishuCallback({ searchParams }: {
  searchParams: Promise<{ code?: string; state?: string; error?: string }>
}) {
  const user = await requireUser()
  const params = await searchParams
  const { code, error } = params

  if (error) {
    console.error('Feishu OAuth error:', error)
    redirect('/studio/settings?error=feishu_auth_failed')
  }

  if (!code) {
    redirect('/studio/settings?error=no_code')
  }

  try {
    const { openId } = await exchangeFeishuCode(code)
    await linkFeishuAccount(user.id, openId)
    redirect('/studio/settings?success=linked')
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error
    }
    console.error('Feishu linking failed:', error)
    redirect('/studio/settings?error=linking_failed')
  }
}

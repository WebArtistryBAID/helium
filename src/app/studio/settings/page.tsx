import { requireUser } from '@/app/login/login-actions'
import FeishuSettings from '@/app/studio/settings/FeishuSettings'

export default async function SettingsPage() {
  const user = await requireUser()

  return <FeishuSettings user={user} />
}

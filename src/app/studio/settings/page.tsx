import { requireUser } from '@/app/login/login-actions'
import FeishuSettings from '@/app/studio/settings/FeishuSettings'

export default async function SettingsPage({ searchParams }: {
    searchParams: Promise<{ success?: string; error?: string }>
}) {
    const user = await requireUser()
    const result = await searchParams

    return <FeishuSettings isLinked={user.feishuOpenId != null} result={result}/>
}

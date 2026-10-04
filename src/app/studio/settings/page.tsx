import { getStudioActor } from '@/app/lib/services/studio-actor'
import { requireActorUser } from '@/app/lib/services/actor'
import { listPersonalTokens } from '@/app/lib/services/personal-tokens'
import PersonalSettings from '@/app/studio/settings/PersonalSettings'

export const dynamic = 'force-dynamic'

export default async function PersonalSettingsPage({ searchParams }: {
    searchParams: Promise<{ success?: string; error?: string }>
}) {
    const actor = await getStudioActor()
    const [ user, tokens, result ] = await Promise.all([
        requireActorUser(actor), listPersonalTokens(actor), searchParams
    ])
    const endpoint = process.env.HOST ? `${process.env.HOST.replace(/\/+$/, '')}/mcp` : '/mcp'
    return <PersonalSettings isFeishuLinked={user.feishuOpenId != null}
                             tokens={tokens} result={result} endpoint={endpoint}/>
}

import { ReactNode } from 'react'
import { Role } from '@/generated/prisma/client'
import { getLoginTarget, getMyUser } from '@/app/login/login-actions'
import { redirect } from 'next/navigation'
import PermissionDenied from '@/app/PermissionDenied'
import StudioShell from '@/app/studio/StudioShell'

export default async function StudioLayout({ children }: { children: ReactNode }) {
    const user = await getMyUser()
    if (!user) redirect(await getLoginTarget('/studio'))
    if (!user?.roles.includes(Role.writer)) {
        return <PermissionDenied/>
    }
    return <StudioShell myUser={user}>{children}</StudioShell>
}

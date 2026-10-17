import { getMyUser } from '@/app/login/login-actions'
import { Role } from '@/generated/prisma/client'
import PermissionDenied from '@/app/PermissionDenied'
import AnalyticsRedirect from './AnalyticsRedirect'

export default async function AnalyticsPage() {
    const user = await getMyUser()
    if (!user?.roles.includes(Role.admin)) return <PermissionDenied/>
    return <AnalyticsRedirect/>
}

import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/app/login/login'
import { getLoginTarget } from '@/app/login/login-actions'
import PermissionDenied from '@/app/PermissionDenied'

export default async function PermissionDeniedPage() {
    if (!await isLoggedIn()) redirect(await getLoginTarget('/studio'))
    return <PermissionDenied/>
}

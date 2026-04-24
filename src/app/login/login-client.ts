import { Gender, Role, User, UserType } from '@/generated/prisma/browser'
import { useCookies } from 'react-cookie'
import { decodeJwt } from 'jose'

export function useCachedUser(): User | null {
    // The API checks for valid JWT tokens, so we can safely use the token information for frontend
    const [ cookies ] = useCookies()
    if (!cookies.access_token) {
        return null
    }
    const data = decodeJwt(cookies.access_token)
    return {
        id: data.id as number,
        name: data.name as string,
        phone: data.phone as string,
        pinyin: data.pinyin as string,
        roles: data.roles as Role[],
        type: data.userType as UserType,
        gender: data.gender as Gender,
        feishuOpenId: (data.feishuOpenId as string | null | undefined) ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
    }
}

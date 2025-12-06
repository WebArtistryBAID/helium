'use client'

import { Role, User } from '@/generated/prisma/browser'
import { GENDER_TRANSLATIONS, ROLES_TRANSLATIONS, USER_TYPE_TRANSLATIONS } from '@/app/lib/common-translations'
import { useEffect, useState } from 'react'
import { Checkbox, Label } from 'flowbite-react'
import { updateUserRoles } from '@/app/login/login-actions'

export default function UserContent({ user }: { user: User }) {
    const [ roles, setRoles ] = useState(user.roles)

    useEffect(() => {
        if (roles.length !== user.roles.length || roles.some(r => !user.roles.includes(r))) {
            (async () => {
                await updateUserRoles(user.id, roles)
            })()
        }
    }, [ roles, user.id, user.roles ])

    return <div className="p-16">
        <h1 className="text-2xl mb-8">{user.name}</h1>
        <div className="bg-gray-50 rounded-3xl p-8 space-y-3 max-w-2xl">
            <div>
                <p className="font-bold text-sm secondary">拼音</p>
                <p className="text-xl">{user.pinyin}</p>
            </div>

            <div>
                <p className="font-bold text-sm secondary">手机号码</p>
                <p className="text-xl">{user.phone ?? '无'}</p>
            </div>

            <div>
                <p className="font-bold text-sm secondary">性别</p>
                <p className="text-xl">{GENDER_TRANSLATIONS[user.gender]}</p>
            </div>

            <div>
                <p className="font-bold text-sm secondary">用户类型</p>
                <p className="text-xl">{USER_TYPE_TRANSLATIONS[user.type]}</p>
            </div>

            <div>
                <p className="font-bold text-sm secondary">首次登录时间</p>
                <p className="text-xl">{user.createdAt.toLocaleString()}</p>
            </div>

            <div>
                <p className="font-bold text-sm secondary">用户组</p>
                <div className="flex items-center gap-2">
                    <Checkbox id="writer" checked={roles.includes(Role.writer)} onChange={e => {
                        if (e.currentTarget.checked) {
                            setRoles(r => ([ ...r, Role.writer ]))
                        } else {
                            setRoles(r => r.filter(role => role !== Role.writer))
                        }
                    }}/>
                    <Label htmlFor="writer">
                        {ROLES_TRANSLATIONS.writer}
                    </Label>
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox id="editor" checked={roles.includes(Role.editor)} onChange={e => {
                        if (e.currentTarget.checked) {
                            setRoles(r => ([ ...r, Role.editor ]))
                        } else {
                            setRoles(r => r.filter(role => role !== Role.editor))
                        }
                    }}/>
                    <Label htmlFor="editor">
                        {ROLES_TRANSLATIONS.editor}
                    </Label>
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox id="admin" checked={roles.includes(Role.admin)} onChange={e => {
                        if (e.currentTarget.checked) {
                            setRoles(r => ([ ...r, Role.admin ]))
                        } else {
                            setRoles(r => r.filter(role => role !== Role.admin))
                        }
                    }}/>
                    <Label htmlFor="admin">
                        {ROLES_TRANSLATIONS.admin}
                    </Label>
                </div>
            </div>
        </div>
    </div>
}

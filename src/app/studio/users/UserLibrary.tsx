'use client'

import { Paginated } from '@/app/lib/data-types'
import { useEffect, useState } from 'react'
import { Badge, Button, Pagination, Select, TextInput } from 'flowbite-react'
import Link from 'next/link'
import { Gender, Role, User, UserType } from '@/generated/prisma/browser'
import { getUsers, type UserFilters } from '@/app/login/login-actions'
import { GENDER_TRANSLATIONS, ROLES_TRANSLATIONS, USER_TYPE_TRANSLATIONS } from '@/app/lib/common-translations'
import If from '@/app/lib/If'

const roleOptions = Object.values(Role)
const userTypeOptions = Object.values(UserType)
const genderOptions = Object.values(Gender)

function formatDate(date: Date) {
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
}

function roleBadgeColor(role: Role) {
    return {
        admin: 'failure',
        editor: 'info',
        writer: 'success'
    }[role]
}

export default function UserLibrary({ init }: { init: Paginated<User> }) {
    const [ page, setPage ] = useState<Paginated<User>>(init)
    const [ currentPage, setCurrentPage ] = useState(0)
    const [ search, setSearch ] = useState('')
    const [ debouncedSearch, setDebouncedSearch ] = useState('')
    const [ filters, setFilters ] = useState<UserFilters>({
        role: 'all',
        type: 'all',
        gender: 'all',
        feishu: 'all'
    })

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(t)
    }, [ search ])

    useEffect(() => {
        (async () => {
            const res = await getUsers(currentPage, {
                ...filters,
                keyword: debouncedSearch || undefined
            })
            setPage(res)
        })()
    }, [ currentPage, debouncedSearch, filters ])

    function updateFilter<K extends keyof UserFilters>(key: K, value: UserFilters[K]) {
        setFilters(current => ({
            ...current,
            [key]: value
        }))
        setCurrentPage(0)
    }

    function resetFilters() {
        setSearch('')
        setDebouncedSearch('')
        setFilters({
            role: 'all',
            type: 'all',
            gender: 'all',
            feishu: 'all'
        })
        setCurrentPage(0)
    }

    return <div className="p-8">
        <form role="search" aria-label="用户筛选" className="mb-6" onSubmit={e => e.preventDefault()}>
            <div className="grid grid-cols-5 gap-3 items-end">
                <div className="col-span-2">
                    <label htmlFor="user-search" className="mb-2 block text-sm font-medium text-gray-700">
                        搜索
                    </label>
                    <TextInput
                        id="user-search"
                        type="search"
                        placeholder="姓名、拼音、手机号或用户 ID"
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value)
                            setCurrentPage(0)
                        }}
                    />
                </div>
                <div>
                    <label htmlFor="role-filter" className="mb-2 block text-sm font-medium text-gray-700">
                        角色
                    </label>
                    <Select id="role-filter"
                            value={filters.role ?? 'all'}
                            onChange={e => updateFilter('role', e.target.value as UserFilters['role'])}>
                        <option value="all">全部角色</option>
                        {roleOptions.map(role =>
                            <option value={role} key={role}>{ROLES_TRANSLATIONS[role]}</option>
                        )}
                    </Select>
                </div>
                <div>
                    <label htmlFor="type-filter" className="mb-2 block text-sm font-medium text-gray-700">
                        类型
                    </label>
                    <Select id="type-filter"
                            value={filters.type ?? 'all'}
                            onChange={e => updateFilter('type', e.target.value as UserFilters['type'])}>
                        <option value="all">全部类型</option>
                        {userTypeOptions.map(type =>
                            <option value={type} key={type}>{USER_TYPE_TRANSLATIONS[type]}</option>
                        )}
                    </Select>
                </div>
                <div>
                    <label htmlFor="gender-filter" className="mb-2 block text-sm font-medium text-gray-700">
                        性别
                    </label>
                    <Select id="gender-filter"
                            value={filters.gender ?? 'all'}
                            onChange={e => updateFilter('gender', e.target.value as UserFilters['gender'])}>
                        <option value="all">全部性别</option>
                        {genderOptions.map(gender =>
                            <option value={gender} key={gender}>{GENDER_TRANSLATIONS[gender]}</option>
                        )}
                    </Select>
                </div>
            </div>
            <div className="mt-3 flex items-end gap-3">
                <Button color="alternative" onClick={resetFilters}>
                    清除筛选
                </Button>
                <p className="pb-2 text-sm text-gray-500" aria-live="polite">
                    当前页 {page.items.length} 位用户，共 {page.pages} 页
                </p>
            </div>
        </form>
        <If condition={page.pages < 1}>
            <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
                <p className="font-bold text-gray-900">没有找到用户</p>
                <p className="mt-1 text-sm text-gray-500">调整搜索词或筛选条件后再试。</p>
            </div>
        </If>
        <If condition={page.pages > 0}>
            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full table-fixed divide-y divide-gray-200 text-left text-sm">
                    <caption className="sr-only">用户列表筛选结果</caption>
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                        <th scope="col" className="w-20 px-4 py-3">ID</th>
                        <th scope="col" className="px-4 py-3">用户</th>
                        <th scope="col" className="w-44 px-4 py-3">角色</th>
                        <th scope="col" className="w-32 px-4 py-3">类型</th>
                        <th scope="col" className="w-28 px-4 py-3">性别</th>
                        <th scope="col" className="w-44 px-4 py-3">手机号</th>
                        <th scope="col" className="w-32 px-4 py-3">飞书</th>
                        <th scope="col" className="w-32 px-4 py-3">加入日期</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                    {page.items.map(user => <tr key={user.id}
                                                className="transition-colors duration-100 hover:bg-gray-50">
                        <td className="px-4 py-4 font-mono text-xs text-gray-500">{user.id}</td>
                        <th scope="row" className="px-4 py-4">
                            <Link href={`/studio/users/${user.id}`}
                                  className="block rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <span className="block truncate font-bold text-gray-900">{user.name}</span>
                                <span className="block truncate text-xs text-gray-500">{user.pinyin}</span>
                            </Link>
                        </th>
                        <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                                <If condition={user.roles.length < 1}>
                                    <span className="text-gray-500">无角色</span>
                                </If>
                                <If condition={user.roles.length > 0}>
                                    {user.roles.map(role =>
                                        <Badge color={roleBadgeColor(role)} key={role}>
                                            {ROLES_TRANSLATIONS[role]}
                                        </Badge>
                                    )}
                                </If>
                            </div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">{USER_TYPE_TRANSLATIONS[user.type]}</td>
                        <td className="px-4 py-4 text-gray-700">{GENDER_TRANSLATIONS[user.gender]}</td>
                        <td className="px-4 py-4 text-gray-700">{user.phone ?? '未填写'}</td>
                        <td className="px-4 py-4">
                            <Badge color={user.feishuOpenId ? 'success' : 'gray'}>
                                {user.feishuOpenId ? '已绑定' : '未绑定'}
                            </Badge>
                        </td>
                        <td className="px-4 py-4 text-gray-500">{formatDate(user.createdAt)}</td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage + 1} onPageChange={p => setCurrentPage(p - 1)}
                        totalPages={page.pages}/>
        </If>
    </div>
}

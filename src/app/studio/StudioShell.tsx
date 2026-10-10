'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Role, User } from '@/generated/prisma/browser'
import {
    Badge,
    Sidebar,
    SidebarCollapse,
    SidebarItem,
    SidebarItemGroup,
    SidebarItems,
    SidebarLogo,
    Tooltip
} from 'flowbite-react'
import Link from 'next/link'
import { HiUser } from 'react-icons/hi'
import { ROLES_TRANSLATIONS } from '@/app/lib/common-translations'
import {
    HiBookmarkSquare,
    HiArchiveBox,
    HiChartPie,
    HiNewspaper,
    HiPencil,
    HiPhoto,
    HiPresentationChartBar,
    HiPuzzlePiece,
    HiShare,
    HiStar,
    HiUsers,
    HiCog,
    HiGlobeAlt,
    HiChevronDoubleLeft,
    HiChevronDoubleRight
} from 'react-icons/hi2'
import If from '@/app/lib/If'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/login-actions'

export default function StudioShell({ children, myUser }: { children: ReactNode; myUser: User }) {
    const pathName = usePathname()
    const [isSidebarVisible, setIsSidebarVisible] = useState(true)
    const canShowSidebar = !pathName.includes('preview') && !(pathName.includes('pages') && pathName.includes('editor'))

    useEffect(() => {
        setIsSidebarVisible(localStorage.getItem('helium-studio-sidebar-visible') !== 'false')
    }, [])

    function toggleSidebar() {
        setIsSidebarVisible(currentValue => {
            const nextValue = !currentValue
            localStorage.setItem('helium-studio-sidebar-visible', String(nextValue))
            return nextValue
        })
    }

    return <>
        <a className="sr-only" href="#main-content">跳至主内容</a>
        <div
            role="status"
            className="sm:hidden absolute w-screen h-screen z-50 top-0 left-0 bg-white p-5 flex justify-center items-center flex-col">
            <p className="text-center">请在大屏幕设备上使用 Helium Studio。</p>
        </div>

        <div className="h-screen flex">
            <If condition={canShowSidebar && isSidebarVisible}>
                <div className="h-screen relative">
                    <Sidebar className="h-full relative">
                        <div className="relative">
                            <SidebarLogo href="/" img="/assets/helium-lockup-light.svg"><span
                                className="sr-only">Helium</span></SidebarLogo>
                            <button
                                type="button"
                                onClick={toggleSidebar}
                                aria-label="隐藏侧边栏"
                                title="隐藏侧边栏"
                                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-gray-500 transition-colors duration-100 hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <HiChevronDoubleLeft className="size-5" aria-hidden="true"/>
                            </button>
                        </div>
                        <SidebarItems>
                            <SidebarItemGroup>
                                <Link href="/studio">
                                    <SidebarItem as="div" icon={HiChartPie}>
                                        主页
                                    </SidebarItem>
                                </Link>
                                <Link href="/studio/metadata">
                                    <SidebarItem as="div" icon={HiGlobeAlt}>
                                        网站信息
                                    </SidebarItem>
                                </Link>
                                <Link href="/studio/media">
                                    <SidebarItem as="div" icon={HiPhoto}>
                                        媒体库
                                    </SidebarItem>
                                </Link>
                                <Link href="/studio/pages">
                                    <SidebarItem as="div" icon={HiBookmarkSquare}>
                                        页面
                                    </SidebarItem>
                                </Link>
                                <SidebarCollapse label="内容" icon={HiShare}>
                                    <Link href="/studio/posts">
                                        <SidebarItem as="div" icon={HiNewspaper}>
                                            文章
                                        </SidebarItem>
                                    </Link>

                                    <Link href="/studio/clubs">
                                        <SidebarItem as="div" icon={HiPuzzlePiece}>
                                            社团
                                        </SidebarItem>
                                    </Link>

                                    <Link href="/studio/activities">
                                        <SidebarItem as="div" icon={HiStar}>
                                            校园活动
                                        </SidebarItem>
                                    </Link>

                                    <Link href="/studio/projects">
                                        <SidebarItem as="div" icon={HiPresentationChartBar}>
                                            自主项目
                                        </SidebarItem>
                                    </Link>

                                    <Link href="/studio/courses">
                                        <SidebarItem as="div" icon={HiPencil}>
                                            课程介绍
                                        </SidebarItem>
                                    </Link>

                                    <Link href="/studio/faculties">
                                        <SidebarItem as="div" icon={HiUser}>
                                            教职工介绍
                                        </SidebarItem>
                                    </Link>
                                </SidebarCollapse>
                                <If condition={myUser?.roles.includes(Role.admin)}>
                                    <Link href="/studio/users">
                                        <SidebarItem as="div" icon={HiUsers}>
                                            用户管理
                                        </SidebarItem>
                                    </Link>
                                    <Link href="/studio/backups">
                                        <SidebarItem as="div" icon={HiArchiveBox}>
                                            备份管理
                                        </SidebarItem>
                                    </Link>
                                </If>
                                <Link href="/studio/settings">
                                    <SidebarItem as="div" icon={HiCog}>
                                        设置
                                    </SidebarItem>
                                </Link>
                            </SidebarItemGroup>
                        </SidebarItems>
                        <div className="mr-3 mb-3 absolute bottom-0">
                            <form action={logout}>
                                <Tooltip content="退出登录" placement="top">
                                    <button type="submit" aria-label="退出登录"
                                            className="flex cursor-pointer items-center gap-3 rounded-full p-3 text-left hover:bg-gray-100 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                        <Badge icon={HiUser}/>
                                        <div>
                                            <p className="font-bold font-display text-sm">{myUser?.name ?? '...'}</p>
                                            <p className="secondary text-xs">{myUser?.roles.map(s => ROLES_TRANSLATIONS[s]).join(' / ')}</p>
                                        </div>
                                    </button>
                                </Tooltip>
                            </form>
                        </div>
                    </Sidebar>
                </div>
            </If>
            <If condition={canShowSidebar && !isSidebarVisible}>
                <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label="显示侧边栏"
                    title="显示侧边栏"
                    className="fixed left-4 top-4 z-40 rounded-full bg-gray-100 p-2.5 text-gray-600 transition-colors duration-100 hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <HiChevronDoubleRight className="size-5" aria-hidden="true"/>
                </button>
            </If>
            <main id="main-content" tabIndex={-1}
                  className="flex-grow h-screen max-h-screen overflow-y-auto" style={{ overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    </>
}

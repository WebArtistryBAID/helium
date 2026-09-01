'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Badge,
    Button,
    Checkbox,
    Label,
    TabItem,
    Tabs,
    TabsRef,
    Textarea,
    TextInput
} from 'flowbite-react'
import {
    HiArrowDown,
    HiArrowUp,
    HiCheckCircle,
    HiLanguage,
    HiLink,
    HiPlus,
    HiTrash
} from 'react-icons/hi2'
import { HiCloudUpload } from 'react-icons/hi'
import { EntityType, Role, User } from '@/generated/prisma/browser'
import { isAligned } from '@/app/lib/data-types'
import { useSavableEntity } from '@/app/lib/save/useSavableEntity'
import { useSaveShortcut } from '@/app/lib/save/useSaveShortcuts'
import { useEntityLock } from '@/app/lib/lock/useEntityLock'
import LockBrokenPrompt from '@/app/lib/lock/LockBrokenPrompt'
import ApprovalProcess from '@/app/lib/approval/ApprovalProcess'
import { alignContentEntity } from '@/app/studio/editor/entity-actions'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'
import {
    WebsiteFooterContent,
    WebsiteLink,
    WebsiteMetadataContent,
    WebsiteMetadataDraft,
    WebsiteMetadataEditorState,
    WebsitePageOption
} from '@/app/lib/website-metadata-types'
import {
    getWebsiteMetadataEditorState,
    saveWebsiteMetadata
} from '@/app/studio/settings/website-metadata/website-metadata-actions'

const AUTO_SAVE_INTERVAL_MS = 30_000

type Language = keyof WebsiteMetadataDraft
type LinkField = keyof Pick<WebsiteLink, 'name' | 'url'>
type FooterTextField = keyof Omit<WebsiteFooterContent, 'items'>

function newItemId(prefix: string) {
    return `${prefix}-${crypto.randomUUID()}`
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
    const target = index + direction
    if (target < 0 || target >= items.length) return items
    const next = [ ...items ]
    ;[ next[index], next[target] ] = [ next[target], next[index] ]
    return next
}

function LinkAutocomplete({ id, value, disabled, language, pageOptions, onChange }: {
    id: string
    value: string
    disabled: boolean
    language: Language
    pageOptions: WebsitePageOption[]
    onChange: (value: string) => void
}) {
    const [ open, setOpen ] = useState(false)
    const [ query, setQuery ] = useState('')
    const [ activeIndex, setActiveIndex ] = useState(-1)
    const listboxId = `${id}-pages`
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const filteredPages = normalizedQuery
        ? pageOptions.filter(page => [ page.titleEN, page.titleZH, page.url ]
            .some(text => text.toLocaleLowerCase().includes(normalizedQuery)))
        : pageOptions

    function openPages() {
        setQuery('')
        setOpen(true)
        setActiveIndex(pageOptions.length > 0 ? 0 : -1)
    }

    function selectPage(page: WebsitePageOption) {
        onChange(page.url)
        setOpen(false)
        setQuery('')
        setActiveIndex(-1)
    }

    return <div className="relative"
                onBlur={event => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setOpen(false)
                        setActiveIndex(-1)
                    }
                }}>
        <TextInput id={id} value={value} disabled={disabled} icon={HiLink} required
                   role="combobox"
                   aria-autocomplete="list"
                   aria-expanded={open}
                   aria-controls={listboxId}
                   aria-activedescendant={open && activeIndex >= 0
                       ? `${listboxId}-${filteredPages[activeIndex]?.id}`
                       : undefined}
                   autoComplete="off"
                   onFocus={openPages}
                   onChange={event => {
                       const nextValue = event.currentTarget.value
                       const nextQuery = nextValue.trim().toLocaleLowerCase()
                       const hasMatchingPage = pageOptions.some(page => [ page.titleEN, page.titleZH, page.url ]
                           .some(text => text.toLocaleLowerCase().includes(nextQuery)))
                       onChange(nextValue)
                       setQuery(nextValue)
                       setOpen(true)
                       setActiveIndex(hasMatchingPage ? 0 : -1)
                   }}
                   onKeyDown={event => {
                       if (event.key === 'ArrowDown') {
                           event.preventDefault()
                           if (!open) {
                               openPages()
                               return
                           }
                           setActiveIndex(current => Math.min(current + 1, filteredPages.length - 1))
                       } else if (event.key === 'ArrowUp') {
                           event.preventDefault()
                           setActiveIndex(current => Math.max(current - 1, 0))
                       } else if (event.key === 'Enter' && open && activeIndex >= 0) {
                           const page = filteredPages[activeIndex]
                           if (page) {
                               event.preventDefault()
                               selectPage(page)
                           }
                       } else if (event.key === 'Escape') {
                           setOpen(false)
                           setActiveIndex(-1)
                       }
                   }}/>

        {open ? <div id={listboxId} role="listbox" aria-label="可选择的网站页面"
                     className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1">
            {filteredPages.map((page, index) => <button
                id={`${listboxId}-${page.id}`}
                key={page.id}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={activeIndex === index}
                className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left ${activeIndex === index ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-50'}`}
                onMouseDown={event => event.preventDefault()}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => selectPage(page)}>
                <span className="block font-medium">
                    {language === 'zh' ? page.titleZH : page.titleEN}
                </span>
                <span className="block text-xs text-gray-500">
                    {language === 'zh' ? page.titleEN : page.titleZH}
                </span>
            </button>)}
            {filteredPages.length === 0 ? <p className="px-3 py-2 text-sm text-gray-500">
                没有匹配的页面，可以继续输入外部链接。
            </p> : null}
        </div> : null}
    </div>
}

function LinkFields({ item, prefix, disabled, inputLang, language, pageOptions, onChange }: {
    item: WebsiteLink
    prefix: string
    disabled: boolean
    inputLang: string
    language: Language
    pageOptions: WebsitePageOption[]
    onChange: (field: LinkField, value: string) => void
}) {
    return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
            <div className="mb-2 block">
                <Label htmlFor={`${prefix}-name`}>名称</Label>
            </div>
            <TextInput id={`${prefix}-name`} value={item.name} disabled={disabled} lang={inputLang} required
                       onChange={event => onChange('name', event.currentTarget.value)}/>
        </div>
        <div>
            <div className="mb-2 block">
                <Label htmlFor={`${prefix}-url`}>链接</Label>
            </div>
            <LinkAutocomplete id={`${prefix}-url`} value={item.url} disabled={disabled}
                              language={language} pageOptions={pageOptions}
                              onChange={value => onChange('url', value)}/>
        </div>
    </div>
}

export default function WebsiteMetadataEditor({ init, user, lockToken, pageOptions }: {
    init: WebsiteMetadataEditorState
    user: User
    lockToken: string
    pageOptions: WebsitePageOption[]
}) {
    const [ language, setLanguage ] = useState<Language>('zh')
    const [ showLockBroken, setShowLockBroken ] = useState(false)
    const tabsRef = useRef<TabsRef>(null)
    const pendingFocusRef = useRef<string | null>(null)
    const canWrite = user.roles.includes(Role.writer)
    const {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    const {
        draft,
        setDraft,
        hasChanges,
        loading,
        save,
        refresh
    } = useSavableEntity({
        initial: init,
        saveFn: async current => saveWebsiteMetadata(current.entity.id, {
            en: current.en,
            zh: current.zh
        }),
        refreshFn: getWebsiteMetadataEditorState,
        compareKeys: [ 'en', 'zh' ]
    })

    const guardedSave = useCallback(async () => {
        if (!canWrite) {
            showPermissionDenied()
            return
        }
        try {
            await save()
        } catch (error) {
            if (!handlePermissionError(error)) {
                console.error('Failed to save website metadata:', error)
            }
        }
    }, [ canWrite, handlePermissionError, save, showPermissionDenied ])

    useSaveShortcut(true, guardedSave)
    useEntityLock({
        entityType: EntityType.page,
        entityId: draft.entity.id,
        token: lockToken,
        hasChanges,
        onLockLost: () => setShowLockBroken(true)
    })

    useEffect(() => {
        if (location.hash === '#approval') {
            tabsRef.current?.setActiveTab(1)
        }
    }, [])

    useEffect(() => {
        if (!pendingFocusRef.current) return
        const inputId = pendingFocusRef.current
        pendingFocusRef.current = null
        requestAnimationFrame(() => document.getElementById(inputId)?.focus())
    })

    useEffect(() => {
        if (!canWrite || showLockBroken) return
        const interval = window.setInterval(() => {
            if (hasChanges && !loading) void guardedSave()
        }, AUTO_SAVE_INTERVAL_MS)
        return () => window.clearInterval(interval)
    }, [ canWrite, guardedSave, hasChanges, loading, showLockBroken ])

    const content = draft[language]
    const languageLabel = language === 'zh' ? '中文' : '英文'
    const inputLang = language === 'zh' ? 'zh-CN' : 'en'
    const published = isAligned(draft.entity)
    const statusLabel = hasChanges ? '有尚未保存的更改' : published ? '已发布' : '有更新未发布'

    function updateLanguageContent(update: (current: WebsiteMetadataContent) => WebsiteMetadataContent) {
        if (!canWrite) {
            showPermissionDenied()
            return
        }
        setDraft(current => ({ ...current, [language]: update(current[language]) }))
    }

    function updateNavbarItem(index: number, field: LinkField, value: string) {
        updateLanguageContent(current => ({
            ...current,
            navbar: current.navbar.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item)
        }))
    }

    function updateNavbarTransparency(index: number, transparentNavbar: boolean) {
        if (!canWrite) {
            showPermissionDenied()
            return
        }
        const update = (current: WebsiteMetadataContent) => ({
            ...current,
            navbar: current.navbar.map((item, itemIndex) =>
                itemIndex === index ? { ...item, transparentNavbar } : item)
        })
        setDraft(current => ({ ...current, en: update(current.en), zh: update(current.zh) }))
    }

    function addNavbarItem() {
        const id = newItemId('navbar')
        pendingFocusRef.current = `navbar-${language}-${id}-name`
        setDraft(current => ({
            ...current,
            en: {
                ...current.en,
                navbar: [ ...current.en.navbar, { id, name: '', url: '', transparentNavbar: false } ]
            },
            zh: {
                ...current.zh,
                navbar: [ ...current.zh.navbar, { id, name: '', url: '', transparentNavbar: false } ]
            }
        }))
    }

    function removeNavbarItem(index: number) {
        const nextItem = content.navbar[index + 1] ?? content.navbar[index - 1]
        pendingFocusRef.current = nextItem
            ? `navbar-${language}-${nextItem.id}-name`
            : 'add-navbar-item'
        setDraft(current => ({
            ...current,
            en: { ...current.en, navbar: current.en.navbar.filter((_, itemIndex) => itemIndex !== index) },
            zh: { ...current.zh, navbar: current.zh.navbar.filter((_, itemIndex) => itemIndex !== index) }
        }))
    }

    function moveNavbarItem(index: number, direction: -1 | 1) {
        setDraft(current => ({
            ...current,
            en: { ...current.en, navbar: moveItem(current.en.navbar, index, direction) },
            zh: { ...current.zh, navbar: moveItem(current.zh.navbar, index, direction) }
        }))
    }

    function updateFooterItem(index: number, field: LinkField, value: string) {
        updateLanguageContent(current => ({
            ...current,
            footer: {
                ...current.footer,
                items: current.footer.items.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, [field]: value } : item)
            }
        }))
    }

    function addFooterItem() {
        const id = newItemId('footer')
        pendingFocusRef.current = `footer-${language}-${id}-name`
        const item = { id, name: '', url: '', subItems: [] }
        setDraft(current => ({
            ...current,
            en: { ...current.en, footer: { ...current.en.footer, items: [ ...current.en.footer.items, item ] } },
            zh: { ...current.zh, footer: { ...current.zh.footer, items: [ ...current.zh.footer.items, item ] } }
        }))
    }

    function removeFooterItem(index: number) {
        const nextItem = content.footer.items[index + 1] ?? content.footer.items[index - 1]
        pendingFocusRef.current = nextItem
            ? `footer-${language}-${nextItem.id}-name`
            : 'add-footer-item'
        setDraft(current => ({
            ...current,
            en: {
                ...current.en,
                footer: { ...current.en.footer, items: current.en.footer.items.filter((_, i) => i !== index) }
            },
            zh: {
                ...current.zh,
                footer: { ...current.zh.footer, items: current.zh.footer.items.filter((_, i) => i !== index) }
            }
        }))
    }

    function moveFooterItem(index: number, direction: -1 | 1) {
        setDraft(current => ({
            ...current,
            en: {
                ...current.en,
                footer: { ...current.en.footer, items: moveItem(current.en.footer.items, index, direction) }
            },
            zh: {
                ...current.zh,
                footer: { ...current.zh.footer, items: moveItem(current.zh.footer.items, index, direction) }
            }
        }))
    }

    function updateFooterSubItem(itemIndex: number, subItemIndex: number, field: LinkField, value: string) {
        updateLanguageContent(current => ({
            ...current,
            footer: {
                ...current.footer,
                items: current.footer.items.map((item, index) => index === itemIndex ? {
                    ...item,
                    subItems: item.subItems.map((subItem, index) =>
                        index === subItemIndex ? { ...subItem, [field]: value } : subItem)
                } : item)
            }
        }))
    }

    function addFooterSubItem(parentId: string, itemIndex: number) {
        const id = newItemId('footer-subitem')
        pendingFocusRef.current = `footer-${language}-${parentId}-${id}-name`
        const add = (current: WebsiteMetadataContent) => ({
            ...current,
            footer: {
                ...current.footer,
                items: current.footer.items.map((item, index) => {
                    const parentExists = current.footer.items.some(candidate => candidate.id === parentId)
                    const isParent = parentExists ? item.id === parentId : index === itemIndex
                    return isParent
                        ? { ...item, subItems: [ ...item.subItems, { id, name: '', url: '' } ] }
                        : item
                })
            }
        })
        setDraft(current => ({ ...current, en: add(current.en), zh: add(current.zh) }))
    }

    function removeFooterSubItem(itemIndex: number, subItemIndex: number) {
        const parent = content.footer.items[itemIndex]
        const nextItem = parent?.subItems[subItemIndex + 1] ?? parent?.subItems[subItemIndex - 1]
        pendingFocusRef.current = nextItem
            ? `footer-${language}-${parent?.id}-${nextItem.id}-name`
            : `add-footer-subitem-${parent?.id}`
        const remove = (current: WebsiteMetadataContent) => ({
            ...current,
            footer: {
                ...current.footer,
                items: current.footer.items.map((item, index) => index === itemIndex
                    ? { ...item, subItems: item.subItems.filter((_, i) => i !== subItemIndex) }
                    : item)
            }
        })
        setDraft(current => ({ ...current, en: remove(current.en), zh: remove(current.zh) }))
    }

    function moveFooterSubItem(itemIndex: number, subItemIndex: number, direction: -1 | 1) {
        const move = (current: WebsiteMetadataContent) => ({
            ...current,
            footer: {
                ...current.footer,
                items: current.footer.items.map((item, index) => index === itemIndex
                    ? { ...item, subItems: moveItem(item.subItems, subItemIndex, direction) }
                    : item)
            }
        })
        setDraft(current => ({ ...current, en: move(current.en), zh: move(current.zh) }))
    }

    function updateFooterText(field: FooterTextField, value: string) {
        const shared = field === 'chineseWebsiteUrl' || field === 'icpNumber'
        if (shared) {
            setDraft(current => ({
                ...current,
                en: { ...current.en, footer: { ...current.en.footer, [field]: value } },
                zh: { ...current.zh, footer: { ...current.zh.footer, [field]: value } }
            }))
            return
        }
        updateLanguageContent(current => ({
            ...current,
            footer: { ...current.footer, [field]: value }
        }))
    }

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        <LockBrokenPrompt show={showLockBroken} returnUri="/studio"/>

        <div className="website-metadata-editor p-16">
            <div className="mx-auto max-w-[1400px] pb-12">
                <header className="mb-6 pb-6">
                    <div className="flex items-end justify-between gap-8">
                        <div>
                            <div className="mb-2 flex items-center gap-3">
                                <p className="text-sm font-medium text-blue-600">网站设置</p>
                                <div role="status" aria-live="polite">
                                    <Badge color={published && !hasChanges ? 'success' : hasChanges ? 'warning' : 'gray'}>
                                        {statusLabel}
                                    </Badge>
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">网站信息</h1>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                            <Button type="button" pill color="alternative"
                                    aria-label={language === 'zh' ? '切换到英文内容' : '切换到中文内容'}
                                    onClick={() => setLanguage(current => current === 'zh' ? 'en' : 'zh')}>
                                <HiLanguage aria-hidden="true" className="mr-2 h-4 w-4"/>
                                {language === 'zh' ? '中文 · 切换到英文' : '英文 · 切换到中文'}
                            </Button>
                            {canWrite ? <Button type="button" pill color="blue" disabled={loading || !hasChanges}
                                                onClick={guardedSave}>
                                <HiCheckCircle aria-hidden="true" className="mr-2 h-4 w-4"/>
                                {loading ? '正在保存...' : '保存更改'}
                            </Button> : null}
                        </div>
                    </div>
                </header>

                <Tabs aria-label="网站信息设置选项卡" variant="default" ref={tabsRef}>
                    <TabItem active title="网站信息" icon={HiLanguage}>
                        <div className="mt-5 space-y-6">
                            <div className="rounded-3xl bg-gray-50 p-8">
                                <div className="mb-6 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold">基本信息</h2>
                                        <p className="mt-1 text-sm text-gray-500">正在编辑{languageLabel}</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <div className="mb-2 block"><Label htmlFor={`website-title-${language}`}>标题</Label></div>
                                        <TextInput id={`website-title-${language}`} value={content.title}
                                                   disabled={!canWrite} lang={inputLang} required
                                                   onChange={event => {
                                                       const value = event.currentTarget.value
                                                       updateLanguageContent(current => ({
                                                           ...current,
                                                           title: value
                                                       }))
                                                   }}/>
                                    </div>
                                    <div>
                                        <div className="mb-2 block"><Label htmlFor={`website-description-${language}`}>说明</Label></div>
                                        <Textarea id={`website-description-${language}`} rows={4}
                                                  value={content.description} disabled={!canWrite} lang={inputLang} required
                                                  onChange={event => {
                                                      const value = event.currentTarget.value
                                                      updateLanguageContent(current => ({
                                                          ...current,
                                                          description: value
                                                      }))
                                                  }}/>
                                    </div>
                                </div>
                            </div>

                            <section className="rounded-3xl bg-gray-50 p-8">
                                <div className="mb-6 flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold">导航栏</h2>
                                    </div>
                                    {canWrite ? <Button id="add-navbar-item" type="button" pill color="blue" size="sm"
                                                        onClick={addNavbarItem}>
                                        <HiPlus aria-hidden="true" className="mr-2 h-4 w-4"/>添加链接
                                    </Button> : null}
                                </div>
                                <div className="space-y-4" role="list" aria-label={`${languageLabel}导航链接`}>
                                    {content.navbar.map((item, index) => <div key={item.id}
                                                                                 role="listitem"
                                                                                 className="rounded-2xl border border-gray-200 bg-white p-5">
                                        <div className="mb-4 flex items-center justify-between gap-4">
                                            <p className="font-semibold text-gray-900">导航链接 {index + 1}</p>
                                            {canWrite ? <div className="flex items-center gap-2" role="group"
                                                             aria-label={`导航链接 ${index + 1} 操作`}>
                                                <Button type="button" color="alternative" size="xs" disabled={index === 0}
                                                        aria-label={`上移导航链接 ${index + 1}`}
                                                        onClick={() => moveNavbarItem(index, -1)}>
                                                    <HiArrowUp aria-hidden="true" className="h-4 w-4"/>
                                                </Button>
                                                <Button type="button" color="alternative" size="xs"
                                                        disabled={index === content.navbar.length - 1}
                                                        aria-label={`下移导航链接 ${index + 1}`}
                                                        onClick={() => moveNavbarItem(index, 1)}>
                                                    <HiArrowDown aria-hidden="true" className="h-4 w-4"/>
                                                </Button>
                                                <Button type="button" color="red" outline size="xs"
                                                        aria-label={`删除导航链接 ${index + 1}`}
                                                        onClick={() => removeNavbarItem(index)}>
                                                    <HiTrash aria-hidden="true" className="h-4 w-4"/>
                                                </Button>
                                            </div> : null}
                                        </div>
                                        <LinkFields item={item} prefix={`navbar-${language}-${item.id}`}
                                                    disabled={!canWrite} inputLang={inputLang} language={language}
                                                    pageOptions={pageOptions}
                                                    onChange={(field, value) =>
                                            updateNavbarItem(index, field, value)}/>
                                        <div className="mt-4">
                                            <div className="flex items-center gap-2">
                                                <Checkbox id={`navbar-${language}-${item.id}-transparent`}
                                                          checked={item.transparentNavbar}
                                                          disabled={!canWrite}
                                                          aria-describedby={`navbar-${language}-${item.id}-transparent-description`}
                                                          onChange={event => updateNavbarTransparency(
                                                              index,
                                                              event.currentTarget.checked
                                                          )}/>
                                                <Label htmlFor={`navbar-${language}-${item.id}-transparent`}>
                                                    透明导航栏
                                                </Label>
                                            </div>
                                            <p id={`navbar-${language}-${item.id}-transparent-description`}
                                               className="mt-1 pl-6 text-sm text-gray-500">
                                                开启后，打开这个页面时，导航栏顶部透明，向下滚动后变为白色。
                                            </p>
                                        </div>
                                    </div>)}
                                </div>
                            </section>

                            <section className="rounded-3xl bg-gray-50 p-8">
                                <div className="mb-6 flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold">页脚导航</h2>
                                    </div>
                                    {canWrite ? <Button id="add-footer-item" type="button" pill color="blue" size="sm"
                                                        onClick={addFooterItem}>
                                        <HiPlus aria-hidden="true" className="mr-2 h-4 w-4"/>添加主项目
                                    </Button> : null}
                                </div>
                                <div className="space-y-4" role="list" aria-label={`${languageLabel}页脚项目`}>
                                    {content.footer.items.map((item, itemIndex) => <div key={item.id}
                                                                                          role="listitem"
                                                                                          className="rounded-2xl border border-gray-200 bg-white p-5">
                                        <div className="mb-4 flex items-center justify-between gap-4">
                                            <p className="font-semibold text-gray-900">页脚项目 {itemIndex + 1}</p>
                                            {canWrite ? <div className="flex items-center gap-2" role="group"
                                                             aria-label={`页脚项目 ${itemIndex + 1} 操作`}>
                                                <Button type="button" color="alternative" size="xs"
                                                        disabled={itemIndex === 0}
                                                        aria-label={`上移页脚项目 ${itemIndex + 1}`}
                                                        onClick={() => moveFooterItem(itemIndex, -1)}>
                                                    <HiArrowUp aria-hidden="true" className="h-4 w-4"/>
                                                </Button>
                                                <Button type="button" color="alternative" size="xs"
                                                        disabled={itemIndex === content.footer.items.length - 1}
                                                        aria-label={`下移页脚项目 ${itemIndex + 1}`}
                                                        onClick={() => moveFooterItem(itemIndex, 1)}>
                                                    <HiArrowDown aria-hidden="true" className="h-4 w-4"/>
                                                </Button>
                                                <Button type="button" color="red" outline size="xs"
                                                        aria-label={`删除页脚项目 ${itemIndex + 1}`}
                                                        onClick={() => removeFooterItem(itemIndex)}>
                                                    <HiTrash aria-hidden="true" className="h-4 w-4"/>
                                                </Button>
                                            </div> : null}
                                        </div>
                                        <LinkFields item={item} prefix={`footer-${language}-${item.id}`}
                                                    disabled={!canWrite} inputLang={inputLang} language={language}
                                                    pageOptions={pageOptions}
                                                    onChange={(field, value) =>
                                            updateFooterItem(itemIndex, field, value)}/>

                                        <div className="mt-5 border-t border-gray-100 pt-5">
                                            <div className="mb-4 flex items-center justify-between gap-4">
                                                <p className="text-sm font-semibold text-gray-700">子项目</p>
                                                {canWrite ? <Button id={`add-footer-subitem-${item.id}`} type="button"
                                                                    color="alternative" size="xs"
                                                                    onClick={() => addFooterSubItem(item.id, itemIndex)}>
                                                    <HiPlus aria-hidden="true" className="mr-2 h-4 w-4"/>添加子项目
                                                </Button> : null}
                                            </div>
                                            <div className="space-y-4" role="list"
                                                 aria-label={`页脚项目 ${itemIndex + 1} 的子项目`}>
                                                {item.subItems.length === 0 ? <p className="text-sm text-gray-500">暂无子项目</p> : null}
                                                {item.subItems.map((subItem, subItemIndex) => <div key={subItem.id}
                                                                                                  role="listitem"
                                                                                                  className="rounded-xl border border-gray-200 p-4">
                                                    <div className="mb-3 flex items-center justify-between gap-4">
                                                        <p className="text-sm font-medium text-gray-700">子项目 {subItemIndex + 1}</p>
                                                        {canWrite ? <div className="flex items-center gap-2" role="group"
                                                                         aria-label={`子项目 ${subItemIndex + 1} 操作`}>
                                                            <Button type="button" color="alternative" size="xs"
                                                                    disabled={subItemIndex === 0}
                                                                    aria-label={`上移页脚子项目 ${subItemIndex + 1}`}
                                                                    onClick={() => moveFooterSubItem(itemIndex, subItemIndex, -1)}>
                                                                <HiArrowUp aria-hidden="true" className="h-4 w-4"/>
                                                            </Button>
                                                            <Button type="button" color="alternative" size="xs"
                                                                    disabled={subItemIndex === item.subItems.length - 1}
                                                                    aria-label={`下移页脚子项目 ${subItemIndex + 1}`}
                                                                    onClick={() => moveFooterSubItem(itemIndex, subItemIndex, 1)}>
                                                                <HiArrowDown aria-hidden="true" className="h-4 w-4"/>
                                                            </Button>
                                                            <Button type="button" color="red" outline size="xs"
                                                                    aria-label={`删除页脚子项目 ${subItemIndex + 1}`}
                                                                    onClick={() => removeFooterSubItem(itemIndex, subItemIndex)}>
                                                                <HiTrash aria-hidden="true" className="h-4 w-4"/>
                                                            </Button>
                                                        </div> : null}
                                                    </div>
                                                    <LinkFields item={subItem}
                                                                prefix={`footer-${language}-${item.id}-${subItem.id}`}
                                                                disabled={!canWrite}
                                                                inputLang={inputLang}
                                                                language={language}
                                                                pageOptions={pageOptions}
                                                                onChange={(field, value) => updateFooterSubItem(
                                                                    itemIndex,
                                                                    subItemIndex,
                                                                    field,
                                                                    value
                                                                )}/>
                                                </div>)}
                                            </div>
                                        </div>
                                    </div>)}
                                </div>
                            </section>

                            <section className="rounded-3xl bg-gray-50 p-8">
                                <h2 className="mb-6 text-xl font-bold">页脚文字</h2>
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    {([
                                        [ 'phoneText', '电话号码文字' ],
                                        [ 'emailText', '电子邮箱文字' ],
                                        [ 'copyrightText', '版权文字' ],
                                        [ 'chineseWebsiteText', '国内高中官网文字' ],
                                        [ 'chineseWebsiteUrl', '国内高中官网链接' ],
                                        [ 'icpNumber', 'ICP 备案号' ]
                                    ] as [FooterTextField, string][]).map(([ field, label ]) => <div key={field}
                                                                                                  className={field === 'copyrightText' || field === 'chineseWebsiteText' ? 'lg:col-span-2' : ''}>
                                        <div className="mb-2 block">
                                            <Label htmlFor={`footer-${language}-${field}`}>{label}</Label>
                                        </div>
                                        <TextInput id={`footer-${language}-${field}`}
                                                   value={content.footer[field]}
                                                   disabled={!canWrite}
                                                   required
                                                   lang={inputLang}
                                                   type={field === 'emailText'
                                                       ? 'email'
                                                       : field === 'phoneText'
                                                           ? 'tel'
                                                           : field === 'chineseWebsiteUrl'
                                                               ? 'url'
                                                               : 'text'}
                                                   aria-describedby={field === 'chineseWebsiteUrl' || field === 'icpNumber'
                                                       ? `footer-${language}-${field}-description`
                                                       : undefined}
                                                   onChange={event => updateFooterText(field, event.currentTarget.value)}/>
                                        {field === 'chineseWebsiteUrl' || field === 'icpNumber'
                                            ? <p id={`footer-${language}-${field}-description`}
                                                 className="mt-2 text-xs text-gray-500">
                                                此项对中文和英文网站同时生效。
                                            </p>
                                            : null}
                                    </div>)}
                                </div>
                            </section>
                        </div>
                    </TabItem>
                    <TabItem title="审核与发布" icon={HiCloudUpload}>
                        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
                            {hasChanges ? <p className="mb-5 text-sm text-blue-600">请先保存当前更改，再开始审核流程。</p> : null}
                            <ApprovalProcess entityType={EntityType.page} entityId={draft.entity.id}
                                             entity={draft.entity} showPageNavigation={false}
                                             doAlign={async () => {
                                                 await alignContentEntity(draft.entity.id)
                                                 await refresh()
                                             }}/>
                        </div>
                    </TabItem>
                </Tabs>
            </div>
        </div>
    </>
}

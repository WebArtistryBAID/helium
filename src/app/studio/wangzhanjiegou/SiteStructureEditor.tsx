'use client'

import { useMemo, useState } from 'react'
import { Button, Select, TextInput } from 'flowbite-react'
import { SimplifiedContentEntity } from '@/app/lib/data-types'
import { SiteStructureFormNode, SiteStructureTreeNode } from '@/app/lib/site-structure-schema'
import { HiArrowDown, HiArrowUp, HiOutlinePlus, HiTrash } from 'react-icons/hi2'
import { saveSiteStructureTree } from '@/app/studio/wangzhanjiegou/actions'

function cloneTree(tree: SiteStructureFormNode[]): SiteStructureFormNode[] {
    return structuredClone(tree)
}

function normalizeNode(node: SiteStructureTreeNode): SiteStructureFormNode {
    return {
        id: node.id,
        titleEN: node.titleEN,
        titleZH: node.titleZH,
        slug: node.slug,
        jumpLabelEN: node.jumpLabelEN,
        jumpLabelZH: node.jumpLabelZH,
        jumpDescriptionEN: node.jumpDescriptionEN,
        jumpDescriptionZH: node.jumpDescriptionZH,
        pageEntityId: node.pageEntityId,
        children: node.children.map(normalizeNode)
    }
}

function createEmptyNode(): SiteStructureFormNode {
    return {
        titleEN: '',
        titleZH: '',
        slug: '',
        jumpLabelEN: '',
        jumpLabelZH: '',
        jumpDescriptionEN: '',
        jumpDescriptionZH: '',
        pageEntityId: null,
        children: []
    }
}

function updateNodeAtPath(tree: SiteStructureFormNode[], path: number[], updater: (node: SiteStructureFormNode) => SiteStructureFormNode) {
    const next = cloneTree(tree)
    let current: SiteStructureFormNode | null = null
    let arr = next

    for (let depth = 0; depth < path.length; depth++) {
        const index = path[depth]
        current = arr[index]
        if (!current) return next
        if (depth === path.length - 1) {
            arr[index] = updater(current)
            return next
        }
        arr = current.children
    }

    return next
}

function removeNodeAtPath(tree: SiteStructureFormNode[], path: number[]) {
    const next = cloneTree(tree)
    let arr = next
    for (let depth = 0; depth < path.length - 1; depth++) {
        const index = path[depth]
        arr = arr[index].children
    }
    arr.splice(path[path.length - 1], 1)
    return next
}

function moveNodeAtPath(tree: SiteStructureFormNode[], path: number[], direction: -1 | 1) {
    const next = cloneTree(tree)
    let arr = next
    for (let depth = 0; depth < path.length - 1; depth++) {
        arr = arr[path[depth]].children
    }
    const index = path[path.length - 1]
    const target = index + direction
    if (target < 0 || target >= arr.length) {
        return next
    }
    ;[ arr[index], arr[target] ] = [ arr[target], arr[index] ]
    return next
}

function addChildAtPath(tree: SiteStructureFormNode[], path: number[]) {
    return updateNodeAtPath(tree, path, node => ({
        ...node,
        children: [ ...node.children, createEmptyNode() ]
    }))
}

function SiteStructureNodeCard({
    node,
    path,
    onChange,
    onRemove,
    onMove,
    onAddChild,
    pageOptions
}: {
    node: SiteStructureFormNode
    path: number[]
    onChange: (path: number[], patch: Partial<SiteStructureFormNode>) => void
    onRemove: (path: number[]) => void
    onMove: (path: number[], direction: -1 | 1) => void
    onAddChild: (path: number[]) => void
    pageOptions: Array<{ value: string, label: string }>
}) {
    return <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm transition-all">
        <div className="mb-4 flex items-center justify-between gap-3">
            <div>
                <p className="text-sm font-semibold text-[#7a1f1c]">{path.length === 1 ? '一级导航' : '子页面'}</p>
                <p className="text-xs text-gray-500">路径层级：{path.join('.') || '1'}</p>
            </div>
            <div className="flex items-center gap-2">
                <button type="button" className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200" onClick={() => onMove(path, -1)}>
                    <HiArrowUp/>
                </button>
                <button type="button" className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200" onClick={() => onMove(path, 1)}>
                    <HiArrowDown/>
                </button>
                <button type="button" className="rounded-full bg-red-100 p-2 text-red-700 hover:bg-red-200" onClick={() => onRemove(path)}>
                    <HiTrash/>
                </button>
            </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
            <TextInput value={node.titleZH} placeholder="中文标题" onChange={e => onChange(path, { titleZH: e.currentTarget.value })}/>
            <TextInput value={node.titleEN} placeholder="English title" onChange={e => onChange(path, { titleEN: e.currentTarget.value })}/>
            <TextInput value={node.slug} placeholder="route slug" onChange={e => onChange(path, { slug: e.currentTarget.value })}/>
            <Select value={node.pageEntityId?.toString() ?? ''} onChange={e => onChange(path, { pageEntityId: e.currentTarget.value ? Number(e.currentTarget.value) : null })}>
                {pageOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <TextInput
                value={node.jumpLabelZH ?? ''}
                placeholder={path.length === 1 ? '一级入口文案（中文，可选）' : '子页面入口文字（中文）'}
                onChange={e => onChange(path, { jumpLabelZH: e.currentTarget.value })}
            />
            <TextInput
                value={node.jumpLabelEN ?? ''}
                placeholder={path.length === 1 ? 'Primary CTA label (optional)' : 'Child-page jump label (EN)'}
                onChange={e => onChange(path, { jumpLabelEN: e.currentTarget.value })}
            />
            <TextInput
                value={node.jumpDescriptionZH ?? ''}
                placeholder={path.length === 1 ? '一级入口说明（中文，可选）' : '子页面入口说明（中文，可选）'}
                onChange={e => onChange(path, { jumpDescriptionZH: e.currentTarget.value })}
            />
            <TextInput
                value={node.jumpDescriptionEN ?? ''}
                placeholder={path.length === 1 ? 'Primary CTA description (optional)' : 'Child-page jump description (EN)'}
                onChange={e => onChange(path, { jumpDescriptionEN: e.currentTarget.value })}
            />
        </div>

        <div className="mt-4 flex justify-end">
            <Button color="light" pill onClick={() => onAddChild(path)}>
                <HiOutlinePlus className="mr-2 h-4 w-4"/>添加子页面
            </Button>
        </div>

        {node.children.length > 0 && (
            <div className="mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
                {node.children.map((child, index) => (
                    <SiteStructureNodeCard
                        key={`${path.join('-')}-${index}`}
                        node={child}
                        path={[ ...path, index ]}
                        onChange={onChange}
                        onRemove={onRemove}
                        onMove={onMove}
                        onAddChild={onAddChild}
                        pageOptions={pageOptions}
                    />
                ))}
            </div>
        )}
    </div>
}

export default function SiteStructureEditor({ initialTree, pageEntities }: {
    initialTree: SiteStructureTreeNode[]
    pageEntities: SimplifiedContentEntity[]
}) {
    const [ tree, setTree ] = useState<SiteStructureFormNode[]>(() => initialTree.map(normalizeNode))
    const [ saving, setSaving ] = useState(false)
    const [ status, setStatus ] = useState('')

    const pageOptions = useMemo(() => [
        { value: '', label: '不绑定页面' },
        ...pageEntities.map(page => ({
            value: page.id.toString(),
            label: `${page.titleDraftZH} (#${page.id})`
        }))
    ], [ pageEntities ])

    function handleChange(path: number[], patch: Partial<SiteStructureFormNode>) {
        setTree(prev => updateNodeAtPath(prev, path, node => ({ ...node, ...patch })))
    }

    return <div className="p-10">
        <div className="mb-8 flex items-end justify-between gap-4">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f1c]">Site Structure</p>
                <h1 className="mt-2 text-4xl font-bold">网站结构编辑器</h1>
                <p className="mt-3 max-w-3xl text-base secondary">
                    这里改的是网站层级，不是页面正文。顶部导航、页脚、公开页面入口都会读这里的结构。
                </p>
                <p className="mt-2 max-w-3xl text-sm text-gray-500">
                    目前用上下按钮调整顺序，先保证结构编辑稳定，避免临近上线时因为拖拽引入额外问题。
                </p>
                <p className="mt-2 max-w-3xl text-sm text-gray-500">
                    子页面可以额外设置“入口文字/说明”，公开页里的跳转卡片会优先使用这里的文案，不需要再把跳转按钮写死在页面正文里。
                </p>
            </div>
            <div className="flex gap-3">
                <Button color="light" pill onClick={() => setTree(prev => [ ...prev, createEmptyNode() ])}>
                    <HiOutlinePlus className="mr-2 h-4 w-4"/>添加一级栏目
                </Button>
                <Button pill color="blue" disabled={saving} onClick={async () => {
                    setSaving(true)
                    setStatus('')
                    try {
                        await saveSiteStructureTree(tree)
                        setStatus('网站结构已保存')
                    } catch (error) {
                        setStatus(error instanceof Error ? error.message : '保存失败')
                    } finally {
                        setSaving(false)
                    }
                }}>
                    {saving ? '正在保存...' : '保存结构'}
                </Button>
            </div>
        </div>

        {status && <div className="mb-5 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{status}</div>}

        <div className="grid gap-6 rounded-[2rem] border border-gray-200 bg-[#faf7f2] p-6">
            {tree.map((node, index) => (
                <SiteStructureNodeCard
                    key={`root-${index}`}
                    node={node}
                    path={[ index ]}
                    onChange={handleChange}
                    onRemove={path => setTree(prev => removeNodeAtPath(prev, path))}
                    onMove={(path, direction) => setTree(prev => moveNodeAtPath(prev, path, direction))}
                    onAddChild={path => setTree(prev => addChildAtPath(prev, path))}
                    pageOptions={pageOptions}
                />
            ))}
        </div>
    </div>
}

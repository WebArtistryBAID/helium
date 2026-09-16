'use client'

import { useEffect, useState } from 'react'
import { Badge, Button } from 'flowbite-react'
import { HiCheck, HiChevronDown, HiChevronUp, HiXMark } from 'react-icons/hi2'
import type { HeliumSuggestion } from '@/app/lib/plate/plate-suggestions'

function suggestionLabel(suggestion: HeliumSuggestion): string {
    if (suggestion.type === 'replace') return '替换'
    if (suggestion.type === 'remove') return '删除'
    if (suggestion.type === 'update') return '格式更改'
    return '添加'
}

function suggestionText(suggestion: HeliumSuggestion): string {
    if (suggestion.type === 'replace') return `${suggestion.removedText} → ${suggestion.insertedText}`
    return suggestion.removedText || suggestion.insertedText || '块级内容更改'
}

function SuggestionCard({ activeId, currentUserId, currentUserName, onAccept, onReject, suggestion }: {
    activeId: string | null
    currentUserId: string
    currentUserName: string
    onAccept: (suggestion: HeliumSuggestion) => void
    onReject: (suggestion: HeliumSuggestion) => void
    suggestion: HeliumSuggestion
}) {
    const [ collapsed, setCollapsed ] = useState(activeId != null && activeId !== suggestion.suggestionId)

    useEffect(() => {
        if (activeId != null) setCollapsed(activeId !== suggestion.suggestionId)
    }, [ activeId, suggestion.suggestionId ])

    return <div className="space-y-4 px-1">
        <div className="flex items-center gap-2">
            <Badge color={suggestion.type === 'remove' ? 'failure' : 'success'}>
                {suggestionLabel(suggestion)}
            </Badge>
            <span className="ml-auto text-xs text-gray-500">
                {suggestion.createdAt.toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </span>
            <Button pill size="xs" color="alternative"
                    aria-label={collapsed ? '展开建议' : '收起建议'}
                    onClick={() => setCollapsed(value => !value)}>
                {collapsed
                    ? <HiChevronDown className="size-4" aria-hidden="true"/>
                    : <HiChevronUp className="size-4" aria-hidden="true"/>}
            </Button>
        </div>
        {!collapsed && <div className="space-y-3">
            <p className="text-sm font-bold text-gray-900">
                {suggestion.userId === currentUserId ? currentUserName : `用户 ${suggestion.userId}`}
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{suggestionText(suggestion)}</p>
            <div className="flex justify-end gap-2">
                <Button pill size="xs" color="red" onClick={() => onReject(suggestion)}>拒绝</Button>
                <Button pill size="xs" color="green" onClick={() => onAccept(suggestion)}>
                    <HiCheck className="mr-1 size-4" aria-hidden="true"/>接受
                </Button>
            </div>
        </div>}
    </div>
}

export default function PlateSuggestionsPanel({
                                                  activeId, currentUserId, currentUserName, onAccept, onClose,
                                                  onReject, suggestions
                                              }: {
    activeId: string | null
    currentUserId: string
    currentUserName: string
    onAccept: (suggestion: HeliumSuggestion) => void
    onClose: () => void
    onReject: (suggestion: HeliumSuggestion) => void
    suggestions: HeliumSuggestion[]
}) {
    return <aside className="max-h-[60rem] space-y-4 overflow-y-auto rounded-3xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">建议</h3>
            <Badge color={suggestions.length === 0 ? 'success' : 'warning'}>{suggestions.length}</Badge>
            <Button pill size="xs" color="alternative" className="ml-auto" aria-label="关闭建议"
                    onClick={onClose}><HiXMark className="size-4" aria-hidden="true"/></Button>
        </div>
        {suggestions.map(suggestion => <SuggestionCard key={suggestion.suggestionId}
                                                       activeId={activeId}
                                                       currentUserId={currentUserId}
                                                       currentUserName={currentUserName}
                                                       suggestion={suggestion}
                                                       onAccept={onAccept}
                                                       onReject={onReject}/>)}
    </aside>
}

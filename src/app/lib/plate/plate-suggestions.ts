import { ElementApi, TextApi, type SlateEditor } from 'platejs'
import {
    BaseSuggestionPlugin,
    getSuggestionKey,
    rejectSuggestion,
    type TResolvedSuggestion
} from '@platejs/suggestion'
import { createHeliumPlateStaticEditor } from '@/app/lib/plate/plate-static-config'
import type { HeliumPlateValue } from '@/app/lib/plate/plate-types'

export type HeliumSuggestion = TResolvedSuggestion & {
    createdAt: Date
    insertedText: string
    removedText: string
}

export function collectPlateSuggestions(editor: SlateEditor): HeliumSuggestion[] {
    const suggestions = new Map<string, HeliumSuggestion>()
    const api = editor.getApi(BaseSuggestionPlugin).suggestion

    for (const [ node ] of api.nodes()) {
        const dataList = TextApi.isText(node)
            ? api.dataList(node)
            : [ api.suggestionData(node) ].filter(data => data != null)

        for (const data of dataList) {
            if (data == null) continue
            const existing = suggestions.get(data.id)
            const text = TextApi.isText(node) ? node.text : ElementApi.isElement(node) ? editor.api.string(node) : ''
            const insertedText = data.type === 'insert' ? text : ''
            const removedText = data.type === 'remove' ? text : ''

            if (existing != null) {
                existing.insertedText += insertedText
                existing.removedText += removedText
                if (existing.insertedText && existing.removedText) existing.type = 'replace'
                continue
            }

            suggestions.set(data.id, {
                suggestionId: data.id,
                keyId: getSuggestionKey(data.id),
                userId: data.userId,
                createdAt: new Date(data.createdAt),
                type: data.type,
                insertedText,
                removedText,
                newProperties: 'newProperties' in data ? data.newProperties : undefined,
                properties: 'properties' in data ? data.properties : undefined
            })
        }
    }

    return [ ...suggestions.values() ].sort((first, second) =>
        second.createdAt.getTime() - first.createdAt.getTime())
}

export function rejectAllPlateSuggestions(value: HeliumPlateValue): HeliumPlateValue {
    const editor = createHeliumPlateStaticEditor(structuredClone(value))
    for (const suggestion of collectPlateSuggestions(editor)) rejectSuggestion(editor, suggestion)
    return editor.children as HeliumPlateValue
}

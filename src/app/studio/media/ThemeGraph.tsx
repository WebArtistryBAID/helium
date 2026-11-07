'use client'

import { Button } from 'flowbite-react'
import { HiArrowPath } from 'react-icons/hi2'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import type { CollectionLinkSummary, CollectionSummary } from '@/app/studio/media/taxonomy-actions'
import TaxonomyIcon from '@/app/studio/media/TaxonomyIcon'

const GRAPH_HEIGHT = 560
const ITERATIONS = 250
const SEPARATION_ITERATIONS = 60
const PADDING_X = 48
const PADDING_TOP = 32
const PADDING_BOTTOM = 58
const NODE_GAP = 10
const DRAG_THRESHOLD = 4
const MIN_NODE_RADIUS = 18
const MAX_EXTRA_RADIUS = 16
const NAME_MAX_CHARS = 8

type GraphNode = {
    id: number
    name: string
    color: string
    icon: string | null
    imageCount: number
    radius: number
    x: number
    y: number
}

type DragState = {
    pointerId: number
    nodeId: number
    startX: number
    startY: number
    offsetX: number
    offsetY: number
    moved: boolean
}

type Props = {
    collections: CollectionSummary[]
    links: CollectionLinkSummary[]
    selectedId: number | null
    onSelect: (id: number) => void
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value))
}

function nodeRadius(imageCount: number): number {
    return MIN_NODE_RADIUS + Math.min(MAX_EXTRA_RADIUS, Math.sqrt(Math.max(0, imageCount)) * 3)
}

function clampPosition(x: number, y: number, radius: number, width: number): { x: number, y: number } {
    return {
        x: clamp(x, PADDING_X + radius, Math.max(PADDING_X + radius, width - PADDING_X - radius)),
        y: clamp(y, PADDING_TOP + radius, Math.max(PADDING_TOP + radius, GRAPH_HEIGHT - PADDING_BOTTOM - radius))
    }
}

function truncateName(name: string): string {
    const characters = [ ...name ]
    return characters.length > NAME_MAX_CHARS
        ? `${characters.slice(0, NAME_MAX_CHARS).join('')}…`
        : name
}

/** White text on dark fills, near-black text on light fills. */
function readableTextColor(color: string): string {
    const match = /^#([0-9a-f]{6})$/i.exec(color.trim())
    if (match == null) return '#ffffff'
    const value = Number.parseInt(match[1], 16)
    const red = (value >> 16) & 0xff
    const green = (value >> 8) & 0xff
    const blue = value & 0xff
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114
    return luminance > 165 ? '#111827' : '#ffffff'
}

/**
 * Deterministic force-directed layout: repulsion between every pair, spring attraction along
 * links, gravity toward the centre, linear cooling, then a short overlap-removal pass.
 */
function computeLayout(
    collections: CollectionSummary[],
    links: CollectionLinkSummary[],
    width: number,
    layoutVersion: number
): GraphNode[] {
    const safeWidth = width
    const usableWidth = Math.max(60, safeWidth - PADDING_X * 2)
    const usableHeight = Math.max(60, GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM)
    const centerX = safeWidth / 2
    const centerY = PADDING_TOP + usableHeight / 2
    const nodes: GraphNode[] = collections.map((collection, index) => {
        const angle = (2 * Math.PI * index) / Math.max(1, collections.length) + layoutVersion * 0.61
        const ring = Math.min(usableWidth, usableHeight) * (0.3 + 0.04 * (index % 5))
        const radius = nodeRadius(collection.imageCount)
        const position = clampPosition(
            centerX + Math.cos(angle) * ring,
            centerY + Math.sin(angle) * ring,
            radius,
            safeWidth
        )
        return {
            id: collection.id,
            name: collection.name,
            color: collection.color,
            icon: collection.icon,
            imageCount: collection.imageCount,
            radius,
            x: position.x,
            y: position.y
        }
    })
    const count = nodes.length
    if (count < 2) {
        if (count === 1) {
            nodes[0].x = centerX
            nodes[0].y = centerY
        }
        return nodes
    }
    const indexById = new Map(nodes.map((node, index) => [ node.id, index ]))
    const edges: Array<[ number, number ]> = []
    for (const link of links) {
        const from = indexById.get(link.fromId)
        const to = indexById.get(link.toId)
        if (from == null || to == null || from === to) continue
        edges.push([ from, to ])
    }
    const ideal = clamp(
        Math.min(usableWidth, usableHeight) * 1.05 / Math.sqrt(count),
        66,
        Math.max(120, Math.min(usableWidth, usableHeight) * 0.5)
    )
    const dispX = new Float64Array(count)
    const dispY = new Float64Array(count)
    const initialTemperature = Math.min(usableWidth, usableHeight) * 0.16
    const gravity = 0.35
    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
        dispX.fill(0)
        dispY.fill(0)
        for (let left = 0; left < count; left += 1) {
            for (let right = left + 1; right < count; right += 1) {
                let dx = nodes[left].x - nodes[right].x
                let dy = nodes[left].y - nodes[right].y
                let distance = Math.hypot(dx, dy)
                if (distance < 0.01) {
                    dx = 0.01 * (left - right + 1)
                    dy = 0.01
                    distance = Math.hypot(dx, dy)
                }
                const force = (ideal * ideal) / distance
                const unitX = dx / distance
                const unitY = dy / distance
                dispX[left] += unitX * force
                dispY[left] += unitY * force
                dispX[right] -= unitX * force
                dispY[right] -= unitY * force
            }
        }
        for (const [ from, to ] of edges) {
            let dx = nodes[from].x - nodes[to].x
            let dy = nodes[from].y - nodes[to].y
            let distance = Math.hypot(dx, dy)
            if (distance < 0.01) {
                dx = 0.01
                dy = 0.01
                distance = Math.hypot(dx, dy)
            }
            const force = (distance * distance) / ideal
            const unitX = dx / distance
            const unitY = dy / distance
            dispX[from] -= unitX * force
            dispY[from] -= unitY * force
            dispX[to] += unitX * force
            dispY[to] += unitY * force
        }
        const temperature = initialTemperature * (1 - iteration / ITERATIONS)
        for (let index = 0; index < count; index += 1) {
            dispX[index] += (centerX - nodes[index].x) * gravity
            dispY[index] += (centerY - nodes[index].y) * gravity
            const length = Math.hypot(dispX[index], dispY[index])
            if (length > 0.001) {
                const step = Math.min(length, temperature)
                nodes[index].x += dispX[index] / length * step
                nodes[index].y += dispY[index] / length * step
            }
            const position = clampPosition(nodes[index].x, nodes[index].y, nodes[index].radius, safeWidth)
            nodes[index].x = position.x
            nodes[index].y = position.y
        }
    }
    for (let iteration = 0; iteration < SEPARATION_ITERATIONS; iteration += 1) {
        let moved = false
        for (let left = 0; left < count; left += 1) {
            for (let right = left + 1; right < count; right += 1) {
                let dx = nodes[left].x - nodes[right].x
                let dy = nodes[left].y - nodes[right].y
                let distance = Math.hypot(dx, dy)
                const minimum = nodes[left].radius + nodes[right].radius + NODE_GAP
                if (distance >= minimum) continue
                if (distance < 0.01) {
                    dx = 0.01 * (left - right + 1)
                    dy = 0.01
                    distance = Math.hypot(dx, dy)
                }
                const push = (minimum - distance) / 2
                const unitX = dx / distance
                const unitY = dy / distance
                nodes[left].x += unitX * push
                nodes[left].y += unitY * push
                nodes[right].x -= unitX * push
                nodes[right].y -= unitY * push
                moved = true
            }
        }
        for (let index = 0; index < count; index += 1) {
            const position = clampPosition(nodes[index].x, nodes[index].y, nodes[index].radius, safeWidth)
            nodes[index].x = position.x
            nodes[index].y = position.y
        }
        if (!moved) break
    }
    return nodes
}

/** SVG network view of theme folders and their relations, with a deterministic force layout. */
export default function ThemeGraph({ collections, links, selectedId, onSelect }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const dragRef = useRef<DragState | null>(null)
    const [ width, setWidth ] = useState(0)
    const [ layoutVersion, setLayoutVersion ] = useState(0)
    const [ nodes, setNodes ] = useState<GraphNode[]>([])
    const [ draggingId, setDraggingId ] = useState<number | null>(null)

    useEffect(() => {
        const element = containerRef.current
        if (element == null) return
        const updateWidth = () => setWidth(element.clientWidth)
        updateWidth()
        const observer = new ResizeObserver(updateWidth)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (width <= 0) return
        setNodes(computeLayout(collections, links, width, layoutVersion))
    }, [ collections, links, width, layoutVersion ])

    const nodeById = useMemo(() => new Map(nodes.map(node => [ node.id, node ])), [ nodes ])
    const selectedNode = selectedId == null ? null : nodeById.get(selectedId) ?? null
    const selectedColor = selectedNode?.color ?? '#1d4ed8'

    function toLocalPoint(clientX: number, clientY: number): { x: number, y: number } | null {
        const svg = svgRef.current
        if (svg == null || width <= 0) return null
        const bounds = svg.getBoundingClientRect()
        if (bounds.width === 0 || bounds.height === 0) return null
        return {
            x: (clientX - bounds.left) * width / bounds.width,
            y: (clientY - bounds.top) * GRAPH_HEIGHT / bounds.height
        }
    }

    function handlePointerDown(event: PointerEvent<SVGGElement>, node: GraphNode) {
        const point = toLocalPoint(event.clientX, event.clientY)
        if (point == null) return
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = {
            pointerId: event.pointerId,
            nodeId: node.id,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: node.x - point.x,
            offsetY: node.y - point.y,
            moved: false
        }
        setDraggingId(node.id)
    }

    function handlePointerMove(event: PointerEvent<SVGGElement>) {
        const drag = dragRef.current
        if (drag == null || drag.pointerId !== event.pointerId) return
        if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) {
            return
        }
        drag.moved = true
        const point = toLocalPoint(event.clientX, event.clientY)
        if (point == null) return
        setNodes(current => current.map(node => {
            if (node.id !== drag.nodeId) return node
            const position = clampPosition(point.x + drag.offsetX, point.y + drag.offsetY, node.radius, width)
            return { ...node, x: position.x, y: position.y }
        }))
    }

    function endDrag(event: PointerEvent<SVGGElement>) {
        const drag = dragRef.current
        if (drag == null || drag.pointerId !== event.pointerId) return
        dragRef.current = null
        setDraggingId(null)
        if (!drag.moved) onSelect(drag.nodeId)
    }

    function handleKeyDown(event: KeyboardEvent<SVGGElement>, node: GraphNode) {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onSelect(node.id)
    }

    const hasThemes = collections.length > 0

    return <div ref={containerRef} className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
                拖动节点可以调整位置，点击节点查看主题详情。
            </p>
            <Button pill size="xs" color="light" onClick={() => setLayoutVersion(current => current + 1)}
                    aria-label="重新布局关系图谱">
                <HiArrowPath className="mr-1 size-3.5" aria-hidden="true"/>
                重新布局
            </Button>
        </div>
        {hasThemes
            ? width > 0 && <svg ref={svgRef} role="img"
                                aria-label={`主题关系图谱，共 ${collections.length} 个主题、${links.length} 条关联`}
                                width={width} height={GRAPH_HEIGHT} viewBox={`0 0 ${width} ${GRAPH_HEIGHT}`}
                                className="block w-full touch-none select-none rounded-2xl border border-gray-100 bg-gray-50/40">
                {links.map(link => {
                    const from = nodeById.get(link.fromId)
                    const to = nodeById.get(link.toId)
                    if (from == null || to == null) return null
                    const highlighted = selectedId != null && (link.fromId === selectedId || link.toId === selectedId)
                    return <line key={link.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                 stroke={highlighted ? selectedColor : '#d1d5db'}
                                 strokeWidth={highlighted ? 2.5 : 1}
                                 strokeOpacity={highlighted ? 0.9 : 0.75}/>
                })}
                {nodes.map(node => {
                    const isSelected = node.id === selectedId
                    return <g key={node.id} tabIndex={0} role="button" aria-pressed={isSelected}
                              aria-label={`主题 ${node.name}，${node.imageCount} 个媒体${isSelected ? '，已选中' : ''}`}
                              className={(draggingId === node.id ? 'cursor-grabbing' : 'cursor-grab') + ' outline-none'}
                              onPointerDown={event => handlePointerDown(event, node)}
                              onPointerMove={handlePointerMove}
                              onPointerUp={endDrag}
                              onPointerCancel={endDrag}
                              onKeyDown={event => handleKeyDown(event, node)}>
                        {isSelected &&
                            <circle cx={node.x} cy={node.y} r={node.radius + 6} fill="none" stroke={node.color}
                                    strokeWidth={2} strokeDasharray="4 3" strokeOpacity={0.8}/>}
                        <circle cx={node.x} cy={node.y} r={node.radius} fill={node.color}
                                stroke={isSelected ? '#1d4ed8' : '#ffffff'}
                                strokeWidth={isSelected ? 4 : 2}/>
                        <g transform={`translate(${node.x - 7}, ${node.y - 7})`}
                           className="pointer-events-none select-none" aria-hidden="true">
                            <TaxonomyIcon icon={node.icon} size={14} color={readableTextColor(node.color)}/>
                        </g>
                        <text x={node.x} y={node.y + node.radius + 15} textAnchor="middle" fontSize={11}
                              fontWeight={isSelected ? 600 : 400}
                              fill={isSelected ? '#1d4ed8' : '#4b5563'}
                              className="pointer-events-none select-none" aria-hidden="true">
                            {truncateName(node.name)}
                        </text>
                        <text x={node.x} y={node.y + node.radius + 27} textAnchor="middle" fontSize={10}
                              fill="#9ca3af" className="pointer-events-none select-none" aria-hidden="true">
                            {node.imageCount} 个媒体
                        </text>
                    </g>
                })}
            </svg>
            : <div className="flex h-[560px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 text-gray-500">
                <p className="text-sm">还没有主题</p>
                <p className="mt-1 text-xs text-gray-400">创建主题后，它们之间的关联会显示在这里。</p>
            </div>}
    </div>
}

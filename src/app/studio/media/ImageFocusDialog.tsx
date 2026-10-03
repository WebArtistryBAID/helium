'use client'

import { Alert, Button, Label, Modal, ModalBody, ModalFooter, ModalHeader, RangeSlider } from 'flowbite-react'
import { useRef, useState, type PointerEvent } from 'react'
import type { Image } from '@/generated/prisma/browser'
import { getImageFocus } from '@/app/lib/image-focus'
import { updateImageFocus } from './media-actions'

export default function ImageFocusDialog({ image, uploadPrefix, onClose, onSaved, onPermissionError }: {
    image: Image; uploadPrefix: string; onClose: () => void; onSaved: (image: Image) => void
    onPermissionError: (error: unknown) => boolean
}) {
    const [ focus, setFocus ] = useState(() => getImageFocus(image))
    const [ saving, setSaving ] = useState(false)
    const [ error, setError ] = useState('')
    const area = useRef<HTMLDivElement>(null)
    const gesture = useRef<{
        x: number; y: number; left: number; top: number; side: number; mode: string
    } | null>(null)
    const shorter = Math.min(image.width, image.height)
    const side = shorter * focus.focusSize
    const left = focus.focusX * image.width - side / 2
    const top = focus.focusY * image.height - side / 2

    function begin(event: PointerEvent<HTMLElement>, mode: string) {
        if (saving) return
        event.preventDefault()
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        gesture.current = { x: event.clientX, y: event.clientY, left, top, side, mode }
    }

    function move(event: PointerEvent<HTMLElement>) {
        const start = gesture.current
        const bounds = area.current?.getBoundingClientRect()
        if (!start || !bounds || !bounds.width) return
        const dx = (event.clientX - start.x) * image.width / bounds.width
        const dy = (event.clientY - start.y) * image.height / bounds.height
        let nextLeft = start.left
        let nextTop = start.top
        let nextSide = start.side
        if (start.mode === 'move') {
            nextLeft = Math.max(0, Math.min(image.width - nextSide, start.left + dx))
            nextTop = Math.max(0, Math.min(image.height - nextSide, start.top + dy))
        } else {
            const west = start.mode.includes('w')
            const north = start.mode.includes('n')
            const change = ((west ? -dx : dx) + (north ? -dy : dy)) / 2
            const anchorX = west ? start.left + start.side : start.left
            const anchorY = north ? start.top + start.side : start.top
            const maximum = Math.min(west ? anchorX : image.width - anchorX, north ? anchorY : image.height - anchorY)
            nextSide = Math.max(shorter * 0.05, Math.min(maximum, start.side + change))
            nextLeft = west ? anchorX - nextSide : anchorX
            nextTop = north ? anchorY - nextSide : anchorY
        }
        setFocus({
            focusX: (nextLeft + nextSide / 2) / image.width,
            focusY: (nextTop + nextSide / 2) / image.height, focusSize: nextSide / shorter
        })
    }

    function nudge(event: React.KeyboardEvent<HTMLDivElement>) {
        if (saving) return
        const step = (event.shiftKey ? 0.02 : 0.005) * shorter
        const offsets: Record<string, [ number, number ]> = {
            ArrowLeft: [ -step, 0 ], ArrowRight: [ step, 0 ], ArrowUp: [ 0, -step ], ArrowDown: [ 0, step ]
        }
        const offset = offsets[event.key]
        if (!offset) return
        event.preventDefault()
        const nextLeft = Math.max(0, Math.min(image.width - side, left + offset[0]))
        const nextTop = Math.max(0, Math.min(image.height - side, top + offset[1]))
        setFocus({ ...focus, focusX: (nextLeft + side / 2) / image.width, focusY: (nextTop + side / 2) / image.height })
    }

    return <Modal show size="3xl" popup onClose={() => {
        if (!saving) onClose()
    }}>
        <ModalHeader/>
        <ModalBody>
            <h3 className="mb-4 text-xl font-bold">调整剪裁</h3>
            {error && <Alert color="failure" className="mb-4">{error}</Alert>}
            <div className="flex justify-center overflow-hidden rounded-3xl bg-gray-100">
                <div ref={area} className="relative select-none touch-none"
                     style={{ aspectRatio: `${image.width} / ${image.height}` }}>
                    <img src={`${uploadPrefix}/${image.sha1}.${image.extension}`} alt={image.altText || image.name}
                         draggable={false} className="block h-full w-full"/>
                    <div tabIndex={0} role="group" aria-label="剪裁区域，使用方向键移动"
                         className="absolute cursor-move border-2 border-white outline-blue-500"
                         style={{
                             left: `${left / image.width * 100}%`, top: `${top / image.height * 100}%`,
                             width: `${side / image.width * 100}%`, height: `${side / image.height * 100}%`,
                             boxShadow: '0 0 0 9999px rgb(0 0 0 / 45%)', touchAction: 'none'
                         }}
                         onKeyDown={nudge} onPointerDown={event => begin(event, 'move')}
                         onPointerMove={move} onPointerUp={() => {
                        gesture.current = null
                    }}
                         onPointerCancel={() => {
                             gesture.current = null
                         }}>
                        {[ 'nw', 'ne', 'sw', 'se' ].map(corner => <span key={corner}
                                                                        className={`absolute h-4 w-4 bg-white ${corner.includes('n') ? '-top-2' : '-bottom-2'} ${corner.includes('w') ? '-left-2' : '-right-2'} ${corner === 'nw' || corner === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'}`}
                                                                        onPointerDown={event => begin(event, corner)}/>)}
                    </div>
                </div>
            </div>
        </ModalBody>
        <ModalFooter className="border-0">
            <Button pill color="blue" disabled={saving} onClick={async () => {
                setSaving(true)
                setError('')
                try {
                    onSaved(await updateImageFocus(image.id, focus))
                } catch (error) {
                    if (!onPermissionError(error)) setError('保存失败，请重试。')
                } finally {
                    setSaving(false)
                }
            }}>{saving ? '保存中…' : '保存'}</Button>
            <Button pill color="alternative" disabled={saving} onClick={onClose}>取消</Button>
            <Button pill color="light" disabled={saving}
                    onClick={() => setFocus({ focusX: 0.5, focusY: 0.5, focusSize: 1 })}>重置</Button>
        </ModalFooter>
    </Modal>
}

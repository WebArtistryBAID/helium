'use client'

import { useRef, useState } from 'react'
import { HiColorSwatch } from 'react-icons/hi'

export default function ColorPickerPuck({ name, onChange, value }:
                                        {
                                            name: string,
                                            onChange: (value: string | null) => void,
                                            value: string | null
                                        }) {
    const [ currentColor, setCurrentColor ] = useState(value ?? '#000000')
    const inputRef = useRef<HTMLInputElement>(null)

    return <fieldset>
        <legend className="flex items-center mb-3 gap-1 pl-1">
            <HiColorSwatch className="h-4 text-gray-400"/>
            <span className="text-sm text-gray-700">{name}</span>
        </legend>

        <div className="flex gap-3">
            <button
                type="button"
                aria-label="白色"
                aria-pressed={value === '#ffffff'}
                className={`h-8 w-8 border border-black rounded-full ${value === '#ffffff' ? 'ring-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: 'white' }}
                onClick={() => onChange('#ffffff')}/>

            <button type="button" aria-label="黑色" aria-pressed={value === '#000000'}
                    className={`h-8 w-8 rounded-full ${value === '#000000' ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: 'black' }}
                    onClick={() => onChange('#000000')}/>

            <button type="button" aria-label="灰色" aria-pressed={value === '#4f5b74'}
                    className={`h-8 w-8 rounded-full ${value === '#4f5b74' ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: '#4f5b74' }}
                    onClick={() => onChange('#4f5b74')}/>

            <button type="button" aria-label="北中红" aria-pressed={value === '#9f0612'}
                    className={`h-8 w-8 rounded-full ${value === '#9f0612' ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: '#9f0612' }}
                    onClick={() => onChange('#9f0612')}/>

            <button type="button" aria-label="国际蓝" aria-pressed={value === '#103c74'}
                    className={`h-8 w-8 rounded-full ${value === '#103c74' ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: '#103c74' }}
                    onClick={() => onChange('#103c74')}/>

            <label
                aria-label="自选颜色"
                className={`relative h-8 w-8 cursor-pointer border border-black rounded-full focus-within:ring-2 focus-within:ring-blue-500 ${![ '#9f0612', '#103c74', '#ffffff', '#000000', '#4f5b74' ].includes(value ?? '') ? 'ring-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: currentColor }}>
                <input type="color" ref={inputRef} value={currentColor}
                       className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                       onChange={e => {
                           setCurrentColor(e.currentTarget.value.toLowerCase())
                           onChange(e.currentTarget.value.toLowerCase())
                       }}/>
                <span className="sr-only">自选颜色</span>
            </label>
        </div>
    </fieldset>
}

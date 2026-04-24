'use client'

import { HiUpload } from 'react-icons/hi'
import { useRef, useState } from 'react'
import If from '@/app/lib/If'

export default function UploadAreaClient({ uploadPrefix, onDone }: {
    uploadPrefix: string,
    onDone: (hash: string) => void
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [ loading, setLoading ] = useState(false)
    const [ progress, setProgress ] = useState(0)
    const [ error, setError ] = useState('')
    const [ done, setDone ] = useState(false)
    const [ path, setPath ] = useState('')

    async function upload(file: File) {
        setLoading(true)
        setDone(false)
        setError('')
        setProgress(0)
        const formData = new FormData()
        formData.append('file', file)

        const xhr = new XMLHttpRequest() // Using this makes me feel ancient
        xhr.open('POST', '/studio/media/upload', true)
        xhr.upload.onprogress = (e: ProgressEvent) => {
            if (e.lengthComputable) {
                setProgress(Math.round((e.loaded / e.total) * 100))
            }
        }
        xhr.onload = () => {
            setLoading(false)
            setProgress(0)
            const json = JSON.parse(xhr.responseText)
            if ('hash' in json) {
                setDone(true)
                setPath(JSON.parse(xhr.responseText).hash + '.webp')
                onDone(JSON.parse(xhr.responseText).hash)
            } else {
                setError(json.error)
            }
        }
        xhr.onerror = () => {
            setError('network')
        }
        xhr.send(formData)
    }

    return <div aria-label="上传块"
                onClick={() => inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    e.preventDefault()
                    if (e.dataTransfer.files.length > 0) {
                        void upload(e.dataTransfer.files[0])
                    }
                }}
                className="bg-blue-50 hover:bg-blue-100
        rounded-3xl flex flex-col justify-center items-center text-center p-5 min-w-96
        transition-colors duration-100">
        <input type="file" disabled={loading} accept="image/*"
               className="hidden" ref={inputRef} onChange={e => {
            if (e.currentTarget.files != null && e.currentTarget.files.length > 0) {
                void upload(e.currentTarget.files[0])
            }
        }}/>
        <HiUpload className="text-blue-400 dark:text-blue-300 text-4xl mb-3"/>
        <p className="text-xl font-bold" aria-hidden>上传</p>
        <button aria-live="polite" disabled={loading} className="text-sm" onClick={() => inputRef.current?.click()}>
            <If condition={loading}>
                上传进度: {progress}%
            </If>
            <If condition={!loading}>
                <If condition={error != ''}>
                    {{
                        network: '网络错误，请稍后再试',
                        'no-file': '未检测到文件，请重试',
                        'not-image': '仅支持图片格式的文件',
                        duplicate: '该图片已存在，无需重复上传'
                    }[error]}
                </If>
                <If condition={done}>
                    上传完毕
                </If>
                <If condition={!error && !done}>
                    拖拽图片或点击此处上传
                </If>
            </If>
        </button>
        <If condition={done && uploadPrefix !== '' && path !== ''}>
            <img width={500} height={200} src={uploadPrefix + '/' + path} alt="已上传文件"
                 className="mt-3 rounded-xl w-full lg:max-w-sm object-cover"/>
        </If>
    </div>
}

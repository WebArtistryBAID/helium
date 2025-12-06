import { Button } from 'flowbite-react'
import Link from 'next/link'

export default function NotFound() {
    return <div className="flex h-screen w-screen justify-center items-center flex-col">
        <h1 className="text-4xl font-bold mb-3">Not Found</h1>
        <p className="text-2xl mb-3">未找到页面</p>
        <Link href="/">
            <Button as="div" pill color="blue">Return to Home / 返回首页</Button>
        </Link>
    </div>
}

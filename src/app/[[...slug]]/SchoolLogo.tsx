'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

export default function SchoolLogo({ color }: { color: string }) {
    const language = useLanguage()

    return <Link href={`/${language}`}>
        <div style={{ color }} className="flex items-center">
            <img src="/assets/icon.png" alt="Beijing Academy Logo" className="w-10 h-10 mr-3"/>
            <div className="flex flex-col justify-center transition-colors">
                <p className="m-0 !font-sans">
                    北京中学国际部
                </p>
                <p className="!font-sans truncate m-0 text-xs">
                    Beijing Academy International Division
                </p>
            </div>
        </div>
    </Link>
}

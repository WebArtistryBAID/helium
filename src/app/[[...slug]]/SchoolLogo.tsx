import Link from 'next/link'

export default function SchoolLogo({ color, titleEN, titleZH }: {
    color: string
    titleEN: string
    titleZH: string
}) {
    return <Link href="/">
        <div style={{ color }} className="flex items-center">
            <img src="/assets/icon.png" alt="" className="w-10 h-10 mr-3"/>
            <div className="flex flex-col justify-center transition-colors">
                <p className="m-0 !font-sans">
                    {titleZH}
                </p>
                <p className="!font-sans truncate m-0 text-xs">
                    {titleEN}
                </p>
            </div>
        </div>
    </Link>
}

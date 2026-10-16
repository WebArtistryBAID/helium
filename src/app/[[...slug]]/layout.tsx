import type { ReactNode } from 'react'
import FrontendScrollRestoration from './FrontendScrollRestoration'

export default function FrontendLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <FrontendScrollRestoration/>
            {children}
        </>
    )
}

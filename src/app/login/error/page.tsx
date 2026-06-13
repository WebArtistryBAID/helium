'use client'

import { getLoginTarget } from '@/app/login/login-actions'

export default function PageLoginOnboarding() {

    return <main id="main-content" className="messagebox-container">
        <div className="messagebox">
            <h1 className="mb-1">错误</h1>
            <p className="text-sm mb-5">
                登录时发生了一项错误，请稍后再试。
            </p>
            <button type="button" onClick={async () => {
                location.href = await getLoginTarget('/core')
            }} className="btn">再次尝试
            </button>
        </div>
    </main>
}

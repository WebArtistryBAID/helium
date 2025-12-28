'use client'

import { prefixLink } from '@/app/lib/data-types'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

interface Step {
    name: string | undefined
    content: string | undefined
    link: string | undefined
    linkText: string | undefined
}

export default function ApplicationSteps({ title, steps }: { title: string, steps: (Step | undefined)[] | undefined }) {
    const lang = useLanguage()
    const list: Step[] = (steps ?? []).filter((s): s is Step => !!s)

    const dotClass = (idx: number) => {
        switch (idx) {
            case 0:
                return 'bg-[var(--standard-blue)]'
            case 1:
                return 'bg-[var(--standard-red)]'
            case 2:
                return 'bg-[var(--standard-blue)] md:bg-[var(--standard-red)]'
            case 3:
                return 'bg-[var(--standard-red)] md:bg-[var(--standard-blue)]'
            default:
                return 'bg-[var(--standard-blue)]'
        }
    }

    if (!list.length) return null

    return (
        <section aria-labelledby="application-steps-heading" className="section !mt-24 mx-auto"
                 style={{ maxWidth: '77rem' }}>
            <h2 id="application-steps-heading" className="text-3xl md:text-4xl font-bold !mb-8">
                {title}
            </h2>

            <div aria-label="Application steps" className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8" role="list">
                {list.map((step, idx) =>
                    <div key={idx} className="flex items-center gap-8" role="listitem" tabIndex={0}>
                        <div
                            className={`${dotClass(idx)} rounded-full w-16 h-16 flex-shrink-0 flex justify-center items-center text-white text-2xl`}>
                            {idx + 1}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-1">{step.name}</h3>
                            <div className="!text-lg">{step.content}</div>
                            {step.link && step.linkText ? (
                                <a href={prefixLink(lang, step.link)}
                                   className="inline-block py-1 px-2 font-sans rounded-full bg-[var(--standard-blue)] text-white">
                                    {step.linkText}
                                </a>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

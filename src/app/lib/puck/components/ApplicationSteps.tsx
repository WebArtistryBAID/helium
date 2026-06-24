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
        <section aria-labelledby="application-steps-heading" className="section !mt-16 mx-auto px-5 md:!mt-24 md:px-0"
                 style={{ maxWidth: '77rem' }}>
            <h2 id="application-steps-heading" className="text-3xl md:text-4xl font-bold !mb-8">
                {title}
            </h2>

            <div aria-label="Application steps" className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8" role="list">
                {list.map((step, idx) =>
                    <div key={idx} className="flex items-start gap-4 sm:gap-8" role="listitem">
                        <div
                            className={`${dotClass(idx)} flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg text-white sm:h-16 sm:w-16 sm:text-2xl`}>
                            {idx + 1}
                        </div>
                        <div className="min-w-0">
                            <h3 className="mb-1 text-xl font-bold sm:text-2xl">{step.name}</h3>
                            <div className="!text-lg">{step.content}</div>
                            {step.link && step.linkText ? (
                                <a href={prefixLink(lang, step.link)}
                                   className="mt-2 inline-block max-w-full break-words rounded-full bg-[var(--standard-blue)] px-2 py-1 text-center font-sans text-white">
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

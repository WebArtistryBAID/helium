'use client'

import { Image } from '@/generated/prisma/browser'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'
import Link from 'next/link'
import { prefixLink } from '@/app/lib/data-types'

interface Person {
    id: number
    nameEN: string
    nameZH: string
    title: string
    descriptionEN: string
    descriptionZH: string
    link: string
    image: Image | null
}

export default function People({ people, uploadPrefix }: { people: (Person | null)[] | null, uploadPrefix: string }) {
    people = people ?? []
    const language = useLanguage()

    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {people.map((person, index) => person &&
            <Link href={prefixLink(language, person.link)} key={index} className="flex flex-col items-center">
                <img src={`${uploadPrefix}/${person.image?.sha1}.webp`} alt={person.image?.altText}
                     className="h-48 w-48 rounded-full object-cover object-center mb-3"/>
                <p className="text-xl font-bold">{language === 'zh' ? person.nameZH : person.nameEN}</p>
                <p className="text-lg opacity-90 mb-1">{person.title}</p>
                <p className="opacity-80">{language === 'zh' ? person.descriptionZH : person.descriptionEN}</p>
            </Link>)}
    </div>
}

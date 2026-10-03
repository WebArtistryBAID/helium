'use client'

import type { Image } from '@/generated/prisma/browser'
import ReadMore from './ReadMore'

export type ScatteredImageItem = { image?: Image | null; text?: string; link?: string; linkText?: string }
export type ScatteredQuote = { text?: string; attribution?: string }

function ImageLink({ item }: { item?: ScatteredImageItem }) {
    const link = item?.link?.trim()
    const linkText = item?.linkText?.trim()
    return link && linkText ? <div className="mt-4"><ReadMore text={linkText} to={link} color="#82181a"/></div> : null
}

function ImageItem({ item, uploadPrefix, portrait = false, small = false }: {
    item?: ScatteredImageItem; uploadPrefix?: string; portrait?: boolean; small?: boolean
}) {
    return <div>
        <div className={portrait ? 'aspect-[5/7] w-full' : 'aspect-[20/13] w-full'}>
            {item?.image && <img src={`${uploadPrefix}/${item.image.sha1}.webp`} alt={item.image.altText ?? ''}
                                 className="h-full w-full object-cover"/>}
        </div>
        {item?.text &&
            <p className={`mt-4 whitespace-pre-line break-words font-sans font-bold leading-[1.1] ${small
                ? 'text-base sm:text-2xl lg:text-base'
                : 'text-base sm:text-2xl lg:text-[clamp(1.125rem,2.1vw,2.5rem)]'}`}>{item.text}</p>}
        <ImageLink item={item}/>
    </div>
}

function Quote({ quote }: { quote?: ScatteredQuote }) {
    return <blockquote>
        <p className="whitespace-pre-line break-words font-serif text-lg leading-[1.25] sm:text-3xl lg:text-[clamp(1.125rem,1.65vw,1.875rem)]">{quote?.text}</p>
        {quote?.attribution && <footer
            className="mt-5 whitespace-pre-line break-words font-sans text-sm sm:text-xl lg:text-base">{quote.attribution}</footer>}
    </blockquote>
}

export default function ScatteredImageText({
                                               firstImage,
                                               firstPortrait,
                                               secondPortrait,
                                               lastImage,
                                               firstQuote,
                                               secondQuote,
                                               uploadPrefix
                                           }: {
    firstImage?: ScatteredImageItem; firstPortrait?: ScatteredImageItem; secondPortrait?: ScatteredImageItem;
    lastImage?: ScatteredImageItem; firstQuote?: ScatteredQuote; secondQuote?: ScatteredQuote; uploadPrefix?: string
}) {
    const portraitContents = <>
        <div className="w-[49%] shrink-0 lg:w-full">
            <div className="aspect-[5/7] w-full">
                {secondPortrait?.image && <img src={`${uploadPrefix}/${secondPortrait.image.sha1}.webp`}
                                               alt={secondPortrait.image.altText ?? ''}
                                               className="h-full w-full object-cover"/>}
            </div>
            <div className="lg:hidden"><ImageLink item={secondPortrait}/></div>
        </div>
        {secondPortrait?.text &&
            <p className="w-[49%] whitespace-pre-line break-words font-sans text-base font-bold leading-tight sm:text-2xl lg:mt-4 lg:w-full lg:text-base">{secondPortrait.text}</p>}
    </>
    return <section className="w-full px-[2vw] py-6">
        <div className="grid grid-cols-1 gap-y-16 sm:gap-y-24 lg:grid-cols-[45%_25%_21.5%] lg:gap-x-[4.25%] lg:gap-y-0">
            <ImageItem item={firstImage} uploadPrefix={uploadPrefix}/>
            <div className="lg:pt-[7vw]"><Quote quote={firstQuote}/></div>
            <div className="lg:pt-[5.5vw]"><ImageItem item={firstPortrait} uploadPrefix={uploadPrefix} portrait small/>
            </div>
        </div>
        <div
            className="mt-16 grid grid-cols-1 gap-y-16 sm:mt-24 sm:gap-y-24 lg:mt-[7.5vw] lg:grid-cols-[21.5%_25%_45%] lg:gap-x-[4.25%] lg:gap-y-0">
            <div className="lg:pt-[3.5vw]">
                <div className="flex flex-row-reverse justify-between lg:block">{portraitContents}</div>
                <div className="hidden lg:block"><ImageLink item={secondPortrait}/></div>
            </div>
            <div className="lg:pt-[11.5vw]"><Quote quote={secondQuote}/></div>
            <ImageItem item={lastImage} uploadPrefix={uploadPrefix}/>
        </div>
    </section>
}

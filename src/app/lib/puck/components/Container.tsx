import { ReactNode } from 'react'

export default function Container({ ml, mr, mt, mb, pl, pr, pt, pb, contentWidth, backgroundColor, children }:
                   {
                       ml?: string,
                       mr?: string,
                       mt?: string,
                       mb?: string,
                       pl?: string,
                       pr?: string,
                       pt?: string,
                       pb?: string,
                       contentWidth?: boolean,
                       backgroundColor?: string,
                       children: ReactNode
                   }) {
    return <div className={contentWidth ? 'container' : ''}
                style={{
                    marginLeft: ml,
                    marginRight: mr,
                    marginTop: mt,
                    marginBottom: mb,
                    paddingLeft: pl,
                    paddingRight: pr,
                    paddingTop: pt,
                    paddingBottom: pb,
                    backgroundColor
                }}>
        {children}
    </div>
}

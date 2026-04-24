'use client'

import { SimplifiedContentEntity } from '@/app/lib/data-types'
import Link from 'next/link'
import { EntityType } from '@/generated/prisma/browser'
import If from '@/app/lib/If'

export default function StudioHome({ pages, posts, pendingApprovals, uploadServePath }: {
    pages: SimplifiedContentEntity[],
    posts: SimplifiedContentEntity[],
    pendingApprovals: SimplifiedContentEntity[],
    uploadServePath: string
}) {
    return <>
        <h1 className="text-3xl mb-5">欢迎</h1>

        {(pendingApprovals.length < 1 && posts.length < 1 && pages.length < 1) && <>
            <p>暂时没有任务。</p>
        </>}

        {pendingApprovals.length > 0 && <>
            <h2 className="text-2xl mb-3">待审核内容</h2>
            <div className="grid grid-cols-4 gap-4 mb-5">
                {pendingApprovals.filter(post => post.slug !== 'temporary-slug').map(post => <Link
                    href={post.type === EntityType.page ? `/studio/pages/${post.id}/approval` : `/studio/editor/${post.id}#approval`}
                    className="block rounded-3xl bg-gray-50 hover:bg-gray-100 hover:shadow-lg transition-all duration-100"
                    key={post.id}>
                    <If condition={!!uploadServePath && post.coverImageDraft != null && !!post.coverImageDraft.sha1}>
                        <img src={`${uploadServePath}/${post.coverImageDraft?.sha1}_thumb.webp`}
                             alt={post.coverImageDraft?.altText} className="object-cover w-full rounded-3xl h-48"/>
                    </If>
                    <If condition={!uploadServePath || post.coverImageDraft == null || !post.coverImageDraft.sha1}>
                        <div className="w-full h-32 rounded-3xl from-blue-300 to-blue-500 bg-gradient-to-tr"/>
                    </If>

                    <div className="p-8">
                        <p className="text-xl font-bold mb-1">{post.titleDraftZH}</p>
                        <p className="text-sm secondary">更新于 {post.updatedAt.toLocaleString()}</p>
                    </div>
                </Link>)}
            </div>
        </>}

        {pages.length > 0 && <>
            <h2 className="text-2xl mb-3">近期页面</h2>
            <div className="grid grid-cols-4 gap-4 mb-5">
                {pages.filter(post => post.slug !== 'temporary-slug').map(post => <Link
                    href={post.type === EntityType.page ? `/studio/pages/${post.id}/editor` : `/studio/editor/${post.id}`}
                    className="block rounded-3xl bg-gray-50 hover:bg-gray-100 hover:shadow-lg transition-all duration-100"
                    key={post.id}>
                    <If condition={!!uploadServePath && post.coverImageDraft != null && !!post.coverImageDraft.sha1}>
                        <img src={`${uploadServePath}/${post.coverImageDraft?.sha1}_thumb.webp`}
                             alt={post.coverImageDraft?.altText} className="object-cover w-full rounded-3xl h-48"/>
                    </If>
                    <If condition={!uploadServePath || post.coverImageDraft == null || !post.coverImageDraft.sha1}>
                        <div className="w-full h-32 rounded-3xl from-blue-300 to-blue-500 bg-gradient-to-tr"/>
                    </If>

                    <div className="p-8">
                        <p className="text-xl font-bold mb-1">{post.titleDraftZH}</p>
                        <p className="text-sm secondary">更新于 {post.updatedAt.toLocaleString()}</p>
                    </div>
                </Link>)}
            </div>
        </>}

        {posts.length > 0 && <>
            <h2 className="text-2xl mb-3">近期文章</h2>
            <div className="grid grid-cols-4 gap-4">
                {posts.filter(post => post.slug !== 'temporary-slug').map(post => <Link
                    href={post.type === EntityType.page ? `/studio/pages/${post.id}/editor` : `/studio/editor/${post.id}`}
                    className="block rounded-3xl bg-gray-50 hover:bg-gray-100 hover:shadow-lg transition-all duration-100"
                    key={post.id}>
                    <If condition={!!uploadServePath && post.coverImageDraft != null && !!post.coverImageDraft.sha1}>
                        <img src={`${uploadServePath}/${post.coverImageDraft?.sha1}_thumb.webp`}
                             alt={post.coverImageDraft?.altText} className="object-cover w-full rounded-3xl h-48"/>
                    </If>
                    <If condition={!uploadServePath || post.coverImageDraft == null || !post.coverImageDraft.sha1}>
                        <div className="w-full h-32 rounded-3xl from-blue-300 to-blue-500 bg-gradient-to-tr"/>
                    </If>

                    <div className="p-8">
                        <p className="text-xl font-bold mb-1">{post.titleDraftZH}</p>
                        <p className="text-sm secondary">更新于 {post.updatedAt.toLocaleString()}</p>
                    </div>
                </Link>)}
            </div>
        </>}
    </>
}

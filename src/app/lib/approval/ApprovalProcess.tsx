'use client'

import {
    Alert,
    Button,
    Timeline,
    TimelineBody,
    TimelineContent,
    TimelineItem,
    TimelinePoint,
    TimelineTitle,
    Toast,
    ToastToggle
} from 'flowbite-react'
import { HiPencil } from 'react-icons/hi2'
import If from '@/app/lib/If'
import { EntityType, Role, User } from '@/generated/prisma/browser'
import {
    addApproval,
    ApprovalNotificationRecipients,
    ApprovalThresholds,
    getApprovalNotificationRecipients,
    getApprovalNames,
    meetsThresholds
} from '@/app/lib/approval/approval-actions'
import { HiCheck, HiCloudUpload } from 'react-icons/hi'
import { useEffect, useState } from 'react'
import { getMyUser } from '@/app/login/login-actions'
import { useRouter } from 'next/navigation'
import { HydratedContentEntity, isAligned } from '@/app/lib/data-types'
import { PermissionDeniedDialog, usePermissionDialog } from '@/app/lib/permissions'
import ApprovalNotificationDialog from '@/app/lib/approval/ApprovalNotificationDialog'

export default function ApprovalProcess({
                                            entityType, entityId, entity, doAlign, hasUnresolvedFeedback = false,
                                            showPageNavigation = true
                                        }: {
    entityType: EntityType,
    entityId: number,
    entity: HydratedContentEntity,
    doAlign: () => Promise<void>,
    hasUnresolvedFeedback?: boolean,
    showPageNavigation?: boolean
}) {
    const [ user, setUser ] = useState<User | null>(null)
    const [ loading, setLoading ] = useState(false)
    const [ approvalsThreshold, setApprovalsThreshold ] = useState<ApprovalThresholds>({ admin: 1, editor: 1 })
    const [ approvalsNames, setApprovalNames ] = useState<Record<Role, string[]>>({ admin: [], editor: [], writer: [] })
    const [ publishConfirm, setPublishConfirm ] = useState(false)
    const [ approvalConfirm, setApprovalConfirm ] = useState(false)
    const [ approvalConfirm2, setApprovalConfirm2 ] = useState(false)
    const [ needsApproval, setNeedsApproval ] = useState(false)
    const [ notificationRecipients, setNotificationRecipients ] = useState<ApprovalNotificationRecipients | null>(null)
    const [ notificationError, setNotificationError ] = useState<string | null>(null)
    const [ notificationSuccess, setNotificationSuccess ] = useState<{ count: number } | null>(null)
    const {
        permissionDenied,
        showPermissionDenied,
        closePermissionDenied,
        handlePermissionError
    } = usePermissionDialog()

    const router = useRouter()
    const canWrite = user?.roles.includes(Role.writer) ?? false
    const canApproveAsEditor = user?.roles.includes(Role.editor) ?? false
    const canApproveAsAdmin = user?.roles.includes(Role.admin) ?? false

    useEffect(() => {
        (async () => {
            setUser((await getMyUser())!)
            const state = await meetsThresholds({ entityType, entityId })
            setApprovalsThreshold(state.thresholds)
            setNeedsApproval(!state.editorOk || !state.adminOk)
            setApprovalNames(await getApprovalNames(entityType, entityId))
        })()
    }, [ entityId, entityType ])

    useEffect(() => {
        if (!notificationSuccess) {
            return
        }
        const timeout = setTimeout(() => setNotificationSuccess(null), 5000)
        return () => clearTimeout(timeout)
    }, [ notificationSuccess ])

    async function refresh() {
        const state = await meetsThresholds({ entityType, entityId })
        setApprovalsThreshold(state.thresholds)
        setNeedsApproval(!state.editorOk || !state.adminOk)
        setApprovalNames(await getApprovalNames(entityType, entityId))
    }

    return <>
        <PermissionDeniedDialog show={permissionDenied} onClose={closePermissionDenied}/>
        <div className="fixed bottom-5 right-5 z-[60] max-w-[calc(100vw-2.5rem)]" role="status" aria-live="polite" aria-atomic="true">
            {notificationSuccess && <Toast>
                <div
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500">
                    <HiCheck className="h-5 w-5" aria-hidden="true"/>
                </div>
                <div className="ml-3 text-sm font-normal">已成功发送 {notificationSuccess.count} 条飞书审核通知。</div>
                <ToastToggle aria-label="关闭通知" onDismiss={() => setNotificationSuccess(null)}/>
            </Toast>}
        </div>
        {notificationRecipients && <ApprovalNotificationDialog
            entityType={entityType}
            entityId={entityId}
            initialRecipients={notificationRecipients}
            onClose={() => setNotificationRecipients(null)}
            onSent={count => setNotificationSuccess({ count })}
            onRefresh={async () => {
                await refresh()
                router.refresh()
            }}
            onPermissionError={handlePermissionError}
        />}
        <div className="p-8">
        <h2 className="text-2xl font-bold mb-5">
            审核与发布流程<If condition={entityType === EntityType.page}>: &#34;{entity.titleDraftZH}&#34; 页面</If>
        </h2>
        <Timeline>
            <TimelineItem>
                <TimelinePoint icon={HiPencil}/>
                <TimelineContent>
                    <TimelineTitle>撰稿</TimelineTitle>
                    <TimelineBody>
                        由撰稿员完成内容编写。
                    </TimelineBody>
                    <If condition={entityType === EntityType.page && showPageNavigation}>
                        <div className="flex gap-3">
                            <Button pill color="blue"
                                    onClick={() => router.push(`/studio/pages/${entityId}/preview`)}>查看预览</Button>
                            <Button pill color="alternative"
                                    onClick={() => router.push(`/studio/pages/${entityId}/editor`)}>返回编辑器</Button>
                        </div>
                    </If>
                    <If condition={canWrite && needsApproval}>
                        <div className="mt-3">
                            <Button disabled={loading} pill color="blue" onClick={async () => {
                                if (!canWrite) {
                                    showPermissionDenied()
                                    return
                                }
                                setLoading(true)
                                setNotificationError(null)
                                try {
                                    const recipients = await getApprovalNotificationRecipients({ entityType, entityId })
                                    if (recipients.role) {
                                        setNotificationRecipients(recipients)
                                    }
                                    await refresh()
                                } catch (error) {
                                    if (!handlePermissionError(error)) {
                                        setNotificationError('加载通知对象失败，请稍后重试。')
                                        console.error('Failed to load review recipients:', error)
                                    }
                                } finally {
                                    setLoading(false)
                                }
                            }}>发送飞书审核通知</Button>
                            {notificationError && <Alert color="failure" className="mt-3">{notificationError}</Alert>}
                        </div>
                    </If>
                </TimelineContent>
            </TimelineItem>
            <TimelineItem>
                <TimelinePoint icon={HiPencil}/>
                <TimelineContent>
                    <TimelineTitle>编辑员审核</TimelineTitle>
                    <TimelineBody>
                        <p>由 {approvalsThreshold?.editor} 名编辑员审核。</p>
                        <If condition={approvalsNames.editor.length < 1}>
                            <p className="text-blue-500">暂无编辑员批准，还需要 {approvalsThreshold.editor} 人。</p>
                        </If>
                        <If condition={approvalsNames.editor.length > 0 && approvalsNames.editor.length < (approvalsThreshold?.editor ?? 1)}>
                            <p className="text-blue-500">已经由 {approvalsNames.editor.join('、')} 批准，
                                还需要 {(approvalsThreshold?.editor ?? 1) - approvalsNames.editor.length} 人。</p>
                        </If>
                        <If condition={approvalsNames.editor.length >= (approvalsThreshold?.editor ?? 1)}>
                            <p className="text-green-400">已经由 {approvalsNames.editor.join('、')} 批准，本步骤已完成。</p>
                        </If>
                    </TimelineBody>
                    <If condition={canApproveAsEditor && !approvalsNames.editor.includes(user?.name ?? '')}>
                        <Button disabled={loading} pill color="blue" onClick={async () => {
                            if (!canApproveAsEditor) {
                                showPermissionDenied()
                                return
                            }
                            if (!approvalConfirm) {
                                setApprovalConfirm(true)
                                return
                            }
                            setLoading(true)
                            try {
                                await addApproval({
                                    entityType,
                                    entityId,
                                    role: Role.editor
                                })
                                setApprovalConfirm(false)
                                await refresh()
                                router.refresh()
                            } catch (error) {
                                if (!handlePermissionError(error)) {
                                    console.error('Failed to approve content as editor:', error)
                                }
                            } finally {
                                setLoading(false)
                            }
                        }}>{approvalConfirm ? '确认批准?' : '批准'}</Button>
                    </If>
                </TimelineContent>
            </TimelineItem>
            <TimelineItem>
                <TimelinePoint icon={HiPencil}/>
                <TimelineContent>
                    <TimelineTitle>管理员审核</TimelineTitle>
                    <TimelineBody>
                        <p>由 {approvalsThreshold?.admin} 名管理员审核。</p>
                        <If condition={approvalsNames.admin.length < 1}>
                            <p className="text-blue-500">暂无管理员批准，还需要 {approvalsThreshold.admin} 人。</p>
                        </If>
                        <If condition={approvalsNames.admin.length > 0 && approvalsNames.admin.length < (approvalsThreshold?.admin ?? 1)}>
                            <p className="text-blue-500">已经由 {approvalsNames.admin.join('、')} 批准，
                                还需要 {(approvalsThreshold?.admin ?? 1) - approvalsNames.editor.length} 人。</p>
                        </If>
                        <If condition={approvalsNames.admin.length >= (approvalsThreshold?.admin ?? 1)}>
                            <p className="text-green-400">已经由 {approvalsNames.admin.join('、')} 批准，本步骤已完成。</p>
                        </If>
                    </TimelineBody>
                    <If condition={canApproveAsAdmin && !approvalsNames.admin.includes(user?.name ?? '')}>
                        <Button disabled={loading} pill color="blue" onClick={async () => {
                            if (!canApproveAsAdmin) {
                                showPermissionDenied()
                                return
                            }
                            if (!approvalConfirm2) {
                                setApprovalConfirm2(true)
                                return
                            }
                            setLoading(true)
                            try {
                                await addApproval({
                                    entityType,
                                    entityId,
                                    role: Role.admin
                                })
                                setApprovalConfirm2(false)
                                await refresh()
                                router.refresh()
                            } catch (error) {
                                if (!handlePermissionError(error)) {
                                    console.error('Failed to approve content as admin:', error)
                                }
                            } finally {
                                setLoading(false)
                            }
                        }}>{approvalConfirm2 ? '确认批准?' : '批准'}</Button>
                    </If>
                </TimelineContent>
            </TimelineItem>
            <TimelineItem>
                <TimelinePoint icon={HiCloudUpload}/>
                <TimelineContent>
                    <TimelineTitle>发布</TimelineTitle>
                    <TimelineBody>
                        <If condition={(approvalsNames.editor.length < (approvalsThreshold?.editor ?? 1) || approvalsNames.admin.length < (approvalsThreshold?.admin ?? 1)) && !isAligned(entity)}>
                            <p>完成前序步骤后即可发布。</p>
                        </If>
                        <If condition={approvalsNames.editor.length >= (approvalsThreshold?.editor ?? 1) && approvalsNames.admin.length >= (approvalsThreshold?.admin ?? 1) &&
                            !isAligned(entity)}>
                            <p className="mb-3">{hasUnresolvedFeedback
                                ? '有尚未解决的评论或建议，暂无法发表。'
                                : '内容已审核完成，可以发表。'}</p>
                            <If condition={canApproveAsAdmin}>
                                <Button disabled={loading || hasUnresolvedFeedback} pill
                                        color={hasUnresolvedFeedback ? 'gray' : 'blue'}
                                        onClick={async () => {
                                            if (hasUnresolvedFeedback) return
                                            if (!canApproveAsAdmin) {
                                                showPermissionDenied()
                                                return
                                            }
                                            if (!publishConfirm) {
                                                setPublishConfirm(true)
                                                return
                                            }
                                            setLoading(true)
                                            try {
                                                await doAlign()
                                                await refresh()
                                                router.refresh()
                                            } catch (error) {
                                                if (!handlePermissionError(error)) {
                                                    console.error('Failed to publish content:', error)
                                                }
                                            } finally {
                                                setLoading(false)
                                            }
                                        }}>{publishConfirm ? '确认发布?' : '发布'}</Button>
                            </If>
                        </If>
                        <If condition={isAligned(entity)}>
                            <p>内容已成功发布! 自动更新可能需要最多一小时。</p>
                        </If>
                    </TimelineBody>
                </TimelineContent>
            </TimelineItem>
        </Timeline>
    </div>
    </>
}

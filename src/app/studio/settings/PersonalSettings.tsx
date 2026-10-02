'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    Accordion,
    AccordionContent,
    AccordionPanel,
    AccordionTitle,
    Clipboard,
    TabItem,
    Tabs,
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Label,
    TextInput,
    Select,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableRow,
    TableCell
} from 'flowbite-react'
import type { PersonalTokenSummary } from '@/app/lib/mcp/contracts'
import FeishuSettings from '@/app/studio/settings/feishu/FeishuSettings'
import { createPersonalToken, revokePersonalToken } from '@/app/studio/settings/personal-settings-actions'

export default function PersonalSettings({ isFeishuLinked, tokens, result, endpoint }: {
    isFeishuLinked: boolean
    tokens: PersonalTokenSummary[]
    result: { success?: string; error?: string }
    endpoint: string
}) {
    const router = useRouter()
    const [ name, setName ] = useState('')
    const [ expiration, setExpiration ] = useState('90')
    const [ showCreate, setShowCreate ] = useState(false)
    const [ secret, setSecret ] = useState<string | null>(null)
    const [ feedback, setFeedback ] = useState('')
    const [ error, setError ] = useState('')
    const [ pending, startTransition ] = useTransition()
    const workbuddyConfiguration = `{
  "mcpServers": {
    "helium": {
      "type": "streamableHttp",
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer (在此处填写您生成的 MCP 密码)"
      }
    }
  }
}`
    function generate() {
        setError('')
        setFeedback('')
        startTransition(async () => {
            try {
                const expiresAt = expiration === 'never' ? null
                    : new Date(Date.now() + Number(expiration) * 86400000).toISOString()
                const created = await createPersonalToken({ name, expiresAt })
                setSecret(created.token)
                setShowCreate(false)
                setName('')
            } catch {
                setError('MCP 密码生成失败，请重试。')
            }
        })
    }

    function revoke(tokenId: string) {
        setError('')
        setFeedback('')
        startTransition(async () => {
            try {
                await revokePersonalToken({ tokenId })
                setSecret(null)
                setFeedback('MCP 密码已撤销。')
                router.refresh()
            } catch {
                setError('MCP 密码撤销失败，请重试。')
            }
        })
    }

    async function copySecret() {
        if (!secret) return
        try {
            await navigator.clipboard.writeText(secret)
            setFeedback('MCP 密码已复制。')
        } catch {
            setError('复制失败，请选择 MCP 密码后手动复制。')
        }
    }

    return <div className="p-8 lg:p-16 space-y-10 max-w-6xl">
        <h1 className="text-2xl">设置</h1>
        <FeishuSettings isLinked={isFeishuLinked} result={result} embedded/>
        <section aria-labelledby="mcp-tokens-title" className="space-y-6">
            <h2 id="mcp-tokens-title" className="text-xl">MCP 配置</h2>
            <div className="rounded-3xl bg-gray-50 p-8 space-y-6">
                <p className="secondary">Helium 支持通过 MCP 服务器连接您喜爱的第三方智能体 (agent) 工具，进而简化您的工作流。<a
                    className="text-blue-500 hover:underline"
                    href="https://modelcontextprotocol.io/docs/getting-started/intro">什么是
                    MCP 服务器?</a></p>

                <Accordion collapseAll className="rounded-3xl border-0 divide-y-0 bg-white">
                    <AccordionPanel>
                        <AccordionTitle
                            className="cursor-pointer first:rounded-3xl">如何配置我的智能体?</AccordionTitle>
                        <AccordionContent className="rounded-3xl">
                            <p className="mb-4 secondary break-all">MCP 地址: {endpoint}</p>
                            <Tabs aria-label="智能体配置" variant="pills" theme={{
                                tablist: {
                                    variant: { pills: 'flex-wrap gap-2 space-x-0' },
                                    tabitem: {
                                        base: 'cursor-pointer disabled:cursor-not-allowed rounded-full px-5 py-2.5',
                                        variant: {
                                            pills: {
                                                active: {
                                                    on: 'rounded-full bg-blue-600 text-white',
                                                    off: 'rounded-full bg-gray-100 hover:bg-gray-200'
                                                }
                                            }
                                        }
                                    }
                                }
                            }}>
                                <TabItem title="ChatGPT">
                                    <div className="space-y-4">
                                        <p>您也可以查看 <a className="text-blue-500 hover:underline"
                                                           href="https://learn.chatgpt.com/docs/extend/mcp">ChatGPT
                                            教程</a>。</p>
                                        <ol className="list-decimal space-y-2 pl-5">
                                            <li>在开始使用前，您必须先生成一个 MCP 密码。</li>
                                            <li>打开 ChatGPT 应用程序中的 Settings → Plugins → Add → Add MCP Server。
                                            </li>
                                            <li>"名称" 请填写 "Helium"。"类型" 请选择 "Streamable
                                                HTTP"。链接请输入 {endpoint}。"Bearer token
                                                env var" 请留空。Header 请填写 "Authorization"，对应为 "Bearer (在此处填写您生成的
                                                MCP 密码)"。
                                            </li>
                                        </ol>

                                    </div>
                                </TabItem>

                                <TabItem title="Claude Desktop">
                                    <div className="space-y-4">
                                        <p>您也可以查看 <a className="text-blue-500 hover:underline"
                                                           href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp">Claude
                                            教程</a>。</p>
                                        <ol className="list-decimal space-y-2 pl-5">
                                            <li>在开始使用前，您必须先生成一个 MCP 密码。</li>
                                            <li>打开 Claude Desktop 中的 Customize → Connectors → Add → Add custom
                                                connector。
                                            </li>
                                            <li>将名称填为 "Helium"、URL 填写为 {endpoint}。</li>
                                            <li>在 Authentication 中，选择 No sign in。</li>
                                            <li>在 Request headers 中，添加一条 Header，Key 填写 "Authorization"，Value 填写
                                                "Bearer (在此处填写您生成的 MCP 密码)"。
                                            </li>
                                            <li>添加并启用 Helium。</li>
                                        </ol>
                                    </div>
                                </TabItem>

                                <TabItem title="WorkBuddy">
                                    <div className="space-y-4">
                                        <p>您也可以查看 <a className="text-blue-500 hover:underline"
                                                           href="https://www.workbuddy.ai/docs/zh/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/MCP-Guide">WorkBuddy
                                            教程</a>。</p>
                                        <ol className="list-decimal space-y-2 pl-5">
                                            <li>在开始使用前，您必须先生成一个 MCP 密码。</li>
                                            <li>打开 WorkBuddy 中的 设置 → 插件 → MCP 服务器 → 配置
                                                MCP。选择用户级配置，跨项目使用。
                                            </li>
                                            <li>在配置编辑器中粘贴以下内容。</li>
                                        </ol>
                                        <div className="space-y-2">
                                            <pre
                                                className="overflow-x-auto rounded-3xl bg-gray-100 p-5 text-sm text-gray-900"><code>{workbuddyConfiguration}</code></pre>
                                            <Clipboard valueToCopy={workbuddyConfiguration} label="复制配置"
                                                       className="w-auto cursor-pointer rounded-full"/>
                                        </div>
                                    </div>
                                </TabItem>
                            </Tabs>
                        </AccordionContent>
                    </AccordionPanel>
                </Accordion>

                <Button className="cursor-pointer disabled:cursor-not-allowed" pill color="blue" onClick={() => {
                    setError('')
                    setFeedback('')
                    setName('')
                    setExpiration('90')
                    setShowCreate(true)
                }}>生成 MCP 密码</Button>
                {error && !showCreate && <p role="alert" className="text-red-600">{error}</p>}
                {feedback && !secret && <p role="status" className="text-green-700">{feedback}</p>}
                {tokens.length > 0 && <div className="overflow-x-auto rounded-3xl bg-white">
                    <Table striped theme={{
                        root: { shadow: 'hidden' },
                        head: { cell: { base: 'bg-gray-100 px-6 py-4' } },
                        body: { cell: { base: 'px-6 py-4' } }
                    }}>
                        <caption className="sr-only">当前账号的 MCP 密码</caption>
                        <TableHead>
                            <TableHeadCell>名称</TableHeadCell>
                            <TableHeadCell>状态</TableHeadCell>
                            <TableHeadCell>到期时间</TableHeadCell>
                            <TableHeadCell>最近使用</TableHeadCell>
                            <TableHeadCell>操作</TableHeadCell>
                        </TableHead>
                        <TableBody>{tokens.map(token => {
                            const expired = token.expiresAt != null && new Date(token.expiresAt) <= new Date()
                            return <TableRow key={token.id}>
                                <TableCell
                                    className="font-medium text-gray-900">{token.name}</TableCell>
                                <TableCell>{token.revokedAt ? '已撤销' : expired ? '已过期' : '有效'}</TableCell>
                                <TableCell>{token.expiresAt ? new Date(token.expiresAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '长期有效'}</TableCell>
                                <TableCell>{token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '尚未使用'}</TableCell>
                                <TableCell>{!token.revokedAt &&
                                    <Button className="cursor-pointer disabled:cursor-not-allowed" pill size="xs"
                                            color="red"
                                            disabled={pending} onClick={() => revoke(token.id)}
                                            aria-label={`撤销 ${token.name}`}>撤销</Button>}</TableCell>
                            </TableRow>
                        })}</TableBody>
                    </Table>
                </div>}
                <Modal className="[&_button:enabled]:cursor-pointer [&_button:disabled]:cursor-not-allowed"
                       show={showCreate} size="md" popup onClose={() => {
                    if (!pending) setShowCreate(false)
                }}>
                    <ModalHeader/>
                    <ModalBody>
                        <form id="create-personal-token" className="space-y-6" onSubmit={event => {
                            event.preventDefault()
                            if (!pending && name.trim()) generate()
                        }}>
                            <h3 className="text-xl font-bold">生成 MCP 密码</h3>
                            <div>
                                <div className="mb-2 block">
                                    <Label htmlFor="token-name">MCP 密码名称</Label>
                                </div>
                                <TextInput id="token-name" value={name} onChange={event => setName(event.target.value)}
                                           required maxLength={100} placeholder="我的智能体" disabled={pending}/>
                            </div>
                            <div>
                                <div className="mb-2 block">
                                    <Label htmlFor="token-expiration">有效期</Label>
                                </div>
                                <Select id="token-expiration" value={expiration} disabled={pending}
                                        onChange={event => setExpiration(event.target.value)}>
                                    <option value="30">30 天</option>
                                    <option value="90">90 天</option>
                                    <option value="365">365 天</option>
                                    <option value="never">长期有效</option>
                                </Select>
                            </div>
                            {error && <p role="alert" className="text-red-600">{error}</p>}
                        </form>
                    </ModalBody>
                    <ModalFooter className="border-0">
                        <Button className="cursor-pointer disabled:cursor-not-allowed" pill color="blue" type="submit"
                                form="create-personal-token" disabled={pending || !name.trim()}>确认</Button>
                        <Button className="cursor-pointer disabled:cursor-not-allowed" pill color="alternative"
                                disabled={pending}
                                onClick={() => setShowCreate(false)}>取消</Button>
                    </ModalFooter>
                </Modal>
                <Modal className="[&_button:enabled]:cursor-pointer [&_button:disabled]:cursor-not-allowed"
                       show={secret !== null} size="md" popup dismissible={false} onClose={() => {
                }}>
                    <ModalBody className="pt-6">
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold">复制 MCP 密码</h3>
                            <p className="text-sm">为保安全，MCP 密码只会显示一次。请您复制并保存。</p>
                            <code
                                className="block break-all rounded-3xl bg-gray-100 p-5 text-sm select-all">{secret}</code>
                            {error && <p role="alert" className="text-red-600">{error}</p>}
                            {feedback && <p role="status" className="text-green-700">{feedback}</p>}
                        </div>
                    </ModalBody>
                    <ModalFooter className="border-0">
                        <Button className="cursor-pointer disabled:cursor-not-allowed" pill color="blue"
                                onClick={copySecret}>复制</Button>
                        <Button className="cursor-pointer disabled:cursor-not-allowed" pill color="alternative"
                                onClick={() => {
                                    setSecret(null)
                                    setError('')
                                    setFeedback('')
                                    router.refresh()
                                }}>确认</Button>
                    </ModalFooter>
                </Modal>
            </div>
        </section>
    </div>
}

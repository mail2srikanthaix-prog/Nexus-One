'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Send,
  Loader2,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  List,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AgentData, AgentsResponse } from '@/lib/types'

const statusColors: Record<string, string> = {
  idle: 'bg-gray-500',
  thinking: 'bg-cyan-500 animate-pulse',
  executing: 'bg-emerald-500 animate-pulse',
  reporting: 'bg-amber-500',
  error: 'bg-red-500',
}

const statusBadge: Record<string, string> = {
  idle: 'bg-gray-500/20 text-gray-400',
  thinking: 'bg-cyan-500/20 text-cyan-400',
  executing: 'bg-emerald-500/20 text-emerald-400',
  reporting: 'bg-amber-500/20 text-amber-400',
  error: 'bg-red-500/20 text-red-400',
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Parse capabilities — may be an array (from API) or JSON/comma-separated string */
function parseCapabilities(capabilities?: string | string[]): string[] {
  if (!capabilities) return []
  if (Array.isArray(capabilities)) return capabilities.map((s: string) => s.trim()).filter(Boolean)
  try {
    const parsed = JSON.parse(capabilities)
    if (Array.isArray(parsed)) return parsed.map((s: string) => s.trim())
    return []
  } catch {
    return capabilities.split(',').map((s: string) => s.trim()).filter(Boolean)
  }
}

export function AgentsView() {
  const [data, setData] = useState<AgentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [fetchKey, setFetchKey] = useState(0)
  const [actionsExpanded, setActionsExpanded] = useState(false)
  const [agentListOpen, setAgentListOpen] = useState(true) // desktop: open by default
  const [mobileListOpen, setMobileListOpen] = useState(false) // mobile: closed by default

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setFetchKey((k) => k + 1)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/agents')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError('Failed to load agents. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchKey])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSendChat = async () => {
    if (!chatInput.trim() || !selectedAgent) return
    const msg = chatInput.trim()
    setChatInput('')
    const userMsg: ChatMessage = { role: 'user', content: msg }
    setChatMessages((prev) => [...prev, userMsg])
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          agentType: selectedAgent.type,
          history: chatMessages,
        }),
      })
      if (!res.ok) throw new Error('Chat request failed')
      const data = await res.json()
      const assistantMsg: ChatMessage = { role: 'assistant', content: data.response || 'No response' }
      setChatMessages((prev) => [...prev, assistantMsg])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Could not get response.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleSelectAgent = (agent: AgentData) => {
    setSelectedAgent(agent)
    setChatMessages([])
    setMobileListOpen(false) // Close mobile list after selection
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-400">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm text-gray-400">Loading agents...</span>
        </div>
      </div>
    )
  }

  const totalActions = data.agents?.reduce((sum, a) => sum + (a.actions?.length || 0), 0) || 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Agent Status Overview Bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-2 sm:px-6 sm:py-3">
        <span className="hidden text-xs font-medium text-gray-400 sm:inline">Agent Status</span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {Object.entries(data.statusCounts || {}).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${statusColors[status] || 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">
                <span className="font-mono text-gray-200">{count as number}</span>{' '}
                <span className="hidden sm:inline">{status}</span>
              </span>
            </div>
          ))}
        </div>
        <Badge className="ml-auto border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400 sm:text-xs">
          Root Orchestrator Active
        </Badge>
      </div>

      {/* Main Content - Full height flex area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop: Agent List Sidebar */}
        <AnimatePresence initial={false}>
          {agentListOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="hidden shrink-0 overflow-hidden border-r border-[#1e1e2e] md:block"
            >
              <div className="flex h-full flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-[#1e1e2e] px-4 py-2">
                  <h3 className="text-xs font-medium text-gray-500">
                    Available Agents ({data.agents?.length || 0})
                  </h3>
                  <button
                    onClick={() => setAgentListOpen(false)}
                    className="rounded p-0.5 text-gray-500 transition-colors hover:bg-[#16161f] hover:text-gray-300"
                    aria-label="Collapse agent list"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2 p-3">
                    {data.agents?.map((agent) => {
                      const capabilities = parseCapabilities(agent.capabilities)
                      const isSelected = selectedAgent?.id === agent.id
                      return (
                        <motion.div
                          key={agent.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleSelectAgent(agent)}
                          className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                            isSelected
                              ? 'border-emerald-500/40 bg-emerald-500/10'
                              : 'border-[#1e1e2e] bg-[#111118] hover:border-[#2a2a3e] hover:bg-[#16161f]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 shrink-0 text-cyan-400" />
                              <span className="truncate text-sm font-medium text-gray-200">{agent.name}</span>
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge[agent.status] || 'bg-gray-500/20 text-gray-400'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusColors[agent.status] || 'bg-gray-500'}`} />
                              {agent.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{agent.type}</p>
                          {agent.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-400">{agent.description}</p>
                          )}
                          {capabilities.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {capabilities.slice(0, 3).map((cap) => (
                                <Badge key={cap} variant="outline" className="border-[#2a2a3e] text-[9px] text-gray-500">
                                  {cap}
                                </Badge>
                              ))}
                              {capabilities.length > 3 && (
                                <Badge variant="outline" className="border-[#2a2a3e] text-[9px] text-gray-500">
                                  +{capabilities.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          {agent.lastAction && (
                            <p className="mt-1.5 truncate text-[10px] text-gray-500">
                              Last: {agent.lastAction}
                            </p>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Agent List Toggle (Desktop) */}
        {!agentListOpen && (
          <div className="hidden shrink-0 md:block">
            <button
              onClick={() => setAgentListOpen(true)}
              className="flex h-full items-center gap-1 border-r border-[#1e1e2e] bg-[#0d0d14] px-2 text-gray-500 transition-colors hover:bg-[#16161f] hover:text-gray-300"
              aria-label="Expand agent list"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mobile: Agent List Overlay */}
        <AnimatePresence>
          {mobileListOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setMobileListOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="fixed inset-y-0 left-0 z-50 w-[300px] overflow-hidden border-r border-[#1e1e2e] bg-[#0d0d14] md:hidden"
              >
                <div className="flex h-full flex-col">
                  <div className="flex shrink-0 items-center justify-between border-b border-[#1e1e2e] px-4 py-2">
                    <h3 className="text-xs font-medium text-gray-500">
                      Agents ({data.agents?.length || 0})
                    </h3>
                    <button
                      onClick={() => setMobileListOpen(false)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-[#16161f] hover:text-white"
                      aria-label="Close agent list"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 p-3">
                      {data.agents?.map((agent) => {
                        const capabilities = parseCapabilities(agent.capabilities)
                        const isSelected = selectedAgent?.id === agent.id
                        return (
                          <div
                            key={agent.id}
                            onClick={() => handleSelectAgent(agent)}
                            className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                              isSelected
                                ? 'border-emerald-500/40 bg-emerald-500/10'
                                : 'border-[#1e1e2e] bg-[#111118] hover:border-[#2a2a3e] hover:bg-[#16161f]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 shrink-0 text-cyan-400" />
                                <span className="truncate text-sm font-medium text-gray-200">{agent.name}</span>
                              </div>
                              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge[agent.status] || 'bg-gray-500/20 text-gray-400'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${statusColors[agent.status] || 'bg-gray-500'}`} />
                                {agent.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{agent.type}</p>
                            {agent.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-400">{agent.description}</p>
                            )}
                            {capabilities.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {capabilities.slice(0, 3).map((cap) => (
                                  <Badge key={cap} variant="outline" className="border-[#2a2a3e] text-[9px] text-gray-500">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Right: Chat Panel */}
        <div className="flex min-h-0 flex-1 flex-col">
          {selectedAgent ? (
            <>
              {/* Chat Header */}
              <div className="flex shrink-0 items-center gap-2 border-b border-[#1e1e2e] bg-[#111118] px-3 py-2 sm:px-4 sm:py-3">
                {/* Mobile: agent list toggle */}
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-[#16161f] hover:text-gray-200 md:hidden"
                  onClick={() => setMobileListOpen(true)}
                  aria-label="Show agent list"
                >
                  <List className="h-4 w-4" />
                </button>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
                  <Bot className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{selectedAgent.name}</p>
                  <p className="truncate text-xs text-gray-500">{selectedAgent.type} agent &bull; {selectedAgent.status}</p>
                </div>
                <Badge className={`hidden shrink-0 sm:inline-flex ${statusBadge[selectedAgent.status] || 'bg-gray-500/20 text-gray-400'}`}>
                  {selectedAgent.status}
                </Badge>
              </div>

              {/* Messages */}
              <ScrollArea className="min-h-0 flex-1 p-3 sm:p-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center sm:py-12">
                      <MessageSquare className="mb-3 h-8 w-8 text-gray-600" />
                      <p className="text-sm text-gray-500">Start a conversation with {selectedAgent.name}</p>
                      <p className="mt-1 text-xs text-gray-600">Ask questions about your organization, get insights, or request actions.</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2.5 sm:max-w-[80%] sm:px-4 ${
                          msg.role === 'user'
                            ? 'bg-emerald-500/20 text-emerald-100'
                            : 'bg-[#16161f] text-gray-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-lg bg-[#16161f] px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                        <span className="text-sm text-gray-400">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="shrink-0 border-t border-[#1e1e2e] p-3 sm:p-4">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !chatLoading && handleSendChat()}
                    placeholder={`Ask ${selectedAgent.name} anything...`}
                    className="border-[#2a2a3e] bg-[#111118] text-gray-200 placeholder:text-gray-600"
                    disabled={chatLoading}
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="shrink-0 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
              {/* Mobile: agent list toggle */}
              <button
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#16161f] text-gray-400 transition-colors hover:bg-[#1e1e2e] hover:text-gray-200 md:hidden"
                onClick={() => setMobileListOpen(true)}
                aria-label="Show agent list"
              >
                <List className="h-5 w-5" />
              </button>
              <Bot className="mb-4 h-12 w-12 text-gray-600" />
              <p className="text-lg font-medium text-gray-400">Select an Agent</p>
              <p className="mt-1 text-sm text-gray-600">
                {agentListOpen
                  ? 'Choose an agent from the list to start a conversation.'
                  : 'Open the agent list to start a conversation.'}
              </p>
              {!agentListOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 hidden border-[#2a2a3e] text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400 md:inline-flex"
                  onClick={() => setAgentListOpen(true)}
                >
                  <List className="mr-2 h-4 w-4" />
                  Show Agents
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Collapsible Actions Log */}
      {totalActions > 0 && (
        <div className="flex shrink-0 flex-col border-t border-[#1e1e2e] bg-[#0d0d14]">
          <button
            onClick={() => setActionsExpanded(!actionsExpanded)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-[#16161f] sm:px-6"
            aria-expanded={actionsExpanded}
            aria-label="Toggle actions log"
          >
            <span className="text-xs font-medium text-gray-500">Recent Actions</span>
            <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-500">
              {totalActions}
            </Badge>
            {actionsExpanded ? (
              <ChevronDown className="ml-auto h-3.5 w-3.5 text-gray-500" />
            ) : (
              <ChevronUp className="ml-auto h-3.5 w-3.5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {actionsExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="max-h-40 overflow-y-auto sm:max-h-48">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-xs">
                      <thead>
                        <tr className="border-b border-[#1e1e2e] text-gray-500">
                          <th className="px-4 py-1.5 text-left font-medium sm:px-6">Agent</th>
                          <th className="px-4 py-1.5 text-left font-medium sm:px-6">Type</th>
                          <th className="px-4 py-1.5 text-left font-medium sm:px-6">Title</th>
                          <th className="px-4 py-1.5 text-left font-medium sm:px-6">Status</th>
                          <th className="hidden px-4 py-1.5 text-left font-medium sm:table-cell sm:px-6">Confidence</th>
                          <th className="px-4 py-1.5 text-left font-medium sm:px-6">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.agents?.flatMap((agent) =>
                          (agent.actions || []).map((action) => (
                            <tr key={action.id} className="border-b border-[#1e1e2e]/50">
                              <td className="px-4 py-2 text-gray-300 sm:px-6">{agent.name}</td>
                              <td className="px-4 py-2 text-gray-400 sm:px-6">{action.type}</td>
                              <td className="max-w-[200px] truncate px-4 py-2 text-gray-300 sm:px-6">{action.title}</td>
                              <td className="px-4 py-2 sm:px-6">
                                <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-400">
                                  {action.status}
                                </Badge>
                              </td>
                              <td className="hidden px-4 py-2 font-mono text-gray-400 sm:table-cell sm:px-6">
                                {action.confidence ? `${Math.round(action.confidence * 100)}%` : '-'}
                              </td>
                              <td className="px-4 py-2 text-gray-500 sm:px-6">
                                {new Date(action.createdAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                        ).slice(0, 10)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Bot, Send, Loader2, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

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

export function AgentsView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
      const data = await res.json()
      const assistantMsg: ChatMessage = { role: 'assistant', content: data.response || 'No response' }
      setChatMessages((prev) => [...prev, assistantMsg])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Could not get response.' }])
    } finally {
      setChatLoading(false)
    }
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

  return (
    <div className="flex h-full flex-col">
      {/* Agent Status Overview */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-gray-400">Agent Status</span>
          <div className="flex items-center gap-3">
            {Object.entries(data.statusCounts || {}).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${statusColors[status] || 'bg-gray-500'}`} />
                <span className="text-xs text-gray-400">
                  <span className="font-mono text-gray-200">{count as number}</span> {status}
                </span>
              </div>
            ))}
          </div>
          <Badge className="ml-auto border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-400">
            Root Orchestrator Active
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Agent Grid */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-[#1e1e2e] p-4">
          <h3 className="mb-3 text-xs font-medium text-gray-500">Available Agents</h3>
          <div className="space-y-2">
            {data.agents?.map((agent: any) => (
              <motion.div
                key={agent.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setSelectedAgent(agent)
                  setChatMessages([])
                }}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  selectedAgent?.id === agent.id
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-[#1e1e2e] bg-[#111118] hover:border-[#2a2a3e] hover:bg-[#16161f]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-gray-200">{agent.name}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge[agent.status] || 'bg-gray-500/20 text-gray-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusColors[agent.status] || 'bg-gray-500'}`} />
                    {agent.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{agent.type}</p>
                {agent.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400">{agent.description}</p>
                )}
                {agent.capabilities && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {agent.capabilities.split(',').map((cap: string) => (
                      <Badge key={cap} variant="outline" className="border-[#2a2a3e] text-[9px] text-gray-500">
                        {cap.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
                {agent.lastAction && (
                  <p className="mt-1.5 truncate text-[10px] text-gray-500">
                    Last: {agent.lastAction}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Chat Panel */}
        <div className="flex flex-1 flex-col">
          {selectedAgent ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-[#1e1e2e] bg-[#111118] px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20">
                  <Bot className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{selectedAgent.name}</p>
                  <p className="text-xs text-gray-500">{selectedAgent.type} agent • {selectedAgent.status}</p>
                </div>
                <Badge className={`ml-auto ${statusBadge[selectedAgent.status] || 'bg-gray-500/20 text-gray-400'}`}>
                  {selectedAgent.status}
                </Badge>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
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
                        className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
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
              <div className="border-t border-[#1e1e2e] p-4">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                    placeholder={`Ask ${selectedAgent.name} anything...`}
                    className="border-[#2a2a3e] bg-[#111118] text-gray-200 placeholder:text-gray-600"
                    disabled={chatLoading}
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Bot className="mb-4 h-12 w-12 text-gray-600" />
              <p className="text-lg font-medium text-gray-400">Select an Agent</p>
              <p className="mt-1 text-sm text-gray-600">Choose an agent from the list to start a conversation.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Actions Log */}
      <div className="max-h-48 overflow-y-auto border-t border-[#1e1e2e] bg-[#0d0d14]">
        <div className="px-6 py-2">
          <h3 className="text-xs font-medium text-gray-500">Recent Actions</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e1e2e] text-gray-500">
              <th className="px-6 py-1.5 text-left font-medium">Agent</th>
              <th className="px-6 py-1.5 text-left font-medium">Type</th>
              <th className="px-6 py-1.5 text-left font-medium">Title</th>
              <th className="px-6 py-1.5 text-left font-medium">Status</th>
              <th className="px-6 py-1.5 text-left font-medium">Confidence</th>
              <th className="px-6 py-1.5 text-left font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {data.agents?.flatMap((agent: any) =>
              (agent.actions || []).map((action: any) => (
                <tr key={action.id} className="border-b border-[#1e1e2e]/50">
                  <td className="px-6 py-2 text-gray-300">{agent.name}</td>
                  <td className="px-6 py-2 text-gray-400">{action.type}</td>
                  <td className="px-6 py-2 text-gray-300">{action.title}</td>
                  <td className="px-6 py-2">
                    <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-400">
                      {action.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-2 font-mono text-gray-400">
                    {action.confidence ? `${Math.round(action.confidence * 100)}%` : '-'}
                  </td>
                  <td className="px-6 py-2 text-gray-500">
                    {new Date(action.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            ).slice(0, 10)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

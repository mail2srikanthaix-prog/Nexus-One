'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Send, Loader2, Crown, DollarSign, Cpu, Settings, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

interface BoardMember {
  type: string
  name: string
  role: string
  icon: React.ElementType
  color: string
  bgColor: string
}

const boardMembers: BoardMember[] = [
  { type: 'ceo', name: 'Atlas', role: 'CEO Agent', icon: Crown, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  { type: 'cfo', name: 'Meridian', role: 'CFO Agent', icon: DollarSign, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  { type: 'cto', name: 'Nexus', role: 'CTO Agent', icon: Cpu, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  { type: 'coo', name: 'Vertex', role: 'COO Agent', icon: Settings, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  { type: 'cro', name: 'Summit', role: 'CRO Agent', icon: TrendingUp, color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
]

const presetScenarios = [
  'What if we cut engineering budget by 15%?',
  'Should we acquire StartupX?',
  'Expand to European market?',
]

interface AgentResponse {
  member: BoardMember
  response: string
  loading: boolean
}

export function BoardroomView() {
  const [scenario, setScenario] = useState('')
  const [responses, setResponses] = useState<AgentResponse[]>([])
  const [isDebating, setIsDebating] = useState(false)
  const [consensus, setConsensus] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [responses])

  const startDebate = async (question: string) => {
    if (!question.trim()) return
    setScenario(question)
    setResponses(boardMembers.map((m) => ({ member: m, response: '', loading: true })))
    setConsensus(null)
    setIsDebating(true)

    // Get responses from each agent sequentially
    for (let i = 0; i < boardMembers.length; i++) {
      const member = boardMembers[i]
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `As the ${member.role}, provide your strategic perspective on this question: "${question}". Include your recommendation, confidence level, and key concerns.`,
            agentType: member.type,
            history: [],
          }),
        })
        if (!res.ok) throw new Error('Chat request failed')
        const data = await res.json()

        setResponses((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, response: data.response || 'No response', loading: false } : r
          )
        )
      } catch {
        setResponses((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, response: 'Error: Could not get response.', loading: false } : r
          )
        )
      }
    }

    // Generate consensus
    try {
      const allResponses = await Promise.resolve(
        boardMembers.map((m) => m.role).join(', ')
      )
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on the board discussion about "${question}", provide a concise consensus summary with key agreements, disagreements, and the recommended course of action. The board members are: ${allResponses}.`,
          agentType: 'ceo',
          history: [],
        }),
      })
      if (!res.ok) throw new Error('Chat request failed')
      const data = await res.json()
      setConsensus(data.response || 'Consensus could not be reached.')
    } catch {
      setConsensus('Error generating consensus.')
    }

    setIsDebating(false)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] p-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <Users className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Boardroom</h1>
              <p className="text-xs text-gray-500">Virtual executive simulation for strategic decisions</p>
            </div>
          </div>

          {/* Scenario Input */}
          <div className="mt-4 flex gap-2">
            <Textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="Enter a strategic question for the board..."
              className="min-h-[44px] resize-none border-[#2a2a3e] bg-[#111118] text-gray-200 placeholder:text-gray-600"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  startDebate(scenario)
                }
              }}
            />
            <Button
              onClick={() => startDebate(scenario)}
              disabled={isDebating || !scenario.trim()}
              className="shrink-0 bg-amber-500/20 px-6 text-amber-400 hover:bg-amber-500/30"
            >
              {isDebating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Preset Scenarios */}
          <div className="mt-3 flex flex-wrap gap-2">
            {presetScenarios.map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant="outline"
                className="h-7 border-[#2a2a3e] text-xs text-gray-400 hover:border-amber-500/30 hover:text-amber-400"
                onClick={() => setScenario(preset)}
                disabled={isDebating}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Boardroom Table */}
      <div className="mx-auto w-full max-w-4xl p-6">
        {/* Board Members Visual */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
          {boardMembers.map((member) => {
            const Icon = member.icon
            const hasResponded = responses.find((r) => r.member.type === member.type)?.response
            const isCurrentlyLoading = responses.find((r) => r.member.type === member.type)?.loading

            return (
              <motion.div
                key={member.type}
                whileHover={{ scale: 1.05 }}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  hasResponded
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : isCurrentlyLoading
                      ? 'border-cyan-500/30 bg-cyan-500/5'
                      : 'border-[#1e1e2e] bg-[#111118]'
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${member.bgColor}`}>
                  {isCurrentlyLoading ? (
                    <Loader2 className={`h-5 w-5 animate-spin ${member.color}`} />
                  ) : (
                    <Icon className={`h-5 w-5 ${member.color}`} />
                  )}
                </div>
                <p className="text-xs font-medium text-white">{member.name}</p>
                <p className="text-[10px] text-gray-500">{member.role}</p>
                {hasResponded && (
                  <Badge className="bg-emerald-500/20 text-[9px] text-emerald-400">Responded</Badge>
                )}
                {isCurrentlyLoading && (
                  <Badge className="bg-cyan-500/20 text-[9px] text-cyan-400">Thinking...</Badge>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Responses */}
        <AnimatePresence>
          {responses.filter((r) => r.response).map((resp, i) => {
            const Icon = resp.member.icon
            return (
              <motion.div
                key={resp.member.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className={`mb-4 border-l-2 bg-[#111118] ${resp.member.color.replace('text-', 'border-')}`}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${resp.member.bgColor}`}>
                        <Icon className={`h-4 w-4 ${resp.member.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{resp.member.name}</p>
                        <p className="text-xs text-gray-500">{resp.member.role}</p>
                      </div>
                      <Badge className={`ml-auto ${resp.member.bgColor} ${resp.member.color}`}>
                        Perspective
                      </Badge>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                      {resp.response}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Consensus */}
        {consensus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-400">
                  <Crown className="h-4 w-4" />
                  Board Consensus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                  {consensus}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div ref={scrollRef} />
      </div>
    </div>
  )
}

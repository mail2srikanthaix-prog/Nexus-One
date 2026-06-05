'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, Target, BarChart3 } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { PredictionsResponse } from '@/lib/types'

const impactColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-cyan-500/20 text-cyan-400',
  high: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
}

const impactPieColors: Record<string, string> = {
  low: '#6b7280',
  medium: '#06b6d4',
  high: '#f59e0b',
  critical: '#ef4444',
}

const typeIcons: Record<string, string> = {
  risk: '⚠',
  incident: '🔥',
  market: '📊',
  financial: '💰',
  operational: '⚙',
  talent: '👤',
  technology: '💻',
  compliance: '📋',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  monitoring: 'bg-cyan-500/20 text-cyan-400',
  mitigated: 'bg-gray-500/20 text-gray-400',
  escalating: 'bg-red-500/20 text-red-400',
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export function PredictionsView() {
  const [data, setData] = useState<PredictionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setFetchKey((k) => k + 1)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/predictions')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError('Failed to load predictions. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchKey])

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
          <span className="text-sm text-gray-400">Loading predictions...</span>
        </div>
      </div>
    )
  }

  const summaryCards = [
    { label: 'Total Active', value: data.total, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'High Risk', value: data.highRiskCount, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { label: 'Avg Probability', value: `${Math.round(parseFloat(data.avgProbability) * 100)}%`, icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'Critical Impact', value: data.impactCounts?.critical || 0, icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  ]

  const impactPieData = Object.entries(data.impactCounts || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }))

  const typeBarData = Object.entries(data.typeCounts || {}).map(([name, count]) => ({
    name,
    count: count as number,
  }))

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex h-full flex-col overflow-y-auto p-6"
    >
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <motion.div key={card.label} variants={item}>
              <Card className={`border ${card.border} bg-[#111118]`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{card.label}</p>
                      <p className="text-xl font-bold text-white">{card.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Prediction Cards */}
        <div className="space-y-4 lg:col-span-2">
          {data.predictions?.map((pred) => {
            const prob = Math.round(pred.probability * 100)
            const isExpanded = expandedId === pred.id
            const probColor = prob > 60 ? 'text-red-400' : prob > 30 ? 'text-amber-400' : 'text-emerald-400'
            const probStroke = prob > 60 ? '#ef4444' : prob > 30 ? '#f59e0b' : '#10b981'

            let evidence: string[] = []
            if (pred.evidence) {
              try {
                evidence = JSON.parse(pred.evidence)
              } catch {
                evidence = [pred.evidence]
              }
            }

            return (
              <motion.div key={pred.id} variants={item}>
                <Card className={`border-[#1e1e2e] bg-[#111118] ${prob > 60 ? 'border-l-2 border-l-red-500' : prob > 30 ? 'border-l-2 border-l-amber-500' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Probability Circle */}
                      <div className="shrink-0">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#1e1e2e"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={probStroke}
                              strokeWidth="3"
                              strokeDasharray={`${prob}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-lg font-bold ${probColor}`}>{prob}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{typeIcons[pred.type] || '●'}</span>
                          <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-400">
                            {pred.type}
                          </Badge>
                          <Badge className={impactColors[pred.impact] || 'bg-gray-500/20 text-gray-400'}>
                            {pred.impact}
                          </Badge>
                          <Badge className={statusColors[pred.status] || 'bg-gray-500/20 text-gray-400'}>
                            {pred.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-200">{pred.title}</p>
                        {pred.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{pred.description}</p>
                        )}
                        {pred.timeframe && (
                          <p className="mt-1 text-xs text-gray-600">Timeframe: {pred.timeframe}</p>
                        )}
                        {evidence.length > 0 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : pred.id)}
                            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            {isExpanded ? 'Hide evidence' : `Show evidence (${evidence.length})`}
                          </button>
                        )}
                        {isExpanded && evidence.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 space-y-1"
                          >
                            {evidence.map((ev, i) => (
                              <p key={i} className="text-xs text-gray-500">• {ev}</p>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Sidebar: Charts */}
        <div className="space-y-6">
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={impactPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {impactPieData.map((entry, index) => (
                      <Cell key={index} fill={impactPieColors[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {impactPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: impactPieColors[entry.name] || '#6b7280' }} />
                    <span className="text-[10px] text-gray-400">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Predictions by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeBarData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

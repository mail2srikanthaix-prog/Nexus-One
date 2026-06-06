'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Brain, Target, Clock, ListChecks, Settings, Search, AlertTriangle } from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import type { MemoryResponse } from '@/lib/types'


const typeIcons: Record<string, React.ElementType> = {
  strategic: Target,
  episodic: Clock,
  procedural: ListChecks,
  operational: Settings,
  semantic: Brain,
}

const typeBadgeColors: Record<string, string> = {
  strategic: 'bg-purple-500/20 text-purple-400',
  episodic: 'bg-cyan-500/20 text-cyan-400',
  procedural: 'bg-emerald-500/20 text-emerald-400',
  operational: 'bg-amber-500/20 text-amber-400',
  semantic: 'bg-rose-500/20 text-rose-400',
}

const typeBarColors: Record<string, string> = {
  strategic: '#8b5cf6',
  episodic: '#06b6d4',
  procedural: '#10b981',
  operational: '#f59e0b',
  semantic: '#f43f5e',
}

const memoryTabs = [
  { id: 'all', label: 'All' },
  { id: 'strategic', label: 'Strategic' },
  { id: 'episodic', label: 'Episodic' },
  { id: 'procedural', label: 'Procedural' },
  { id: 'operational', label: 'Operational' },
  { id: 'semantic', label: 'Semantic' },
]

export function MemoryView() {
  const [data, setData] = useState<MemoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setFetchKey((k) => k + 1)
  }

  const handleTabChange = (tab: string) => {
    setLoading(true)
    setError(null)
    setActiveTab(tab)
  }

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('type', activeTab)
    if (debouncedQuery) params.set('q', debouncedQuery)
    const url = `/api/memory${params.toString() ? `?${params.toString()}` : ''}`
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError('Failed to load memories. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeTab, debouncedQuery, fetchKey])

  // Debounce search input — only update debouncedQuery after 300ms of inactivity
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

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
          <span className="text-sm text-gray-400">Loading memories...</span>
        </div>
      </div>
    )
  }

  const typeBarData = Object.entries(data.typeCounts || {}).map(([name, count]) => ({
    name,
    count: count as number,
    fill: typeBarColors[name] || '#6b7280',
  }))

  const memories = data.memories || []

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Type Tabs */}
          <div className="flex flex-wrap gap-2">
            {memoryTabs.map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                className={`h-7 text-xs ${activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400'}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="ml-auto w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search memories..."
                className="h-7 border-[#2a2a3e] bg-[#111118] pl-9 text-xs text-gray-200 placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Memory Cards */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {memories.map((memory) => {
              const Icon = typeIcons[memory.type] || Brain
              const importance = Math.round(memory.importance * 100)
              const importanceColor = importance > 70 ? 'text-red-400' : importance > 40 ? 'text-amber-400' : 'text-emerald-400'
              return (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-[#1e1e2e] bg-[#111118]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <Badge className={typeBadgeColors[memory.type] || 'bg-gray-500/20 text-gray-400'}>
                          {memory.type}
                        </Badge>
                        <span className="ml-auto text-[10px] text-gray-500">
                          {new Date(memory.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-200">{memory.title}</p>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-500">
                        {memory.content}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Importance</span>
                        <Progress value={importance} className="h-1.5 flex-1 bg-[#1e1e2e]" />
                        <span className={`text-xs font-mono ${importanceColor}`}>{importance}%</span>
                      </div>
                      {memory.source && (
                        <Badge variant="outline" className="mt-2 border-[#2a2a3e] text-[9px] text-gray-500">
                          {memory.source}
                        </Badge>
                      )}
                      {memory.tags && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {memory.tags.split(',').map((tag: string) => (
                            <Badge key={tag} variant="outline" className="border-[#2a2a3e] text-[9px] text-gray-500">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {memories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="mb-4 h-12 w-12 text-gray-600" />
              <p className="text-sm text-gray-400">No memories found</p>
            </div>
          )}
        </div>

        {/* Sidebar: Stats */}
        <div className="w-64 shrink-0 overflow-y-auto border-l border-[#1e1e2e] bg-[#0d0d14] p-4">
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Memory Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeBarData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip
                    contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {typeBarData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-4 border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Memories</span>
                <span className="text-xs font-mono text-gray-300">{data.total}</span>
              </div>
              {Object.entries(data.typeCounts || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 capitalize">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: typeBarColors[type] || '#6b7280' }} />
                    {type}
                  </span>
                  <span className="text-xs font-mono text-gray-500">{count as number}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

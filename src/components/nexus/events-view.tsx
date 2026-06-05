'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Info, AlertTriangle, AlertOctagon, Circle } from 'lucide-react'
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

const severityColors: Record<string, string> = {
  info: '#06b6d4',
  warning: '#f59e0b',
  error: '#ef4444',
  critical: '#ef4444',
}

const severityBgColors: Record<string, string> = {
  info: 'bg-cyan-500/20 text-cyan-400',
  warning: 'bg-amber-500/20 text-amber-400',
  error: 'bg-red-500/20 text-red-400',
  critical: 'bg-red-500/20 text-red-400',
}

const severityIcons: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertOctagon,
  critical: AlertOctagon,
}

const severityDotColors: Record<string, string> = {
  info: 'bg-cyan-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  critical: 'bg-red-500 animate-pulse',
}

export function EventsView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    const fetchEvents = () => {
      const url = severityFilter === 'all'
        ? '/api/events?limit=50'
        : `/api/events?limit=50&severity=${severityFilter}`
      fetch(url)
        .then((r) => r.json())
        .then((d) => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    fetchEvents()
  }, [severityFilter])

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm text-gray-400">Loading events...</span>
        </div>
      </div>
    )
  }

  const severityPieData = Object.entries(data.severityCounts || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }))

  const typeBarData = Object.entries(data.typeCounts || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 8)
    .map(([name, count]) => ({ name, count: count as number }))

  const filteredEvents = data.events || []

  return (
    <div className="flex h-full flex-col">
      {/* Filter Bar */}
      <div className="flex items-center gap-4 border-b border-[#1e1e2e] bg-[#0d0d14] px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-gray-400">Live</span>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'info', 'warning', 'error', 'critical'].map((sev) => (
            <Button
              key={sev}
              size="sm"
              variant={severityFilter === sev ? 'default' : 'ghost'}
              className={`h-7 text-xs capitalize ${severityFilter === sev ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400'}`}
              onClick={() => setSeverityFilter(sev)}
            >
              {sev}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-500">{data.total} total events</span>
          <Button
            size="sm"
            variant={autoScroll ? 'default' : 'ghost'}
            className={`h-7 text-xs ${autoScroll ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}`}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            Auto-scroll
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Event Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[76px] top-0 bottom-0 w-px bg-[#1e1e2e]" />

            <div className="space-y-1">
              {filteredEvents.map((event: any, index: number) => {
                const SevIcon = severityIcons[event.severity] || Circle
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="relative flex items-start gap-4 pl-0"
                  >
                    {/* Time */}
                    <div className="w-16 shrink-0 pt-3 text-right">
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Dot on timeline */}
                    <div className="relative z-10 flex shrink-0 items-center justify-center pt-3">
                      <span className={`h-3 w-3 rounded-full border-2 border-[#0a0a0f] ${severityDotColors[event.severity] || 'bg-gray-500'}`} />
                    </div>

                    {/* Event Card */}
                    <div className="min-w-0 flex-1 rounded-lg border border-[#1e1e2e] bg-[#111118] p-3">
                      <div className="flex items-center gap-2">
                        <SevIcon className={`h-3.5 w-3.5 ${severityBgColors[event.severity]?.split(' ')[1] || 'text-gray-400'}`} />
                        <span className="text-xs font-medium text-gray-200">{event.title}</span>
                        <Badge variant="outline" className="ml-auto shrink-0 border-[#2a2a3e] text-[10px] text-gray-500">
                          {event.type}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{event.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
                        {event.source && (
                          <Badge variant="outline" className="border-[#2a2a3e] text-[9px] text-gray-500">
                            {event.source}
                          </Badge>
                        )}
                        {event.person?.name && <span>👤 {event.person.name}</span>}
                        {event.project?.name && <span>📁 {event.project.name}</span>}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Analytics */}
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-[#1e1e2e] bg-[#0d0d14] p-4">
          {/* Severity Distribution */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={index} fill={severityColors[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {severityPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: severityColors[entry.name] || '#6b7280' }} />
                    <span className="text-[10px] text-gray-400 capitalize">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Event Type Distribution */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={typeBarData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Source Distribution */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredEvents.reduce((acc: Record<string, number>, event: any) => {
                const source = event.source || 'Unknown'
                acc[source] = (acc[source] || 0) + 1
                return acc
              }, {} as Record<string, number>) && Object.entries(
                filteredEvents.reduce((acc: Record<string, number>, event: any) => {
                  const source = event.source || 'Unknown'
                  acc[source] = (acc[source] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{source}</span>
                    <span className="text-xs font-mono text-gray-500">{count}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

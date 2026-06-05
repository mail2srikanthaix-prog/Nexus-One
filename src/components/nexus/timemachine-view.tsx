'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Play, Pause, Calendar, Gavel, Activity, Rocket, AlertTriangle, BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { EventsResponse, EventData } from '@/lib/types'

const typeIcons: Record<string, React.ElementType> = {
  decision: Gavel,
  deployment: Rocket,
  incident: AlertTriangle,
  event: Activity,
}

const typeColors: Record<string, string> = {
  decision: '#8b5cf6',
  deployment: '#06b6d4',
  incident: '#ef4444',
  event: '#10b981',
}

const severityDotColors: Record<string, string> = {
  info: 'bg-cyan-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  critical: 'bg-red-500 animate-pulse',
}

const decisionStatusColors: Record<string, string> = {
  proposed: 'bg-cyan-500/20 text-cyan-400',
  approved: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
  implemented: 'bg-purple-500/20 text-purple-400',
}

export function TimemachineView() {
  const [eventsData, setEventsData] = useState<EventsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeIndex, setTimeIndex] = useState(100)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setFetchKey((k) => k + 1)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/events?limit=100')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((events) => { if (!cancelled) setEventsData(events) })
      .catch(() => { if (!cancelled) setError('Failed to load time machine data. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchKey])

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setTimeIndex((prev) => {
        if (prev >= 100) {
          setIsPlaying(false)
          return 100
        }
        return prev + 1
      })
    }, 300)
    return () => clearInterval(interval)
  }, [isPlaying])

  const timelineItems = useMemo(() => {
    if (!eventsData?.events) return []
    const events = eventsData.events
    // Sort by date
    const sorted = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    // Slice based on timeIndex
    const count = Math.ceil((timeIndex / 100) * sorted.length)
    return sorted.slice(0, count)
  }, [eventsData, timeIndex])

  // Reality gap data (mock)
  const realityGapData = [
    { decision: 'Hire VP Eng', expected: 85, actual: 62 },
    { decision: 'Migrate to Cloud', expected: 90, actual: 78 },
    { decision: 'Launch v2.0', expected: 70, actual: 55 },
    { decision: 'Expand to EU', expected: 60, actual: 45 },
  ]

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

  if (loading || !eventsData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm text-gray-400">Loading time machine...</span>
        </div>
      </div>
    )
  }

  const earliestEvent = eventsData.events?.length
    ? new Date(eventsData.events[eventsData.events.length - 1]?.createdAt)
    : new Date()
  const latestEvent = eventsData.events?.length
    ? new Date(eventsData.events[0]?.createdAt)
    : new Date()

  // Calculate current date based on timeIndex
  const currentTime = new Date(
    earliestEvent.getTime() + (latestEvent.getTime() - earliestEvent.getTime()) * (timeIndex / 100)
  )

  const visibleEvents = timelineItems.filter((e: EventData) => {
    const eventDate = new Date(e.createdAt)
    return eventDate <= currentTime
  })

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
            <Clock className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Enterprise Time Machine</h2>
            <p className="text-xs text-gray-500">Explore your organization&apos;s history and decisions</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-400"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="text-xs font-mono text-gray-400">
              {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="mt-4 flex items-center gap-4">
          <span className="shrink-0 text-[10px] font-mono text-gray-500">
            {earliestEvent.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
          <Slider
            value={[timeIndex]}
            onValueChange={([v]) => setTimeIndex(v)}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="shrink-0 text-[10px] font-mono text-gray-500">
            {latestEvent.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timeline View */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[100px] top-0 bottom-0 w-px bg-[#1e1e2e]" />

            <div className="space-y-1">
              {[...visibleEvents].reverse().map((event: EventData, index: number) => {
                const eventType = event.type === 'decision' ? 'decision' : event.type === 'deployment' ? 'deployment' : event.severity === 'critical' ? 'incident' : 'event'
                const Icon = typeIcons[eventType] || Activity
                const iconColor = typeColors[eventType] || '#10b981'

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="relative flex items-start gap-4"
                  >
                    {/* Date */}
                    <div className="w-[84px] shrink-0 pt-3 text-right">
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <br />
                      <span className="text-[10px] font-mono text-gray-600">
                        {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Icon on timeline */}
                    <div className="relative z-10 flex shrink-0 items-center justify-center pt-3">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: iconColor + '20' }}
                      >
                        <Icon className="h-3 w-3" style={{ color: iconColor }} />
                      </div>
                    </div>

                    {/* Event Card */}
                    <div className="min-w-0 flex-1 rounded-lg border border-[#1e1e2e] bg-[#111118] p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-200">{event.title}</span>
                        <Badge
                          variant="outline"
                          className="ml-auto shrink-0 border-[#2a2a3e] text-[10px]"
                          style={{ color: iconColor, borderColor: iconColor + '40' }}
                        >
                          {eventType}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{event.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
                        {event.person?.name && <span>👤 {event.person.name}</span>}
                        {event.project?.name && <span>📁 {event.project.name}</span>}
                        <span className={`h-1.5 w-1.5 rounded-full ${severityDotColors[event.severity] || 'bg-gray-500'}`} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Context */}
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-[#1e1e2e] bg-[#0d0d14] p-4">
          {/* At this point in time */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-gray-400">
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                At This Point
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Events</span>
                  <span className="text-xs font-mono text-gray-300">{visibleEvents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Critical</span>
                  <span className="text-xs font-mono text-red-400">
                    {visibleEvents.filter((e: EventData) => e.severity === 'critical').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Warnings</span>
                  <span className="text-xs font-mono text-amber-400">
                    {visibleEvents.filter((e: EventData) => e.severity === 'warning').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reality Gap Analysis */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-gray-400">
                <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                Reality Gap Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={realityGapData}>
                  <XAxis dataKey="decision" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="expected" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Key Decisions */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Key Decisions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {realityGapData.map((d) => (
                <div key={d.decision} className="rounded-lg bg-[#16161f] p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{d.decision}</span>
                    <Badge className={decisionStatusColors.implemented}>implemented</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px]">
                    <span className="text-cyan-400">Expected: {d.expected}%</span>
                    <span className="text-amber-400">Actual: {d.actual}%</span>
                    <span className={`font-mono ${d.actual >= d.expected ? 'text-emerald-400' : 'text-red-400'}`}>
                      {d.actual >= d.expected ? '+' : ''}{d.actual - d.expected}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  FolderKanban,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Heart,
  Bot,
  TrendingUp,
  Activity,
  Zap,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const statusColors: Record<string, string> = {
  idle: 'bg-gray-500',
  thinking: 'bg-cyan-500',
  executing: 'bg-emerald-500',
  reporting: 'bg-amber-500',
  error: 'bg-red-500',
}

const statusBadgeColors: Record<string, string> = {
  idle: 'bg-gray-500/20 text-gray-400',
  thinking: 'bg-cyan-500/20 text-cyan-400',
  executing: 'bg-emerald-500/20 text-emerald-400',
  reporting: 'bg-amber-500/20 text-amber-400',
  error: 'bg-red-500/20 text-red-400',
}

const severityColors: Record<string, string> = {
  info: 'text-cyan-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  critical: 'text-red-400',
}

const severityIcons: Record<string, string> = {
  info: '●',
  warning: '▲',
  error: '✕',
  critical: '⚡',
}

// Mock chart data
const eventTrendData = [
  { day: 'Mon', events: 12 },
  { day: 'Tue', events: 19 },
  { day: 'Wed', events: 8 },
  { day: 'Thu', events: 24 },
  { day: 'Fri', events: 15 },
  { day: 'Sat', events: 6 },
  { day: 'Sun', events: 10 },
]

const taskStatusData = [
  { status: 'To Do', count: 8 },
  { status: 'In Progress', count: 12 },
  { status: 'Review', count: 5 },
  { status: 'Done', count: 15 },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export function DashboardView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm text-gray-400">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  const m = data.metrics

  const metricCards = [
    { label: 'Total People', value: m.totalPeople, icon: Users, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
    { label: 'Active Projects', value: m.activeProjects, icon: FolderKanban, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20' },
    { label: 'Active Tasks', value: m.activeTasks, icon: CheckCircle, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
    { label: 'Critical Events', value: m.criticalEvents, icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
    { label: 'Budget Utilization', value: `${m.budgetUtilization}%`, icon: DollarSign, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
    { label: 'System Health', value: `${m.avgProjectHealth}%`, icon: Heart, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  ]

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6"
    >
      {/* Row 1: Key Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((metric) => {
          const Icon = metric.icon
          return (
            <motion.div key={metric.label} variants={item}>
              <Card className={`border ${metric.borderColor} bg-[#111118]`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${metric.bgColor}`}>
                      <Icon className={`h-5 w-5 ${metric.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{metric.label}</p>
                      <p className="text-xl font-bold text-white">{metric.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Row 2: Agents + Predictions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agent Status Panel */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                  <Bot className="h-4 w-4 text-cyan-400" />
                  Agent Status
                </CardTitle>
                <Badge variant="outline" className="border-emerald-500/30 text-xs text-emerald-400">
                  {m.agentStatus.executing} executing
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.agents?.slice(0, 6).map((agent: any) => (
                  <div
                    key={agent.id}
                    className={`rounded-lg border-l-2 bg-[#16161f] p-3 ${
                      agent.status === 'executing'
                        ? 'border-l-emerald-500'
                        : agent.status === 'thinking'
                          ? 'border-l-cyan-500'
                          : agent.status === 'reporting'
                            ? 'border-l-amber-500'
                            : agent.status === 'error'
                              ? 'border-l-red-500'
                              : 'border-l-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-200">{agent.name}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeColors[agent.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusColors[agent.status] || 'bg-gray-500'} ${agent.status === 'thinking' || agent.status === 'executing' ? 'animate-pulse' : ''}`} />
                        {agent.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{agent.type}</p>
                    {agent.lastAction && (
                      <p className="mt-1 truncate text-xs text-gray-400">{agent.lastAction}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Predictions */}
        <motion.div variants={item}>
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                Active Predictions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.predictions?.slice(0, 5).map((pred: any) => {
                const prob = Math.round(pred.probability * 100)
                const impactColor =
                  pred.impact === 'critical'
                    ? 'text-red-400 bg-red-500/20'
                    : pred.impact === 'high'
                      ? 'text-amber-400 bg-amber-500/20'
                      : pred.impact === 'medium'
                        ? 'text-cyan-400 bg-cyan-500/20'
                        : 'text-gray-400 bg-gray-500/20'
                return (
                  <div key={pred.id} className="rounded-lg bg-[#16161f] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-gray-200">{pred.title}</p>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${impactColor}`}>
                        {pred.impact}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1e1e2e]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            prob > 60 ? 'bg-red-500' : prob > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${prob}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-400">{prob}%</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 3: Events + Charts + Projects */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Events */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Recent Events
                </CardTitle>
                <Badge variant="outline" className="border-[#2a2a3e] text-xs text-gray-400">
                  {m.totalEvents} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {data.recentEvents?.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg bg-[#16161f] p-3"
                  >
                    <span className={`mt-0.5 text-sm ${severityColors[event.severity] || 'text-gray-400'}`}>
                      {severityIcons[event.severity] || '●'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-medium text-gray-200">{event.title}</p>
                        <Badge variant="outline" className="shrink-0 border-[#2a2a3e] text-[10px] text-gray-500">
                          {event.type}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                        {event.source && <span>{event.source}</span>}
                        <span>•</span>
                        <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right column: Charts + Project Health */}
        <motion.div variants={item} className="space-y-6">
          {/* Event Trend Chart */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Event Trend (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={eventTrendData}>
                  <defs>
                    <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Area type="monotone" dataKey="events" stroke="#10b981" fill="url(#eventGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Distribution */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Task Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={taskStatusData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="status" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Health */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Project Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.projects?.slice(0, 4).map((project: any) => (
                <div key={project.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs text-gray-300">{project.name}</span>
                    <span className="text-xs font-mono text-gray-500">{project.health}%</span>
                  </div>
                  <Progress value={project.health} className="h-1.5 bg-[#1e1e2e]" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Connector Status */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-gray-400">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                Connectors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.connectors?.map((conn: any) => (
                  <div
                    key={conn.id}
                    className="flex items-center gap-1.5 rounded-md bg-[#16161f] px-2 py-1"
                  >
                    <span className={`h-2 w-2 rounded-full ${
                      conn.status === 'connected' ? 'bg-emerald-500' : conn.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-[10px] text-gray-400">{conn.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

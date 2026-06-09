'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plug,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  ArrowUpDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConnectorsResponse, ConnectorWithStatus, ConnectorSyncRecord } from '@/lib/types'

const healthStatusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType }> = {
  healthy: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle2 },
  degraded: { color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: AlertTriangle },
  down: { color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
}

const connectorStatusConfig: Record<string, { color: string; bgColor: string }> = {
  connected: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  error: { color: 'text-red-400', bgColor: 'bg-red-500/20' },
  degraded: { color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  syncing: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatTimeAgo(date: string | Date | null): string {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function ConnectorsView() {
  const [data, setData] = useState<ConnectorsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncingType, setSyncingType] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/connectors')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connectors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSync = async (type: string) => {
    setSyncingType(type)
    try {
      await fetch(`/api/connectors?action=sync&type=${type}`, { method: 'POST' })
      await fetchData()
    } catch {
      // Silently fail
    } finally {
      setSyncingType(null)
    }
  }

  const handleSyncAll = async () => {
    setSyncingAll(true)
    try {
      await fetch('/api/connectors?action=sync_all', { method: 'POST' })
      await fetchData()
    } catch {
      // Silently fail
    } finally {
      setSyncingAll(false)
    }
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-400">{error}</p>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchData() }}>
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
          <span className="text-sm text-gray-400">Loading connectors...</span>
        </div>
      </div>
    )
  }

  const { connectors, summary } = data

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Plug className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Connector Framework</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-400">{summary.healthy} healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-400">{summary.degraded} degraded</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs text-gray-400">{summary.down} down</span>
            </div>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={syncingAll}
            size="sm"
            className="gap-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
          >
            {syncingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Sync All</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-[#1e1e2e] bg-[#0d0d14] p-4 sm:grid-cols-4 sm:px-6">
        <Card className="border-[#1e1e2e] bg-[#111118]">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold text-white">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="border-[#1e1e2e] bg-[#111118]">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Healthy</p>
            <p className="text-xl font-bold text-emerald-400">{summary.healthy}</p>
          </CardContent>
        </Card>
        <Card className="border-[#1e1e2e] bg-[#111118]">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Degraded</p>
            <p className="text-xl font-bold text-amber-400">{summary.degraded}</p>
          </CardContent>
        </Card>
        <Card className="border-[#1e1e2e] bg-[#111118]">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Down</p>
            <p className="text-xl font-bold text-red-400">{summary.down}</p>
          </CardContent>
        </Card>
      </div>

      {/* Connectors List */}
      <ScrollArea className="flex-1 p-4 sm:p-6">
        <div className="space-y-3">
          {connectors.map((connector, index) => (
            <ConnectorCard
              key={connector.id + connector.type}
              connector={connector}
              onSync={handleSync}
              isSyncing={syncingType === connector.type}
              index={index}
            />
          ))}

          {connectors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Plug className="mb-3 h-10 w-10 text-gray-600" />
              <p className="text-sm text-gray-500">No connectors found</p>
              <p className="mt-1 text-xs text-gray-600">Connectors will appear here once they are registered.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Connector Card ────────────────────────────────────────────────────────

function ConnectorCard({
  connector,
  onSync,
  isSyncing,
  index,
}: {
  connector: ConnectorWithStatus
  onSync: (type: string) => void
  isSyncing: boolean
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const health = connector.health
  const healthConfig = healthStatusConfig[health?.status || 'down']
  const statusConfig = connectorStatusConfig[connector.status] || connectorStatusConfig.connected
  const HealthIcon = healthConfig?.icon || XCircle

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-[#1e1e2e] bg-[#111118] transition-colors hover:border-[#2a2a3e]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${statusConfig.bgColor}`}>
                <Plug className={`h-4 w-4 ${statusConfig.color}`} />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-white">{connector.name}</CardTitle>
                <p className="text-xs text-gray-500">{connector.type} &bull; {connector.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {health && (
                <Badge className={`${healthConfig.bgColor} ${healthConfig.color} gap-1 text-[10px]`}>
                  <HealthIcon className="h-3 w-3" />
                  {health.status}
                </Badge>
              )}
              <Button
                onClick={() => onSync(connector.type)}
                disabled={isSyncing}
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-[#2a2a3e] text-[10px] text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400"
              >
                {isSyncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Sync
              </Button>
              <Button
                onClick={() => setExpanded(!expanded)}
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-gray-500 hover:text-gray-300"
              >
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last sync: {formatTimeAgo(connector.lastSync)}
            </span>
            {connector.recordCount !== null && (
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {connector.recordCount.toLocaleString()} records
              </span>
            )}
            {health && (
              <span>Latency: {formatDuration(health.latency)}</span>
            )}
            {health && health.uptime > 0 && (
              <span>Uptime: {health.uptime.toFixed(1)}%</span>
            )}
          </div>

          {expanded && (
            <div className="mt-3 border-t border-[#1e1e2e] pt-3">
              <h4 className="mb-2 text-xs font-medium text-gray-500">Sync History</h4>
              {connector.syncHistory && connector.syncHistory.length > 0 ? (
                <div className="space-y-1.5">
                  {connector.syncHistory.map((sync: ConnectorSyncRecord) => (
                    <div
                      key={sync.id}
                      className="flex items-center justify-between rounded-md bg-[#0d0d14] px-3 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`border-[#2a2a3e] text-[9px] ${
                            sync.status === 'completed'
                              ? 'text-emerald-400'
                              : sync.status === 'failed'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {sync.status}
                        </Badge>
                        <span className="text-gray-400">
                          {sync.recordsSynced} synced, {sync.recordsFailed} failed
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500">
                        <span>{formatDuration(sync.duration)}</span>
                        <span>{formatTimeAgo(sync.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No sync history available</p>
              )}

              {health?.lastError && (
                <div className="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  Error: {health.lastError}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

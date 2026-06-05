'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, Link2, Eye, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { SecurityResponse } from '@/lib/types'

const severityColors: Record<string, string> = {
  info: 'bg-cyan-500/20 text-cyan-400',
  warning: 'bg-amber-500/20 text-amber-400',
  error: 'bg-red-500/20 text-red-400',
  critical: 'bg-red-500/20 text-red-400',
}

const connectorStatusColors: Record<string, string> = {
  connected: 'bg-emerald-500',
  disconnected: 'bg-gray-500',
  error: 'bg-red-500',
  syncing: 'bg-cyan-500 animate-pulse',
}

export function SecurityView() {
  const [data, setData] = useState<SecurityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setFetchKey((k) => k + 1)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/security')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError('Failed to load security dashboard. Please try again.') })
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
          <span className="text-sm text-gray-400">Loading security dashboard...</span>
        </div>
      </div>
    )
  }

  const scoreColor =
    data.securityScore >= 80
      ? '#10b981'
      : data.securityScore >= 50
        ? '#f59e0b'
        : '#ef4444'

  const scoreLabel =
    data.securityScore >= 80
      ? 'Excellent'
      : data.securityScore >= 50
        ? 'Moderate'
        : 'At Risk'

  const summaryCards = [
    { label: 'Audit Events', value: data.totalAuditLogs, icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'High Risk Users', value: data.highRiskPeople?.length || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { label: 'Security Connectors', value: data.securityConnectors?.length || 0, icon: Link2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Security Predictions', value: data.securityPredictions?.length || 0, icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col overflow-y-auto p-6"
    >
      {/* Security Score */}
      <div className="mb-6 flex items-center justify-center">
        <Card className="border-[#1e1e2e] bg-[#111118]">
          <CardContent className="flex items-center gap-8 p-6">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#1e1e2e"
                  strokeWidth="2.5"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="2.5"
                  strokeDasharray={`${data.securityScore}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: scoreColor }}>
                  {data.securityScore}
                </span>
                <span className="text-[10px] text-gray-500">/ 100</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" style={{ color: scoreColor }} />
                <h2 className="text-lg font-bold text-white">Zero Trust Security Score</h2>
              </div>
              <Badge
                className="mt-2"
                style={{
                  backgroundColor: scoreColor + '20',
                  color: scoreColor,
                }}
              >
                {scoreLabel}
              </Badge>
              <p className="mt-2 text-xs text-gray-500">
                Based on connector health, user risk scores, and threat predictions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className={`border ${card.border} bg-[#111118]`}>
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
          )
        })}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Audit Log */}
        <Card className="border-[#1e1e2e] bg-[#111118]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
              <Eye className="h-4 w-4 text-cyan-400" />
              Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e1e2e] text-gray-500">
                    <th className="pb-2 text-left font-medium">Time</th>
                    <th className="pb-2 text-left font-medium">Action</th>
                    <th className="pb-2 text-left font-medium">Actor</th>
                    <th className="pb-2 text-left font-medium">Resource</th>
                    <th className="pb-2 text-left font-medium">Severity</th>
                    <th className="pb-2 text-left font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditLogs?.map((log) => (
                    <tr key={log.id} className="border-b border-[#1e1e2e]/50">
                      <td className="py-2 font-mono text-gray-500">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 text-gray-300">{log.action}</td>
                      <td className="py-2 text-gray-400">{log.actor || '-'}</td>
                      <td className="py-2 text-gray-400">{log.resource || '-'}</td>
                      <td className="py-2">
                        <Badge className={severityColors[log.severity] || 'bg-gray-500/20 text-gray-400'}>
                          {log.severity}
                        </Badge>
                      </td>
                      <td className="py-2 font-mono text-gray-500">{log.ipAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Connector Status */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                <Link2 className="h-4 w-4 text-emerald-400" />
                Security Connectors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.securityConnectors?.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between rounded-lg bg-[#16161f] p-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${connectorStatusColors[conn.status] || 'bg-gray-500'}`} />
                      <span className="text-sm text-gray-300">{conn.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-500">
                        {conn.type}
                      </Badge>
                      {conn.lastSync && (
                        <span className="text-[10px] text-gray-500">
                          {new Date(conn.lastSync).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(!data.securityConnectors || data.securityConnectors.length === 0) && (
                  <p className="py-4 text-center text-xs text-gray-500">No security connectors</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* High Risk People */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                High Risk Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.highRiskPeople?.slice(0, 6).map((person) => {
                  const riskPct = Math.min(100, Math.round(person.riskScore * 5))
                  return (
                    <div key={person.id} className="rounded-lg bg-[#16161f] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">{person.name}</span>
                        <span className="text-xs font-mono text-red-400">{person.riskScore}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={riskPct} className="h-1.5 flex-1 bg-[#1e1e2e]" />
                        <span className="text-[10px] text-gray-500">{person.role}</span>
                      </div>
                    </div>
                  )
                })}
                {(!data.highRiskPeople || data.highRiskPeople.length === 0) && (
                  <p className="py-4 text-center text-xs text-gray-500">No high risk users detected</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Predictions */}
          <Card className="border-[#1e1e2e] bg-[#111118]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                <Lock className="h-4 w-4 text-amber-400" />
                Security Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.securityPredictions?.slice(0, 4).map((pred) => {
                  const prob = Math.round(pred.probability * 100)
                  return (
                    <div key={pred.id} className="rounded-lg bg-[#16161f] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">{pred.title}</span>
                        <Badge className={prob > 60 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}>
                          {prob}%
                        </Badge>
                      </div>
                      {pred.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-gray-500">{pred.description}</p>
                      )}
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1e1e2e]">
                        <div
                          className={`h-full rounded-full ${prob > 60 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${prob}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {(!data.securityPredictions || data.securityPredictions.length === 0) && (
                  <p className="py-4 text-center text-xs text-gray-500">No security predictions</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

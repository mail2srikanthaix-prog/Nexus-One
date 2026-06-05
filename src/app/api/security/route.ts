import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      auditLogs,
      connectors,
      people,
      predictions,
    ] = await Promise.all([
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      db.connector.findMany(),
      db.person.findMany(),
      db.prediction.findMany({ where: { type: 'incident' } }),
    ])

    const securityConnectors = connectors.filter(c => c.category === 'security')
    const errorConnectors = connectors.filter(c => c.status === 'error')
    const highRiskPeople = people.filter(p => p.riskScore > 15)

    // Compute security score
    let securityScore = 100
    securityScore -= errorConnectors.length * 10
    securityScore -= highRiskPeople.length * 5
    securityScore -= predictions.filter(p => p.probability > 0.5).length * 8
    securityScore = Math.max(0, Math.min(100, securityScore))

    const severityCounts: Record<string, number> = {}
    for (const log of auditLogs) {
      severityCounts[log.severity] = (severityCounts[log.severity] || 0) + 1
    }

    return NextResponse.json({
      securityScore,
      auditLogs,
      securityConnectors,
      errorConnectors,
      highRiskPeople,
      securityPredictions: predictions,
      severityCounts,
      totalAuditLogs: auditLogs.length,
    })
  } catch (error) {
    console.error('Security API error:', error)
    return NextResponse.json({ error: 'Failed to load security data' }, { status: 500 })
  }
}

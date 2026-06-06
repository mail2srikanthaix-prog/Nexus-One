import { db } from '@/lib/db'
import { apiResponse, apiErrorResponse, getClientIp, handleApiError, methodNotAllowed, readRateLimiter, withSecurityHeaders } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

// Method guard: only GET and HEAD allowed
export async function POST() { return methodNotAllowed(['GET', 'HEAD']) }
export async function PUT() { return methodNotAllowed(['GET', 'HEAD']) }
export async function DELETE() { return methodNotAllowed(['GET', 'HEAD']) }
export async function PATCH() { return methodNotAllowed(['GET', 'HEAD']) }

export async function HEAD() {
  const response = new NextResponse(null, { status: 200 })
  return withSecurityHeaders(response)
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = readRateLimiter.check(clientIp)
    if (!rateCheck.allowed) {
      const response = apiErrorResponse('Rate limit exceeded', 'RATE_LIMITED', 429)
      response.headers.set('Retry-After', String(rateCheck.retryAfter))
      return response
    }
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

    return apiResponse({
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
    return handleApiError(error, 'Security API')
  }
}

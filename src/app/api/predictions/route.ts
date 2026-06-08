import { db } from '@/lib/db'
import { apiResponse, apiErrorResponse, getClientIp, handleApiError, methodNotAllowed, readRateLimiter, withSecurityHeaders } from '@/lib/api-utils'
import { getTenantId, addTenantFilter } from '@/lib/tenant-context'
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

    // ── Tenant context ─────────────────────────────────────────────────
    const tenantId = await getTenantId(request)
    const where = tenantId ? addTenantFilter({}, tenantId) : {}

    const predictions = await db.prediction.findMany({
      where,
      orderBy: { probability: 'desc' },
    })

    const typeCounts: Record<string, number> = {}
    const impactCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}

    for (const p of predictions) {
      typeCounts[p.type] = (typeCounts[p.type] || 0) + 1
      impactCounts[p.impact] = (impactCounts[p.impact] || 0) + 1
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
    }

    const highRisk = predictions.filter(p => p.probability > 0.6)
    const avgProbability = predictions.length > 0
      ? predictions.reduce((acc, p) => acc + p.probability, 0) / predictions.length
      : 0

    return apiResponse({
      predictions,
      typeCounts,
      impactCounts,
      statusCounts,
      highRiskCount: highRisk.length,
      avgProbability: avgProbability.toFixed(2),
      total: predictions.length,
    })
  } catch (error) {
    return handleApiError(error, 'Predictions API')
  }
}

import { db } from '@/lib/db'
import {
  apiResponse,
  apiErrorResponse,
  getClientIp,
  handleApiError,
  methodNotAllowed,
  readRateLimiter,
  validateInt,
  validateEnum,
  withSecurityHeaders,
} from '@/lib/api-utils'
import { NextResponse } from 'next/server'

const VALID_SEVERITIES = ['info', 'warning', 'error', 'critical'] as const

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

    const { searchParams } = new URL(request.url)

    // ── Input Validation ───────────────────────────────────────────────
    const limitResult = validateInt(searchParams.get('limit'), 'limit', { min: 1, max: 200, default: 50 })
    if (!limitResult.valid) {
      return apiErrorResponse(limitResult.error!, 'INVALID_LIMIT', 400)
    }
    const limit = limitResult.value

    const severityResult = validateEnum(searchParams.get('severity'), 'severity', [...VALID_SEVERITIES])
    if (!severityResult.valid) {
      return apiErrorResponse(severityResult.error!, 'INVALID_SEVERITY', 400)
    }
    const severity = severityResult.value

    const where = severity ? { severity } : {}

    // ── Fetch paginated events ─────────────────────────────────────────
    const [events, totalCount] = await Promise.all([
      db.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          person: { select: { name: true, role: true } },
          project: { select: { name: true, status: true } },
        },
      }),
      db.event.count({ where }),
    ])

    // ── Compute counts from fetched events instead of a separate full-table query ──
    // For type/severity breakdowns, use separate lightweight count queries
    const [allTypeCounts, allSeverityCounts] = await Promise.all([
      db.event.groupBy({ by: ['type'], _count: { type: true } }),
      db.event.groupBy({ by: ['severity'], _count: { severity: true } }),
    ])

    const typeCounts: Record<string, number> = {}
    for (const row of allTypeCounts) {
      typeCounts[row.type] = row._count.type
    }

    const severityCounts: Record<string, number> = {}
    for (const row of allSeverityCounts) {
      severityCounts[row.severity] = row._count.severity
    }

    return apiResponse({
      events,
      typeCounts,
      severityCounts,
      total: totalCount,
    })
  } catch (error) {
    return handleApiError(error, 'Events API')
  }
}

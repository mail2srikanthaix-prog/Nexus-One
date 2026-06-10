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
import { getTenantId, addDecisionTenantFilter } from '@/lib/tenant-context'
import { NextResponse } from 'next/server'

const VALID_STATUSES = ['proposed', 'approved', 'rejected', 'implemented'] as const
const VALID_IMPACTS = ['low', 'medium', 'high', 'critical'] as const

// Method guard: only GET and HEAD allowed
export async function POST() { return methodNotAllowed(['GET', 'HEAD']) }
export async function PUT() { return methodNotAllowed(['GET', 'HEAD']) }
export async function DELETE() { return methodNotAllowed(['GET', 'HEAD']) }
export async function PATCH() { return methodNotAllowed(['GET', 'HEAD']) }

export async function HEAD() {
  const response = new NextResponse(null, { status: 200 })
  return withSecurityHeaders(response)
}

/**
 * Compute a simulated "actual outcome" score for a decision.
 *
 * Since the Decision model doesn't have a numeric `outcome` field,
 * we derive an "actual" value based on impact level and confidence:
 *   - `expected` = confidence * 100 (the original confidence estimate)
 *   - `actual`   = impact-based base score + confidence-weighted variance
 *
 * This creates a realistic gap between what was expected and what happened.
 */
function computeActualOutcome(confidence: number, impact: string, status: string): number {
  // Base scores by impact level
  const impactBase: Record<string, number> = {
    critical: 85,
    high: 70,
    medium: 50,
    low: 30,
  }

  const base = impactBase[impact] ?? 50

  // Adjust by confidence: higher confidence tends toward the base,
  // lower confidence introduces more variance (gap)
  const confidenceFactor = confidence // 0–1
  const actual = base * confidenceFactor + base * 0.2 * (1 - confidenceFactor)

  // Decisions that are "implemented" get a small boost (they actually happened)
  // Decisions that are "rejected" get reduced (they didn't happen)
  // "proposed" stays as-is (unknown outcome)
  let statusAdjust = 0
  if (status === 'implemented') statusAdjust = 5
  else if (status === 'rejected') statusAdjust = -15

  return Math.min(100, Math.max(0, Math.round(actual + statusAdjust)))
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

    const statusResult = validateEnum(searchParams.get('status'), 'status', [...VALID_STATUSES])
    if (!statusResult.valid) {
      return apiErrorResponse(statusResult.error!, 'INVALID_STATUS', 400)
    }
    const status = statusResult.value

    const impactResult = validateEnum(searchParams.get('impact'), 'impact', [...VALID_IMPACTS])
    if (!impactResult.valid) {
      return apiErrorResponse(impactResult.error!, 'INVALID_IMPACT', 400)
    }
    const impact = impactResult.value

    // ── Tenant context ─────────────────────────────────────────────────
    const tenantId = await getTenantId(request)
    const baseWhere: Record<string, unknown> = {}
    if (status) baseWhere.status = status
    if (impact) baseWhere.impact = impact
    const where = await addDecisionTenantFilter(baseWhere, tenantId)

    // ── Query decisions ────────────────────────────────────────────────
    const [decisions, totalCount] = await Promise.all([
      db.decision.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          madeBy: { select: { name: true } },
          project: { select: { name: true } },
        },
      }),
      db.decision.count({ where }),
    ])

    // ── Compute status/impact counts from all data ────────────────────
    const [allStatusCounts, allImpactCounts] = await Promise.all([
      db.decision.groupBy({ by: ['status'], _count: { status: true }, where }),
      db.decision.groupBy({ by: ['impact'], _count: { impact: true }, where }),
    ])

    const statusCounts: Record<string, number> = {}
    for (const row of allStatusCounts) {
      statusCounts[row.status] = row._count.status
    }

    const impactCounts: Record<string, number> = {}
    for (const row of allImpactCounts) {
      impactCounts[row.impact] = row._count.impact
    }

    // ── Map to response format with reality gap data ──────────────────
    const mappedDecisions = decisions.map((d) => {
      const expectedOutcome = Math.round(d.confidence * 100)
      const actualOutcome = computeActualOutcome(d.confidence, d.impact, d.status)

      return {
        id: d.id,
        title: d.title,
        description: d.description,
        status: d.status,
        impact: d.impact,
        confidence: d.confidence,
        reasoning: d.reasoning,
        madeBy: d.madeBy?.name ?? undefined,
        projectName: d.project?.name ?? undefined,
        createdAt: d.createdAt.toISOString(),
        expectedOutcome,
        actualOutcome,
      }
    })

    return apiResponse({
      decisions: mappedDecisions,
      total: totalCount,
      statusCounts,
      impactCounts,
    })
  } catch (error) {
    return handleApiError(error, 'Decisions API')
  }
}

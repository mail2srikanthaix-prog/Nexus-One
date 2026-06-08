import {
  apiResponse,
  apiErrorResponse,
  getClientIp,
  handleApiError,
  methodNotAllowed,
  readRateLimiter,
  withSecurityHeaders,
} from '@/lib/api-utils'
import { NextResponse } from 'next/server'
import { reindexAll } from '@/lib/vector-search'

// Method guard: only POST and HEAD allowed
export async function GET() { return methodNotAllowed(['POST', 'HEAD']) }
export async function PUT() { return methodNotAllowed(['POST', 'HEAD']) }
export async function DELETE() { return methodNotAllowed(['POST', 'HEAD']) }
export async function PATCH() { return methodNotAllowed(['POST', 'HEAD']) }

export async function HEAD() {
  const response = new NextResponse(null, { status: 200 })
  return withSecurityHeaders(response)
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = readRateLimiter.check(clientIp)
    if (!rateCheck.allowed) {
      const response = apiErrorResponse('Rate limit exceeded', 'RATE_LIMITED', 429)
      response.headers.set('Retry-After', String(rateCheck.retryAfter))
      return response
    }

    // ── Parse Body (optional) ──────────────────────────────────────────
    let body: Record<string, unknown> | null = null
    try {
      body = await request.json() as Record<string, unknown>
    } catch {
      // No body is fine, use defaults
    }

    const entityTypes = body?.entityTypes && Array.isArray(body.entityTypes)
      ? body.entityTypes.map(String)
      : undefined

    const batchSize = body?.batchSize && typeof body.batchSize === 'number'
      ? Math.min(Math.max(body.batchSize, 1), 50)
      : 10

    // ── Execute Re-index ───────────────────────────────────────────────
    const result = await reindexAll({
      entityTypes,
      batchSize,
    })

    return apiResponse({
      ...result,
      reindexedAt: new Date().toISOString(),
    })
  } catch (error) {
    return handleApiError(error, 'Search Reindex API')
  }
}

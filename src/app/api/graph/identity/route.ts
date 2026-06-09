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
import { resolveIdentities } from '@/lib/graph-engine'

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

    const name = searchParams.get('name')
    if (!name || name.trim().length === 0) {
      return apiErrorResponse('name query parameter is required', 'INVALID_NAME', 400)
    }

    const type = searchParams.get('type') || undefined
    const thresholdStr = searchParams.get('threshold')
    const threshold = thresholdStr ? parseFloat(thresholdStr) : 0.5

    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      return apiErrorResponse('threshold must be between 0 and 1', 'INVALID_THRESHOLD', 400)
    }

    const matches = await resolveIdentities(name, type, threshold)

    return apiResponse({
      name,
      type: type ?? null,
      threshold,
      totalMatches: matches.length,
      matches,
    })
  } catch (error) {
    return handleApiError(error, 'Graph Identity API')
  }
}

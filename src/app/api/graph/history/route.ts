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
import { getEntityHistory } from '@/lib/graph-engine'

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

    const entityId = searchParams.get('entityId')
    if (!entityId || entityId.trim().length === 0) {
      return apiErrorResponse('entityId query parameter is required', 'INVALID_ENTITY_ID', 400)
    }

    const limitStr = searchParams.get('limit')
    const limit = limitStr ? parseInt(limitStr, 10) : 50

    if (isNaN(limit) || limit < 1 || limit > 200) {
      return apiErrorResponse('limit must be between 1 and 200', 'INVALID_LIMIT', 400)
    }

    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    const options: { limit: number; from?: Date; to?: Date } = { limit }
    if (fromStr) {
      const from = new Date(fromStr)
      if (isNaN(from.getTime())) {
        return apiErrorResponse('from must be a valid ISO date string', 'INVALID_FROM', 400)
      }
      options.from = from
    }
    if (toStr) {
      const to = new Date(toStr)
      if (isNaN(to.getTime())) {
        return apiErrorResponse('to must be a valid ISO date string', 'INVALID_TO', 400)
      }
      options.to = to
    }

    const history = await getEntityHistory(entityId, options)

    return apiResponse({
      entityId,
      totalVersions: history.length,
      history,
    })
  } catch (error) {
    return handleApiError(error, 'Graph History API')
  }
}

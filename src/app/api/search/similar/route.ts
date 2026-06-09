import {
  apiResponse,
  apiErrorResponse,
  getClientIp,
  handleApiError,
  methodNotAllowed,
  readRateLimiter,
  withSecurityHeaders,
  validateInt,
} from '@/lib/api-utils'
import { NextResponse } from 'next/server'
import { findSimilar } from '@/lib/vector-search'

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

    const entityType = searchParams.get('entityType')
    if (!entityType || entityType.trim().length === 0) {
      return apiErrorResponse('entityType query parameter is required', 'INVALID_ENTITY_TYPE', 400)
    }

    const validEntityTypes = ['memory', 'document', 'agentMemory', 'graphEntity', 'person', 'project']
    if (!validEntityTypes.includes(entityType)) {
      return apiErrorResponse(`entityType must be one of: ${validEntityTypes.join(', ')}`, 'INVALID_ENTITY_TYPE', 400)
    }

    const limitStr = searchParams.get('limit')
    const limit = limitStr ? parseInt(limitStr, 10) : 10
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return apiErrorResponse('limit must be between 1 and 50', 'INVALID_LIMIT', 400)
    }

    const results = await findSimilar(entityId, entityType, limit)

    return apiResponse({
      entityId,
      entityType,
      totalResults: results.length,
      results,
    })
  } catch (error) {
    return handleApiError(error, 'Search Similar API')
  }
}

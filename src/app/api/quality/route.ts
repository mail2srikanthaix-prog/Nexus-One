import {
  apiResponse,
  apiErrorResponse,
  getClientIp,
  handleApiError,
  methodNotAllowed,
  readRateLimiter,
  validateString,
  validateEnum,
  withSecurityHeaders,
} from '@/lib/api-utils'
import { getQualityScores } from '@/lib/learning-engine'
import { NextResponse } from 'next/server'

// GET /api/quality - Get quality scores
//   Query params: entityType, entityId, metric, period

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

    // Validate required entityType
    const entityTypeResult = validateString(searchParams.get('entityType'), 'entityType', { required: true, maxLen: 100 })
    if (!entityTypeResult.valid) {
      return apiErrorResponse(entityTypeResult.error!, 'INVALID_ENTITY_TYPE', 400)
    }

    // Optional entityId filter
    const entityId = validateString(searchParams.get('entityId'), 'entityId', { maxLen: 100 }).value || undefined

    // Optional metric filter
    const metric = validateString(searchParams.get('metric'), 'metric', { maxLen: 100 }).value || undefined

    // Optional period filter
    const periodResult = validateEnum(searchParams.get('period'), 'period', ['hourly', 'daily', 'weekly'])
    if (!periodResult.valid) {
      return apiErrorResponse(periodResult.error!, 'INVALID_PERIOD', 400)
    }

    const scores = await getQualityScores({
      entityType: entityTypeResult.value,
      entityId,
      metric,
      period: periodResult.value as 'hourly' | 'daily' | 'weekly' | undefined,
    })

    return apiResponse({
      scores,
      total: scores.length,
    })
  } catch (error) {
    return handleApiError(error, 'Quality API')
  }
}

import {
  apiResponse,
  apiErrorResponse,
  getClientIp,
  handleApiError,
  methodNotAllowed,
  readRateLimiter,
  validateString,
  validateInt,
  withSecurityHeaders,
} from '@/lib/api-utils'
import { analyzeFeedback, recordFeedback } from '@/lib/learning-engine'
import { NextResponse } from 'next/server'

// GET /api/feedback - Get feedback analysis
//   Query params: targetType, targetId, from, to
// POST /api/feedback - Submit feedback
//   Body: { targetType, targetId, userId?, rating (1-5), comment?, tags? }

export async function PUT() { return methodNotAllowed(['GET', 'POST']) }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']) }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']) }

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

    // Validate required targetType
    const targetTypeResult = validateString(searchParams.get('targetType'), 'targetType', { required: true, maxLen: 100 })
    if (!targetTypeResult.valid) {
      return apiErrorResponse(targetTypeResult.error!, 'INVALID_TARGET_TYPE', 400)
    }

    const targetId = validateString(searchParams.get('targetId'), 'targetId', { maxLen: 100 }).value || undefined

    // Parse optional date range
    let from: Date | undefined
    let to: Date | undefined

    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    if (fromStr) {
      const parsed = new Date(fromStr)
      if (isNaN(parsed.getTime())) {
        return apiErrorResponse('Invalid "from" date format. Use ISO 8601.', 'INVALID_FROM_DATE', 400)
      }
      from = parsed
    }

    if (toStr) {
      const parsed = new Date(toStr)
      if (isNaN(parsed.getTime())) {
        return apiErrorResponse('Invalid "to" date format. Use ISO 8601.', 'INVALID_TO_DATE', 400)
      }
      to = parsed
    }

    const analysis = await analyzeFeedback({
      targetType: targetTypeResult.value,
      targetId,
      from,
      to,
    })

    return apiResponse(analysis)
  } catch (error) {
    return handleApiError(error, 'Feedback API')
  }
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

    const body = await request.json() as Record<string, unknown>

    // Validate required fields
    const targetType = validateString(body.targetType as string | null, 'targetType', { required: true, maxLen: 100 })
    if (!targetType.valid) {
      return apiErrorResponse(targetType.error!, 'INVALID_TARGET_TYPE', 400)
    }

    const targetId = validateString(body.targetId as string | null, 'targetId', { required: true, maxLen: 100 })
    if (!targetId.valid) {
      return apiErrorResponse(targetId.error!, 'INVALID_TARGET_ID', 400)
    }

    const ratingResult = validateInt(String(body.rating ?? ''), 'rating', { min: 1, max: 5 })
    if (!ratingResult.valid) {
      return apiErrorResponse(ratingResult.error!, 'INVALID_RATING', 400)
    }

    // Optional fields
    const userId = validateString(body.userId as string | null, 'userId', { maxLen: 100 }).value || undefined
    const comment = validateString(body.comment as string | null, 'comment', { maxLen: 2000 }).value || undefined

    // Parse tags
    let tags: string[] | undefined
    if (Array.isArray(body.tags)) {
      tags = body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 20) as string[]
    }

    const result = await recordFeedback({
      targetType: targetType.value,
      targetId: targetId.value,
      userId,
      rating: ratingResult.value,
      comment,
      tags,
    })

    return apiResponse(result, 201)
  } catch (error) {
    return handleApiError(error, 'Feedback API')
  }
}

export async function HEAD() {
  const response = new NextResponse(null, { status: 200 })
  return withSecurityHeaders(response)
}

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
import { linkExternalSystem } from '@/lib/graph-engine'

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

    // ── Parse Body ─────────────────────────────────────────────────────
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiErrorResponse('Invalid JSON body', 'INVALID_BODY', 400)
    }

    if (!body || typeof body !== 'object') {
      return apiErrorResponse('Request body must be a JSON object', 'INVALID_BODY', 400)
    }

    const { entityId, externalSystem, externalId, metadata } = body as Record<string, unknown>

    // ── Validate Required Fields ───────────────────────────────────────
    if (typeof entityId !== 'string' || entityId.trim().length === 0) {
      return apiErrorResponse('entityId is required and must be a non-empty string', 'INVALID_ENTITY_ID', 400)
    }

    if (typeof externalSystem !== 'string' || externalSystem.trim().length === 0) {
      return apiErrorResponse('externalSystem is required and must be a non-empty string', 'INVALID_EXTERNAL_SYSTEM', 400)
    }

    if (typeof externalId !== 'string' || externalId.trim().length === 0) {
      return apiErrorResponse('externalId is required and must be a non-empty string', 'INVALID_EXTERNAL_ID', 400)
    }

    // ── Validate Optional Fields ───────────────────────────────────────
    let parsedMetadata: Record<string, unknown> | undefined
    if (metadata !== undefined && metadata !== null) {
      if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        return apiErrorResponse('metadata must be a JSON object', 'INVALID_METADATA', 400)
      }
      parsedMetadata = metadata as Record<string, unknown>
    }

    // ── Execute Link ───────────────────────────────────────────────────
    const result = await linkExternalSystem(
      entityId,
      externalSystem,
      externalId,
      parsedMetadata
    )

    return apiResponse({
      relationId: result.relationId,
      entityId,
      externalSystem,
      externalId,
      linked: true,
    }, 201)
  } catch (error) {
    return handleApiError(error, 'Graph Link API')
  }
}

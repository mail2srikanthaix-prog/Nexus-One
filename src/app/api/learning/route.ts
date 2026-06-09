import {
  apiResponse,
  apiErrorResponse,
  getClientIp,
  handleApiError,
  methodNotAllowed,
  readRateLimiter,
  validateString,
  withSecurityHeaders,
} from '@/lib/api-utils'
import {
  recordObservation,
  analyzeOutcome,
  applyLearnings,
  runEvaluationPipeline,
} from '@/lib/learning-engine'
import { NextResponse } from 'next/server'

// POST /api/learning/observe  - Record observation
// POST /api/learning/analyze - Analyze outcomes
// POST /api/learning/apply   - Apply learnings
// POST /api/learning/evaluate - Run evaluation pipeline

export async function GET() { return methodNotAllowed(['POST']) }
export async function PUT() { return methodNotAllowed(['POST']) }
export async function DELETE() { return methodNotAllowed(['POST']) }
export async function PATCH() { return methodNotAllowed(['POST']) }

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

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'observe':
        return handleObserve(request)
      case 'analyze':
        return handleAnalyze(request)
      case 'apply':
        return handleApply(request)
      case 'evaluate':
        return handleEvaluate(request)
      default:
        return apiErrorResponse(
          'Invalid action. Use: observe, analyze, apply, evaluate',
          'INVALID_ACTION',
          400,
        )
    }
  } catch (error) {
    return handleApiError(error, 'Learning API')
  }
}

async function handleObserve(request: Request) {
  const body = await request.json() as Record<string, unknown>

  const entityType = validateString(body.entityType as string | null, 'entityType', { required: true, maxLen: 100 })
  if (!entityType.valid) {
    return apiErrorResponse(entityType.error!, 'INVALID_ENTITY_TYPE', 400)
  }

  const entityId = validateString(body.entityId as string | null, 'entityId', { required: true, maxLen: 100 })
  if (!entityId.valid) {
    return apiErrorResponse(entityId.error!, 'INVALID_ENTITY_ID', 400)
  }

  const observedOutcome = validateString(body.observedOutcome as string | null, 'observedOutcome', { required: true, maxLen: 2000 })
  if (!observedOutcome.valid) {
    return apiErrorResponse(observedOutcome.error!, 'INVALID_OUTCOME', 400)
  }

  const observedAt = body.observedAt ? new Date(body.observedAt as string) : new Date()
  if (isNaN(observedAt.getTime())) {
    return apiErrorResponse('Invalid observedAt date. Use ISO 8601.', 'INVALID_DATE', 400)
  }

  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? body.metadata as Record<string, unknown>
    : undefined

  await recordObservation({
    entityType: entityType.value,
    entityId: entityId.value,
    observedOutcome: observedOutcome.value,
    observedAt,
    metadata,
  })

  return apiResponse({ recorded: true }, 201)
}

async function handleAnalyze(request: Request) {
  const body = await request.json() as Record<string, unknown>

  const entityType = validateString(body.entityType as string | null, 'entityType', { required: true, maxLen: 100 })
  if (!entityType.valid) {
    return apiErrorResponse(entityType.error!, 'INVALID_ENTITY_TYPE', 400)
  }

  const entityId = validateString(body.entityId as string | null, 'entityId', { required: true, maxLen: 100 })
  if (!entityId.valid) {
    return apiErrorResponse(entityId.error!, 'INVALID_ENTITY_ID', 400)
  }

  const result = await analyzeOutcome(entityType.value, entityId.value)

  if (!result) {
    return apiErrorResponse(
      'No observations found for this entity. Record observations first.',
      'NO_OBSERVATIONS',
      404,
    )
  }

  return apiResponse(result)
}

async function handleApply(request: Request) {
  const body = await request.json() as Record<string, unknown>

  const entityType = validateString(body.entityType as string | null, 'entityType', { required: true, maxLen: 100 })
  if (!entityType.valid) {
    return apiErrorResponse(entityType.error!, 'INVALID_ENTITY_TYPE', 400)
  }

  const adjustments = body.adjustments
  if (!adjustments || typeof adjustments !== 'object' || Array.isArray(adjustments)) {
    return apiErrorResponse('adjustments must be a non-empty object', 'INVALID_ADJUSTMENTS', 400)
  }

  const result = await applyLearnings(entityType.value, adjustments as Record<string, unknown>)

  return apiResponse(result)
}

async function handleEvaluate(request: Request) {
  const body = await request.json() as Record<string, unknown>

  const entityType = validateString(body.entityType as string | null, 'entityType', { required: true, maxLen: 100 })
  if (!entityType.valid) {
    return apiErrorResponse(entityType.error!, 'INVALID_ENTITY_TYPE', 400)
  }

  const validTypes = ['agent', 'prediction', 'connector', 'search', 'agent_response', 'workflow']
  if (!validTypes.includes(entityType.value)) {
    return apiErrorResponse(
      `entityType must be one of: ${validTypes.join(', ')}`,
      'INVALID_ENTITY_TYPE',
      400,
    )
  }

  // Optional metrics filter
  const metrics = Array.isArray(body.metrics)
    ? body.metrics.filter((m: unknown) => typeof m === 'string') as string[]
    : undefined

  // Optional minimum sample size
  const minSampleSize = typeof body.minSampleSize === 'number'
    ? Math.max(1, Math.min(body.minSampleSize, 1000))
    : undefined

  const result = await runEvaluationPipeline({
    entityType: entityType.value,
    metrics,
    minSampleSize,
  })

  return apiResponse(result)
}

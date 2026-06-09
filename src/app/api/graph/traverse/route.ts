import {
  apiResponse,
  apiErrorResponse,
  getClientIp,
  handleApiError,
  methodNotAllowed,
  readRateLimiter,
  withSecurityHeaders,
  validateString,
  validateInt,
} from '@/lib/api-utils'
import { NextResponse } from 'next/server'
import { traverseGraph, type TraversalOptions } from '@/lib/graph-engine'

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

    const { startEntityId, options } = body as Record<string, unknown>

    // ── Validate Required Fields ───────────────────────────────────────
    if (typeof startEntityId !== 'string' || startEntityId.trim().length === 0) {
      return apiErrorResponse('startEntityId is required and must be a non-empty string', 'INVALID_START_ENTITY', 400)
    }

    // ── Validate Options ───────────────────────────────────────────────
    const traversalOptions: TraversalOptions = {}

    if (options && typeof options === 'object') {
      const opts = options as Record<string, unknown>

      // maxDepth
      if (opts.maxDepth !== undefined) {
        const depth = typeof opts.maxDepth === 'number' ? opts.maxDepth : parseInt(String(opts.maxDepth), 10)
        if (isNaN(depth) || depth < 1 || depth > 4) {
          return apiErrorResponse('maxDepth must be between 1 and 4', 'INVALID_MAX_DEPTH', 400)
        }
        traversalOptions.maxDepth = depth
      }

      // direction
      if (opts.direction !== undefined) {
        if (!['outgoing', 'incoming', 'both'].includes(String(opts.direction))) {
          return apiErrorResponse('direction must be one of: outgoing, incoming, both', 'INVALID_DIRECTION', 400)
        }
        traversalOptions.direction = String(opts.direction) as TraversalOptions['direction']
      }

      // limit
      if (opts.limit !== undefined) {
        const limitVal = typeof opts.limit === 'number' ? opts.limit : parseInt(String(opts.limit), 10)
        if (isNaN(limitVal) || limitVal < 1 || limitVal > 500) {
          return apiErrorResponse('limit must be between 1 and 500', 'INVALID_LIMIT', 400)
        }
        traversalOptions.limit = limitVal
      }

      // relationTypes
      if (opts.relationTypes !== undefined) {
        if (!Array.isArray(opts.relationTypes)) {
          return apiErrorResponse('relationTypes must be an array of strings', 'INVALID_RELATION_TYPES', 400)
        }
        traversalOptions.relationTypes = opts.relationTypes.map(String)
      }

      // nodeTypes
      if (opts.nodeTypes !== undefined) {
        if (!Array.isArray(opts.nodeTypes)) {
          return apiErrorResponse('nodeTypes must be an array of strings', 'INVALID_NODE_TYPES', 400)
        }
        traversalOptions.nodeTypes = opts.nodeTypes.map(String)
      }
    }

    // ── Execute Traversal ──────────────────────────────────────────────
    const result = await traverseGraph(startEntityId, traversalOptions)

    return apiResponse({
      startEntityId,
      options: traversalOptions,
      ...result,
    })
  } catch (error) {
    return handleApiError(error, 'Graph Traverse API')
  }
}

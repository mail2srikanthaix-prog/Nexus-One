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
import { queryGraph } from '@/lib/graph-engine'

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

    // Parse query parameters
    const namePattern = searchParams.get('namePattern') || undefined
    const relationType = searchParams.get('relationType') || undefined
    const connectedTo = searchParams.get('connectedTo') || undefined

    // Parse comma-separated nodeTypes
    const nodeTypesStr = searchParams.get('nodeTypes')
    const nodeTypes = nodeTypesStr ? nodeTypesStr.split(',').map(s => s.trim()).filter(Boolean) : undefined

    // Parse properties from JSON string
    const propertiesStr = searchParams.get('properties')
    let properties: Record<string, unknown> | undefined
    if (propertiesStr) {
      try {
        properties = JSON.parse(propertiesStr)
      } catch {
        return apiErrorResponse('properties must be a valid JSON string', 'INVALID_PROPERTIES', 400)
      }
    }

    const limitStr = searchParams.get('limit')
    const limit = limitStr ? parseInt(limitStr, 10) : 50
    if (isNaN(limit) || limit < 1 || limit > 500) {
      return apiErrorResponse('limit must be between 1 and 500', 'INVALID_LIMIT', 400)
    }

    const offsetStr = searchParams.get('offset')
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0
    if (isNaN(offset) || offset < 0) {
      return apiErrorResponse('offset must be a non-negative integer', 'INVALID_OFFSET', 400)
    }

    const result = await queryGraph({
      nodeTypes,
      namePattern,
      properties,
      relationType,
      connectedTo,
      limit,
      offset,
    })

    return apiResponse({
      ...result,
      offset,
      limit,
    })
  } catch (error) {
    return handleApiError(error, 'Graph Query API')
  }
}

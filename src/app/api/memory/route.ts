import { db } from '@/lib/db'
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
import { NextResponse } from 'next/server'

const VALID_MEMORY_TYPES = ['strategic', 'episodic', 'procedural', 'operational', 'semantic'] as const

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

    // ── Input Validation ───────────────────────────────────────────────
    const typeResult = validateEnum(searchParams.get('type'), 'type', [...VALID_MEMORY_TYPES])
    if (!typeResult.valid) {
      return apiErrorResponse(typeResult.error!, 'INVALID_TYPE', 400)
    }
    const type = typeResult.value

    const qResult = validateString(searchParams.get('q'), 'q', { maxLen: 200 })
    if (!qResult.valid) {
      return apiErrorResponse(qResult.error!, 'INVALID_QUERY', 400)
    }
    const q = qResult.value

    // ── Build where clause ─────────────────────────────────────────────
    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
        { source: { contains: q } },
      ]
    }

    const [memories, total, typeCountRows] = await Promise.all([
      db.memory.findMany({
        where,
        orderBy: { importance: 'desc' },
        take: 50,
      }),
      db.memory.count({ where }),
      // Use groupBy for type counts instead of fetching all memories
      db.memory.groupBy({ by: ['type'], _count: { type: true } }),
    ])

    const typeCounts: Record<string, number> = {}
    for (const row of typeCountRows) {
      typeCounts[row.type] = row._count.type
    }

    return apiResponse({
      memories,
      typeCounts,
      total,
    })
  } catch (error) {
    return handleApiError(error, 'Memory API')
  }
}

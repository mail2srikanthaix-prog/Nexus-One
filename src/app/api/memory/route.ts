import { db } from '@/lib/db'
import {
  apiResponse,
  apiErrorResponse,
  getClientIp,
  handleApiError,
  methodNotAllowed,
  readRateLimiter,
  validateString,
  validateInt,
  validateEnum,
  withSecurityHeaders,
} from '@/lib/api-utils'
import { paginate, paginationToSkipTake } from '@/lib/performance'
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

    // ── Pagination params (backward compatible: defaults page=1, pageSize=50) ──
    const pageResult = validateInt(searchParams.get('page'), 'page', { min: 1, default: 1 })
    if (!pageResult.valid) {
      return apiErrorResponse(pageResult.error!, 'INVALID_PAGE', 400)
    }

    const pageSizeResult = validateInt(searchParams.get('pageSize'), 'pageSize', { min: 1, max: 100, default: 50 })
    if (!pageSizeResult.valid) {
      return apiErrorResponse(pageSizeResult.error!, 'INVALID_PAGE_SIZE', 400)
    }

    const { skip, take, page, pageSize } = paginationToSkipTake({
      page: pageResult.value,
      pageSize: pageSizeResult.value,
    })

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

    // ── Determine if pagination is being used ──────────────────────────
    const usePagination = searchParams.has('page') || searchParams.has('pageSize')

    if (usePagination) {
      // ── Paginated response ─────────────────────────────────────────
      const [memories, total, typeCountRows] = await Promise.all([
        db.memory.findMany({
          where,
          orderBy: { importance: 'desc' },
          skip,
          take,
        }),
        db.memory.count({ where }),
        db.memory.groupBy({ by: ['type'], _count: { type: true }, where }),
      ])

      const typeCounts: Record<string, number> = {}
      for (const row of typeCountRows) {
        typeCounts[row.type] = row._count.type
      }

      const paginatedResult = await paginate(
        Promise.resolve(memories),
        Promise.resolve(total),
        { page, pageSize },
      )

      return apiResponse({
        memories: paginatedResult.data,
        typeCounts,
        total: paginatedResult.pagination.totalItems,
        pagination: paginatedResult.pagination,
      })
    } else {
      // ── Legacy (non-paginated) response — backward compatible ────────
      const [memories, total, typeCountRows] = await Promise.all([
        db.memory.findMany({
          where,
          orderBy: { importance: 'desc' },
          take: 50,
        }),
        db.memory.count({ where }),
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
    }
  } catch (error) {
    return handleApiError(error, 'Memory API')
  }
}

import { db } from '@/lib/db'
import { apiResponse, apiErrorResponse, getClientIp, handleApiError, methodNotAllowed, readRateLimiter, validateInt, withSecurityHeaders } from '@/lib/api-utils'
import { paginate, paginationToSkipTake } from '@/lib/performance'
import { getTenantId, addTenantFilter } from '@/lib/tenant-context'
import { NextResponse } from 'next/server'

// Method guard: only GET and HEAD allowed
export async function POST() { return methodNotAllowed(['GET', 'HEAD']) }
export async function PUT() { return methodNotAllowed(['GET', 'HEAD']) }
export async function DELETE() { return methodNotAllowed(['GET', 'HEAD']) }
export async function PATCH() { return methodNotAllowed(['GET', 'HEAD']) }

export async function HEAD() {
  const response = new NextResponse(null, { status: 200 })
  return withSecurityHeaders(response)
}

/**
 * Safely parse a JSON capabilities string into an array.
 * The seed data stores capabilities as JSON arrays, but they
 * may also be plain strings – handle both gracefully.
 */
function parseCapabilities(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    // If it parsed but isn't an array, wrap in array
    return [String(parsed)]
  } catch {
    // Not valid JSON – treat as a single capability string
    return [raw]
  }
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

    // ── Tenant context ─────────────────────────────────────────────────
    const tenantId = await getTenantId(request)
    const where = tenantId ? addTenantFilter({}, tenantId) : {}

    // ── Determine if pagination is being used ──────────────────────────
    const usePagination = searchParams.has('page') || searchParams.has('pageSize')

    if (usePagination) {
      // ── Paginated response ─────────────────────────────────────────
      const [agents, totalCount] = await Promise.all([
        db.agent.findMany({
          where,
          include: {
            actions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
          orderBy: { name: 'asc' },
          skip,
          take,
        }),
        db.agent.count({ where }),
      ])

      // Parse capabilities from JSON strings to proper arrays
      const parsedAgents = agents.map(agent => ({
        ...agent,
        capabilities: parseCapabilities(agent.capabilities),
      }))

      const statusCounts = {
        idle: agents.filter(a => a.status === 'idle').length,
        thinking: agents.filter(a => a.status === 'thinking').length,
        executing: agents.filter(a => a.status === 'executing').length,
        reporting: agents.filter(a => a.status === 'reporting').length,
        error: agents.filter(a => a.status === 'error').length,
      }

      const paginatedResult = await paginate(
        Promise.resolve(parsedAgents),
        Promise.resolve(totalCount),
        { page, pageSize },
      )

      return apiResponse({
        agents: paginatedResult.data,
        statusCounts,
        total: paginatedResult.pagination.totalItems,
        pagination: paginatedResult.pagination,
      })
    } else {
      // ── Legacy (non-paginated) response — backward compatible ────────
      const agents = await db.agent.findMany({
        where,
        include: {
          actions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
        orderBy: { name: 'asc' },
      })

      // Parse capabilities from JSON strings to proper arrays
      const parsedAgents = agents.map(agent => ({
        ...agent,
        capabilities: parseCapabilities(agent.capabilities),
      }))

      const statusCounts = {
        idle: agents.filter(a => a.status === 'idle').length,
        thinking: agents.filter(a => a.status === 'thinking').length,
        executing: agents.filter(a => a.status === 'executing').length,
        reporting: agents.filter(a => a.status === 'reporting').length,
        error: agents.filter(a => a.status === 'error').length,
      }

      return apiResponse({ agents: parsedAgents, statusCounts, total: agents.length })
    }
  } catch (error) {
    return handleApiError(error, 'Agents API')
  }
}

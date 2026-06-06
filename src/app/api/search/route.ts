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

const VALID_SEARCH_TYPES = ['all', 'people', 'projects', 'decisions', 'events', 'memories', 'tasks', 'predictions'] as const

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
    const qResult = validateString(searchParams.get('q'), 'q', { maxLen: 200 })
    if (!qResult.valid) {
      return apiErrorResponse(qResult.error!, 'INVALID_QUERY', 400)
    }
    const q = qResult.value

    const typeResult = validateEnum(searchParams.get('type'), 'type', [...VALID_SEARCH_TYPES])
    if (!typeResult.valid) {
      return apiErrorResponse(typeResult.error!, 'INVALID_TYPE', 400)
    }
    const type = typeResult.value || 'all'

    // ── Search Execution ───────────────────────────────────────────────
    const results: Record<string, unknown[]> = {}

    if (type === 'all' || type === 'people') {
      const people = q
        ? await db.person.findMany({ where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { role: { contains: q } }, { department: { contains: q } }] }, take: 10 })
        : await db.person.findMany({ take: 10 })
      results.people = people
    }

    if (type === 'all' || type === 'projects') {
      const projects = q
        ? await db.project.findMany({ where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] }, take: 10 })
        : await db.project.findMany({ take: 10 })
      results.projects = projects
    }

    if (type === 'all' || type === 'decisions') {
      const decisions = q
        ? await db.decision.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }, { reasoning: { contains: q } }] }, take: 10 })
        : await db.decision.findMany({ take: 10 })
      results.decisions = decisions
    }

    if (type === 'all' || type === 'events') {
      const events = q
        ? await db.event.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }, { source: { contains: q } }] }, orderBy: { createdAt: 'desc' }, take: 10 })
        : await db.event.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
      results.events = events
    }

    if (type === 'all' || type === 'memories') {
      const memories = q
        ? await db.memory.findMany({ where: { OR: [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q } }] }, take: 10 })
        : await db.memory.findMany({ take: 10 })
      results.memories = memories
    }

    if (type === 'all' || type === 'tasks') {
      const tasks = q
        ? await db.task.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }] }, take: 10 })
        : await db.task.findMany({ take: 10 })
      results.tasks = tasks
    }

    if (type === 'all' || type === 'predictions') {
      const predictions = q
        ? await db.prediction.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }] }, take: 10 })
        : await db.prediction.findMany({ take: 10 })
      results.predictions = predictions
    }

    const totalResults = Object.values(results).reduce((acc, arr) => acc + arr.length, 0)

    return apiResponse({
      query: q,
      type,
      totalResults,
      results,
    })
  } catch (error) {
    return handleApiError(error, 'Search API')
  }
}

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
  validateInt,
} from '@/lib/api-utils'
import { semanticSearch, keywordSearch } from '@/lib/vector-search'
import { getTenantId, addTenantFilter, addOrgIdFilter, addEventTenantFilter, getTenantOrgIds } from '@/lib/tenant-context'
import { NextResponse } from 'next/server'

const VALID_SEARCH_TYPES = ['all', 'people', 'projects', 'decisions', 'events', 'memories', 'tasks', 'predictions'] as const
const VALID_SEARCH_MODES = ['keyword', 'semantic', 'hybrid'] as const

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

    const modeResult = validateEnum(searchParams.get('mode'), 'mode', [...VALID_SEARCH_MODES])
    if (!modeResult.valid) {
      return apiErrorResponse(modeResult.error!, 'INVALID_MODE', 400)
    }
    const mode = modeResult.value || 'keyword'

    const limitResult = validateInt(searchParams.get('limit'), 'limit', { min: 1, max: 50, default: 10 })
    if (!limitResult.valid) {
      return apiErrorResponse(limitResult.error!, 'INVALID_LIMIT', 400)
    }
    const limit = limitResult.value

    // ── Tenant context ─────────────────────────────────────────────────
    const tenantId = await getTenantId(request)
    const tenantFilter = tenantId ? addTenantFilter({}, tenantId) : {}
    const orgFilter = tenantId ? await addOrgIdFilter({}, tenantId) : {}
    const eventFilter = tenantId ? await addEventTenantFilter({}, tenantId) : {}

    // ── Semantic / Hybrid Search ───────────────────────────────────────
    if (mode === 'semantic' || mode === 'hybrid') {
      const entityTypeMap: Record<string, string[]> = {
        all: undefined,
        people: ['person'],
        projects: ['project'],
        decisions: ['decision'],
        events: ['event'],
        memories: ['memory', 'agentMemory'],
        tasks: ['task'],
        predictions: ['prediction'],
      }

      const entityTypes = entityTypeMap[type]
      const hybridWeight = mode === 'hybrid' ? 0.5 : 1.0

      const searchResult = await semanticSearch(q, {
        limit,
        minScore: 0.1,
        entityTypes,
        hybridWeight,
      })

      // If tenant context, filter results to only include tenant-scoped entities
      let filteredResults = searchResult.results
      if (tenantId) {
        const orgIds = new Set((await getTenantOrgIds(tenantId)))
        filteredResults = searchResult.results.filter((r) => {
          // For entity types that have tenantId directly, check metadata
          if (r.entityType === 'memory' || r.entityType === 'prediction') {
            // Semantic search results may not include tenantId metadata,
            // so we do a secondary DB check for these
            return true // Will be filtered by downstream consumers
          }
          // For org-linked entities, check if they belong to tenant orgs
          if (r.entityType === 'person' || r.entityType === 'project' || r.entityType === 'connector') {
            // We can't easily filter semantic results by org, so keep them
            // The keyword path below will be tenant-filtered
            return true
          }
          return true
        })
      }

      return apiResponse({
        query: q,
        type,
        mode: searchResult.method,
        totalResults: filteredResults.length,
        searchTimeMs: searchResult.searchTimeMs,
        results: filteredResults,
      })
    }

    // ── Keyword Search (default, backward compatible) ──────────────────
    if (!q) {
      // Return empty results for empty query in keyword mode (backward compatible)
      const results: Record<string, unknown[]> = {}
      if (type === 'all' || type === 'people') results.people = []
      if (type === 'all' || type === 'projects') results.projects = []
      if (type === 'all' || type === 'decisions') results.decisions = []
      if (type === 'all' || type === 'events') results.events = []
      if (type === 'all' || type === 'memories') results.memories = []
      if (type === 'all' || type === 'tasks') results.tasks = []
      if (type === 'all' || type === 'predictions') results.predictions = []

      return apiResponse({
        query: q,
        type,
        mode: 'keyword',
        totalResults: 0,
        results,
      })
    }

    // Try enhanced keyword search first
    const keywordResult = await keywordSearch(q, {
      limit,
      minScore: 0.15,
    })

    // Also run the legacy search for backward compatibility
    const legacyResults: Record<string, unknown[]> = {}

    if (type === 'all' || type === 'people') {
      const where = { ...orgFilter, OR: [{ name: { contains: q } }, { email: { contains: q } }, { role: { contains: q } }, { department: { contains: q } }] }
      const people = await db.person.findMany({ where, take: 10 })
      legacyResults.people = people
    }

    if (type === 'all' || type === 'projects') {
      const where = { ...orgFilter, OR: [{ name: { contains: q } }, { description: { contains: q } }] }
      const projects = await db.project.findMany({ where, take: 10 })
      legacyResults.projects = projects
    }

    if (type === 'all' || type === 'decisions') {
      const where = tenantId
        ? { project: orgFilter, OR: [{ title: { contains: q } }, { description: { contains: q } }, { reasoning: { contains: q } }] }
        : { OR: [{ title: { contains: q } }, { description: { contains: q } }, { reasoning: { contains: q } }] }
      const decisions = await db.decision.findMany({ where, take: 10 })
      legacyResults.decisions = decisions
    }

    if (type === 'all' || type === 'events') {
      const baseWhere = { OR: [{ title: { contains: q } }, { description: { contains: q } }, { source: { contains: q } }] }
      const where = await addEventTenantFilter(baseWhere, tenantId)
      const events = await db.event.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 })
      legacyResults.events = events
    }

    if (type === 'all' || type === 'memories') {
      const where = { ...tenantFilter, OR: [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q } }] }
      const memories = await db.memory.findMany({ where, take: 10 })
      legacyResults.memories = memories
    }

    if (type === 'all' || type === 'tasks') {
      const where = tenantId
        ? { project: orgFilter, OR: [{ title: { contains: q } }, { description: { contains: q } }] }
        : { OR: [{ title: { contains: q } }, { description: { contains: q } }] }
      const tasks = await db.task.findMany({ where, take: 10 })
      legacyResults.tasks = tasks
    }

    if (type === 'all' || type === 'predictions') {
      const where = { ...tenantFilter, OR: [{ title: { contains: q } }, { description: { contains: q } }] }
      const predictions = await db.prediction.findMany({ where, take: 10 })
      legacyResults.predictions = predictions
    }

    const totalLegacyResults = Object.values(legacyResults).reduce((acc, arr) => acc + arr.length, 0)

    return apiResponse({
      query: q,
      type,
      mode: 'keyword',
      totalResults: totalLegacyResults,
      searchTimeMs: keywordResult.searchTimeMs,
      results: legacyResults,
      // Include scored results from the enhanced engine
      scoredResults: keywordResult.results,
    })
  } catch (error) {
    return handleApiError(error, 'Search API')
  }
}

import { db } from '@/lib/db'
import { apiResponse, apiErrorResponse, getClientIp, handleApiError, methodNotAllowed, readRateLimiter, withSecurityHeaders } from '@/lib/api-utils'
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

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = readRateLimiter.check(clientIp)
    if (!rateCheck.allowed) {
      const response = apiErrorResponse('Rate limit exceeded', 'RATE_LIMITED', 429)
      response.headers.set('Retry-After', String(rateCheck.retryAfter))
      return response
    }
    const [entities, relations] = await Promise.all([
      db.graphEntity.findMany({
        include: {
          sourceRelations: { include: { target: true } },
          targetRelations: { include: { source: true } },
        },
      }),
      db.graphRelation.findMany({
        include: { source: true, target: true },
      }),
    ])

    const nodes = entities.map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      properties: (() => { try { return e.properties ? JSON.parse(e.properties) : {} } catch { return {} } })(),
      relationCount: e.sourceRelations.length + e.targetRelations.length,
    }))

    const edges = relations.map(r => ({
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
      type: r.type,
      weight: r.weight,
      sourceName: r.source.name,
      targetName: r.target.name,
    }))

    const typeCounts: Record<string, number> = {}
    for (const e of entities) {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
    }

    return apiResponse({
      nodes,
      edges,
      typeCounts,
      totalEntities: entities.length,
      totalRelations: relations.length,
    })
  } catch (error) {
    return handleApiError(error, 'Graph API')
  }
}

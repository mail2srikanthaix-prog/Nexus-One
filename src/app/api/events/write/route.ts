/**
 * NEXUS ONE — Domain Event Write API
 *
 * POST /api/events/write — Emit a new domain event
 *
 * Validates the event schema, stores it in the DomainEvent table,
 * also creates a corresponding Event record for the UI, and returns
 * the created event.
 *
 * Request body:
 * {
 *   eventType: string       (required) — e.g. 'project.created', 'task.completed'
 *   aggregateId: string     (required) — The entity ID this event belongs to
 *   aggregateType: string   (required) — e.g. 'Project', 'Task', 'Agent'
 *   payload: object         (required) — Full event data (stored as JSON)
 *   metadata?: object       — Correlation IDs, causation IDs, etc.
 *   actorId?: string        — Who triggered this event
 *   actorType?: string      — 'user' | 'agent' | 'system'
 *   tenantId?: string       — Tenant for multi-tenancy
 *   // Convenience fields for also creating an Event record:
 *   title?: string          — Display title (defaults to eventType)
 *   severity?: string       — 'info' | 'warning' | 'error' | 'critical'
 *   description?: string    — Human-readable description
 *   source?: string         — Event source
 *   personId?: string       — Related person ID
 *   projectId?: string      — Related project ID
 * }
 */

import { db } from '@/lib/db'
import {
  apiResponse,
  apiErrorResponse,
  handleApiError,
  methodNotAllowed,
  getClientIp,
  RateLimiter,
} from '@/lib/api-utils'

// ── Rate Limiter: 20 writes per minute per IP ──────────────────────────────

const writeRateLimiter = new RateLimiter(20, 60_000)

// ── Valid Values ───────────────────────────────────────────────────────────

const VALID_SEVERITIES = ['info', 'warning', 'error', 'critical'] as const
const VALID_ACTOR_TYPES = ['user', 'agent', 'system'] as const

// ── Method Guards ──────────────────────────────────────────────────────────

export async function GET() { return methodNotAllowed(['POST']) }
export async function PUT() { return methodNotAllowed(['POST']) }
export async function DELETE() { return methodNotAllowed(['POST']) }
export async function PATCH() { return methodNotAllowed(['POST']) }

// ── POST: Emit Domain Event ────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── Rate Limiting ──────────────────────────────────────────────────
    const clientIp = getClientIp(request)
    const rateCheck = writeRateLimiter.check(clientIp)
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

    const {
      eventType,
      aggregateId,
      aggregateType,
      payload,
      metadata,
      actorId,
      actorType,
      tenantId,
      // Convenience fields for Event record
      title,
      severity,
      description,
      source,
      personId,
      projectId,
    } = body as Record<string, unknown>

    // ── Validate Required Fields ───────────────────────────────────────
    if (!eventType || typeof eventType !== 'string') {
      return apiErrorResponse('eventType is required and must be a string', 'INVALID_EVENT_TYPE', 400)
    }

    if (!aggregateId || typeof aggregateId !== 'string') {
      return apiErrorResponse('aggregateId is required and must be a string', 'INVALID_AGGREGATE_ID', 400)
    }

    if (!aggregateType || typeof aggregateType !== 'string') {
      return apiErrorResponse('aggregateType is required and must be a string', 'INVALID_AGGREGATE_TYPE', 400)
    }

    if (payload === undefined || payload === null) {
      return apiErrorResponse('payload is required', 'INVALID_PAYLOAD', 400)
    }

    // ── Validate Optional Fields ───────────────────────────────────────
    if (actorType !== undefined && !VALID_ACTOR_TYPES.includes(actorType as typeof VALID_ACTOR_TYPES[number])) {
      return apiErrorResponse(
        `actorType must be one of: ${VALID_ACTOR_TYPES.join(', ')}`,
        'INVALID_ACTOR_TYPE',
        400
      )
    }

    if (severity !== undefined && !VALID_SEVERITIES.includes(severity as typeof VALID_SEVERITIES[number])) {
      return apiErrorResponse(
        `severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
        'INVALID_SEVERITY',
        400
      )
    }

    // Validate personId references a real person (if provided)
    if (personId && typeof personId === 'string') {
      const person = await db.person.findUnique({ where: { id: personId } })
      if (!person) {
        return apiErrorResponse(`Person not found: ${personId}`, 'INVALID_PERSON_ID', 400)
      }
    }

    // Validate projectId references a real project (if provided)
    if (projectId && typeof projectId === 'string') {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) {
        return apiErrorResponse(`Project not found: ${projectId}`, 'INVALID_PROJECT_ID', 400)
      }
    }

    // ── Compute Version for Optimistic Concurrency ─────────────────────
    const lastEvent = await db.domainEvent.findFirst({
      where: { aggregateId, aggregateType },
      orderBy: { version: 'desc' },
    })
    const nextVersion = (lastEvent?.version || 0) + 1

    // ── Store Domain Event ─────────────────────────────────────────────
    const domainEvent = await db.domainEvent.create({
      data: {
        eventType,
        aggregateId,
        aggregateType,
        version: nextVersion,
        payload: JSON.stringify(payload),
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        actorId: (actorId as string) || undefined,
        actorType: (actorType as string) || undefined,
        tenantId: (tenantId as string) || undefined,
      },
    })

    // ── Also Create Event Record for UI ────────────────────────────────
    const eventTitle = (title as string) || eventType
    const eventSeverity = (severity as string) || 'info'
    const eventSource = (source as string) || `domain:${aggregateType.toLowerCase()}`

    const event = await db.event.create({
      data: {
        type: eventType,
        title: eventTitle,
        description: (description as string) || `Domain event: ${eventType} on ${aggregateType}#${aggregateId}`,
        severity: eventSeverity,
        source: eventSource,
        metadata: JSON.stringify({ domainEventId: domainEvent.id, aggregateId, aggregateType, version: nextVersion }),
        personId: (personId as string) || undefined,
        projectId: (projectId as string) || undefined,
      },
    })

    // ── Log to Audit Log ───────────────────────────────────────────────
    await db.auditLog.create({
      data: {
        action: `domain_event.${eventType}`,
        actor: actorType === 'agent' ? `agent:${actorId}` : (actorId as string) || 'system',
        actorId: (actorId as string) || undefined,
        resource: aggregateId,
        resourceType: aggregateType,
        details: JSON.stringify({ eventType, version: nextVersion }),
        severity: eventSeverity,
        tenantId: (tenantId as string) || undefined,
      },
    })

    // ── Return Created Event ───────────────────────────────────────────
    return apiResponse(
      {
        domainEvent: {
          id: domainEvent.id,
          eventType: domainEvent.eventType,
          aggregateId: domainEvent.aggregateId,
          aggregateType: domainEvent.aggregateType,
          version: domainEvent.version,
          payload: JSON.parse(domainEvent.payload),
          metadata: domainEvent.metadata ? JSON.parse(domainEvent.metadata) : null,
          actorId: domainEvent.actorId,
          actorType: domainEvent.actorType,
          tenantId: domainEvent.tenantId,
          createdAt: domainEvent.createdAt,
        },
        event: {
          id: event.id,
          type: event.type,
          title: event.title,
          severity: event.severity,
          source: event.source,
          createdAt: event.createdAt,
        },
      },
      201
    )
  } catch (error) {
    return handleApiError(error, 'Events Write API')
  }
}

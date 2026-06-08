/**
 * Event Sourcing Engine
 * Provides a domain event system for tracking state changes across aggregates.
 * Uses the DomainEvent Prisma model for persistence.
 */

import { db } from '@/lib/db'

export interface DomainEventInput {
  eventType: string
  aggregateId: string
  aggregateType: string
  payload: Record<string, unknown>
  metadata?: Record<string, unknown>
  actorId?: string
  actorType?: 'user' | 'agent' | 'system'
  tenantId?: string
}

/**
 * Emit a new domain event. Automatically increments the version for the aggregate.
 */
export async function emitEvent(input: DomainEventInput) {
  // Get current version for this aggregate to support optimistic concurrency
  const lastEvent = await db.domainEvent.findFirst({
    where: { aggregateId: input.aggregateId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })

  const nextVersion = (lastEvent?.version ?? 0) + 1

  const event = await db.domainEvent.create({
    data: {
      eventType: input.eventType,
      aggregateId: input.aggregateId,
      aggregateType: input.aggregateType,
      version: nextVersion,
      payload: JSON.stringify(input.payload),
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? null,
      tenantId: input.tenantId ?? null,
    },
  })

  return event
}

/**
 * Get the full event stream for an aggregate, ordered by version.
 * Optionally filter from a specific version and limit results.
 */
export async function getEventStream(
  aggregateId: string,
  options?: { fromVersion?: number; limit?: number }
) {
  const where: Record<string, unknown> = { aggregateId }

  if (options?.fromVersion !== undefined) {
    where.version = { gte: options.fromVersion }
  }

  const events = await db.domainEvent.findMany({
    where,
    orderBy: { version: 'asc' },
    take: options?.limit ?? 100,
  })

  return events
}

/**
 * Get events by type. Useful for building read models or event processors.
 */
export async function getEventsByType(
  eventType: string,
  options?: { limit?: number; from?: Date }
) {
  const where: Record<string, unknown> = { eventType }

  if (options?.from) {
    where.createdAt = { gte: options.from }
  }

  const events = await db.domainEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
  })

  return events
}

/**
 * Replay all events for an aggregate through a handler function.
 * Useful for rebuilding aggregate state from events.
 */
export async function replayEvents(
  aggregateId: string,
  handler: (event: {
    id: string
    eventType: string
    aggregateId: string
    aggregateType: string
    version: number
    payload: string
    metadata: string | null
    actorId: string | null
    actorType: string | null
    tenantId: string | null
    createdAt: Date
  }) => Promise<void>
) {
  const events = await db.domainEvent.findMany({
    where: { aggregateId },
    orderBy: { version: 'asc' },
  })

  for (const event of events) {
    await handler(event)
  }
}

/**
 * Get the current version number for an aggregate.
 * Returns 0 if no events exist for the aggregate.
 */
export async function getAggregateVersion(aggregateId: string): Promise<number> {
  const lastEvent = await db.domainEvent.findFirst({
    where: { aggregateId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })

  return lastEvent?.version ?? 0
}

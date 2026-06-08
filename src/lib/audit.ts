/**
 * Enhanced Audit Trail System — Comprehensive Activity Logging
 *
 * Provides structured audit logging for all API access, security events,
 * and system actions. Writes to the AuditLog table via Prisma.
 */

import { db } from '@/lib/db'

// ─── Type Definitions ────────────────────────────────────────────────────────

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface AuditEvent {
  action: string
  actor: string
  actorId?: string
  resource: string
  resourceType?: string
  details?: string
  severity: AuditSeverity
  ipAddress?: string
  userAgent?: string
  tenantId?: string
  requestId?: string
  duration?: number
}

// ─── In-Memory Buffer for Batched Writes ─────────────────────────────────────

const AUDIT_BUFFER_SIZE = 25
const AUDIT_FLUSH_INTERVAL_MS = 5_000

let auditBuffer: AuditEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

/**
 * Start the periodic flush timer.
 * Safe to call multiple times — won't create duplicate timers.
 */
function startFlushTimer(): void {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    flushAuditBuffer().catch((err) => {
      console.error('[Audit] Periodic flush error:', err)
    })
  }, AUDIT_FLUSH_INTERVAL_MS)
  // Don't prevent process exit
  if (typeof flushTimer.unref === 'function') {
    flushTimer.unref()
  }
}

/**
 * Flush all buffered audit events to the database.
 */
async function flushAuditBuffer(): Promise<void> {
  if (auditBuffer.length === 0) return

  // Swap the buffer to avoid concurrent writes
  const events = auditBuffer.splice(0, auditBuffer.length)

  try {
    await db.auditLog.createMany({
      data: events.map((event) => ({
        action: event.action,
        actor: event.actor,
        actorId: event.actorId ?? null,
        resource: event.resource,
        resourceType: event.resourceType ?? null,
        details: event.details ?? null,
        severity: event.severity,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        tenantId: event.tenantId ?? null,
        requestId: event.requestId ?? null,
        duration: event.duration ?? null,
      })),
    })
  } catch (error) {
    console.error('[Audit] Failed to write audit events:', error)
    // Re-queue failed events (up to a limit to prevent memory leaks)
    if (auditBuffer.length < AUDIT_BUFFER_SIZE * 4) {
      auditBuffer.unshift(...events.slice(0, AUDIT_BUFFER_SIZE))
    }
  }
}

// Start the flush timer on module load
startFlushTimer()

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Log an audit event.
 * Events are buffered and written in batches for performance.
 * For critical events, use `logAuditImmediate` instead.
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  auditBuffer.push(event)

  // Immediate flush if buffer is full
  if (auditBuffer.length >= AUDIT_BUFFER_SIZE) {
    await flushAuditBuffer()
  }
}

/**
 * Log an audit event immediately (not buffered).
 * Use for critical security events that must not be lost.
 */
export async function logAuditImmediate(event: AuditEvent): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: event.action,
        actor: event.actor,
        actorId: event.actorId ?? null,
        resource: event.resource,
        resourceType: event.resourceType ?? null,
        details: event.details ?? null,
        severity: event.severity,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        tenantId: event.tenantId ?? null,
        requestId: event.requestId ?? null,
        duration: event.duration ?? null,
      },
    })
  } catch (error) {
    console.error('[Audit] Failed to write immediate audit event:', error)
  }
}

/**
 * Log an API access event.
 * Convenience wrapper for the common pattern of logging API requests.
 */
export async function logApiAccess(
  request: Request,
  userId: string,
  role: string,
  duration: number
): Promise<void> {
  const url = new URL(request.url)
  const method = request.method

  await logAudit({
    action: `api.${url.pathname.replace(/\//g, '.').replace(/^\.+|\.+$/g, '')}.${method.toLowerCase()}`,
    actor: userId,
    actorId: userId,
    resource: url.pathname,
    resourceType: 'api_route',
    details: JSON.stringify({
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      role,
    }),
    severity: 'info',
    ipAddress: extractIp(request),
    userAgent: request.headers.get('user-agent') ?? undefined,
    duration,
  })
}

/**
 * Log a security event.
 * Always logged immediately (not buffered) since security events
 * must not be lost even in a crash.
 */
export async function logSecurityEvent(
  event: string,
  severity: AuditSeverity,
  details: Record<string, unknown>
): Promise<void> {
  await logAuditImmediate({
    action: `security.${event}`,
    actor: (details.actor as string) ?? 'system',
    actorId: (details.actorId as string) ?? undefined,
    resource: (details.resource as string) ?? 'system',
    resourceType: (details.resourceType as string) ?? 'security',
    details: JSON.stringify(details),
    severity,
    ipAddress: (details.ipAddress as string) ?? undefined,
    userAgent: (details.userAgent as string) ?? undefined,
    tenantId: (details.tenantId as string) ?? undefined,
    requestId: (details.requestId as string) ?? undefined,
  })
}

/**
 * Log an authentication event.
 */
export async function logAuthEvent(
  action: 'login.success' | 'login.failed' | 'logout' | 'session.expired' | 'account.locked' | 'mfa.challenge' | 'mfa.success' | 'mfa.failed',
  details: {
    email: string
    userId?: string
    ipAddress?: string
    userAgent?: string
    reason?: string
    tenantId?: string
  }
): Promise<void> {
  const severity: AuditSeverity =
    action === 'login.failed' || action === 'account.locked' || action === 'mfa.failed'
      ? 'warning'
      : 'info'

  const isCritical = action === 'account.locked'
  const logFn = isCritical ? logAuditImmediate : logAudit

  await logFn({
    action: `auth.${action}`,
    actor: details.email,
    actorId: details.userId,
    resource: 'auth',
    resourceType: 'authentication',
    details: JSON.stringify({
      action,
      email: details.email,
      reason: details.reason,
    }),
    severity: isCritical ? 'critical' : severity,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    tenantId: details.tenantId,
  })
}

/**
 * Query audit logs with filtering.
 */
export async function queryAuditLogs(options: {
  actorId?: string
  action?: string
  resourceType?: string
  severity?: AuditSeverity
  tenantId?: string
  limit?: number
  offset?: number
  startDate?: Date
  endDate?: Date
}): Promise<{ logs: Array<{ id: string; action: string; actor: string | null; actorId: string | null; resource: string | null; resourceType: string | null; details: string | null; severity: string; ipAddress: string | null; createdAt: Date }>; total: number }> {
  const where: Record<string, unknown> = {}

  if (options.actorId) where.actorId = options.actorId
  if (options.action) where.action = { contains: options.action }
  if (options.resourceType) where.resourceType = options.resourceType
  if (options.severity) where.severity = options.severity
  if (options.tenantId) where.tenantId = options.tenantId

  if (options.startDate || options.endDate) {
    const createdAt: Record<string, Date> = {}
    if (options.startDate) createdAt.gte = options.startDate
    if (options.endDate) createdAt.lte = options.endDate
    where.createdAt = createdAt
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    }),
    db.auditLog.count({ where }),
  ])

  return { logs, total }
}

/**
 * Force flush all buffered audit events.
 * Call this during graceful shutdown.
 */
export async function flushAuditEvents(): Promise<void> {
  await flushAuditBuffer()
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function extractIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

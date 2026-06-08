/**
 * NEXUS ONE — Connector API Endpoints
 *
 * - GET  /api/connectors                    — List all connectors with health status
 * - GET  /api/connectors?action=status&type=X — Get specific connector health status
 * - POST /api/connectors?action=sync&type=X   — Trigger manual sync for a connector
 * - POST /api/connectors?action=sync_all      — Trigger sync for all connectors
 * - POST /api/connectors?action=register      — Register a new connector
 * - POST /api/connectors?action=webhook&type=X — Process a webhook for a connector
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
import {
  connectorRegistry,
  syncEngine,
  handleConnectorWebhook,
  getConnectorWithStatus,
  getAllConnectorsWithStatus,
} from '@/lib/connectors'

// ── Rate Limiters ──────────────────────────────────────────────────────────

const readRateLimiter = new RateLimiter(60, 60_000)
const writeRateLimiter = new RateLimiter(10, 60_000)

// ── Method Guards ──────────────────────────────────────────────────────────

export async function PUT() { return methodNotAllowed(['GET', 'POST']) }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']) }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']) }

// ── GET: List connectors or get status ─────────────────────────────────────

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
    const action = searchParams.get('action')
    const connectorType = searchParams.get('type')

    // Get specific connector health status
    if (action === 'status' && connectorType) {
      const connectorRecord = await db.connector.findFirst({
        where: { type: connectorType },
      })
      if (!connectorRecord) {
        return apiErrorResponse(`Connector not found: ${connectorType}`, 'NOT_FOUND', 404)
      }

      const withStatus = await getConnectorWithStatus(connectorRecord)
      return apiResponse({ connector: withStatus })
    }

    // Default: list all connectors with status
    const connectors = await getAllConnectorsWithStatus()

    // Also include runtime-only connectors that might not be in the DB yet
    const runtimeTypes = connectorRegistry.types()
    const dbTypes = new Set(connectors.map((c) => c.type))
    const missingConnectors = runtimeTypes.filter((t) => !dbTypes.has(t))

    const enrichedConnectors = [...connectors]

    for (const type of missingConnectors) {
      const runtimeConnector = connectorRegistry.get(type)
      if (runtimeConnector) {
        let health
        try {
          health = await runtimeConnector.getHealthStatus()
        } catch {
          health = { status: 'down' as const, latency: 0, uptime: 0, lastError: 'Health check failed' }
        }
        enrichedConnectors.push({
          id: 'runtime-only',
          name: runtimeConnector.name,
          type: runtimeConnector.type,
          category: 'system',
          status: health.status === 'healthy' ? 'connected' : health.status === 'degraded' ? 'degraded' : 'error',
          lastSync: null,
          recordCount: null,
          orgId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          health,
          syncHistory: [],
        })
      }
    }

    // Summary stats
    const summary = {
      total: enrichedConnectors.length,
      healthy: enrichedConnectors.filter((c) => c.health?.status === 'healthy').length,
      degraded: enrichedConnectors.filter((c) => c.health?.status === 'degraded').length,
      down: enrichedConnectors.filter((c) => c.health?.status === 'down').length,
    }

    return apiResponse({
      connectors: enrichedConnectors,
      summary,
      runtimeTypes,
    })
  } catch (error) {
    return handleApiError(error, 'Connectors API')
  }
}

// ── POST: Actions (sync, register, webhook) ────────────────────────────────

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = writeRateLimiter.check(clientIp)
    if (!rateCheck.allowed) {
      const response = apiErrorResponse('Rate limit exceeded', 'RATE_LIMITED', 429)
      response.headers.set('Retry-After', String(rateCheck.retryAfter))
      return response
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'sync'
    const connectorType = searchParams.get('type')

    switch (action) {
      // ── Trigger Manual Sync ────────────────────────────────────────────
      case 'sync': {
        if (!connectorType) {
          return apiErrorResponse('type parameter is required for sync action', 'MISSING_TYPE', 400)
        }

        if (!connectorRegistry.has(connectorType)) {
          return apiErrorResponse(`Connector type not registered: ${connectorType}`, 'NOT_FOUND', 404)
        }

        const tenantId = searchParams.get('tenantId') || undefined
        const result = await syncEngine.runSync(connectorType, tenantId || '')

        return apiResponse({
          action: 'sync',
          connectorType,
          result,
        })
      }

      // ── Sync All Connectors ────────────────────────────────────────────
      case 'sync_all': {
        const tenantId = searchParams.get('tenantId') || ''
        const results = await syncEngine.runAllSyncs(tenantId)

        return apiResponse({
          action: 'sync_all',
          results,
          totalConnectors: Object.keys(results).length,
          successful: Object.values(results).filter((r) => r.success).length,
          failed: Object.values(results).filter((r) => !r.success).length,
        })
      }

      // ── Register New Connector ─────────────────────────────────────────
      case 'register': {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return apiErrorResponse('Invalid JSON body', 'INVALID_BODY', 400)
        }

        const { name, type, category, orgId } = body as Record<string, unknown>

        if (!name || !type) {
          return apiErrorResponse('name and type are required', 'MISSING_FIELDS', 400)
        }

        // Check if connector already exists
        const existing = await db.connector.findFirst({
          where: { type: type as string },
        })
        if (existing) {
          return apiErrorResponse(`Connector already exists: ${type}`, 'ALREADY_EXISTS', 409)
        }

        const connector = await db.connector.create({
          data: {
            name: name as string,
            type: type as string,
            category: (category as string) || 'custom',
            status: 'connected',
            orgId: (orgId as string) || undefined,
          },
        })

        return apiResponse({ connector, action: 'register' }, 201)
      }

      // ── Process Webhook ────────────────────────────────────────────────
      case 'webhook': {
        if (!connectorType) {
          return apiErrorResponse('type parameter is required for webhook action', 'MISSING_TYPE', 400)
        }

        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          return apiErrorResponse('Invalid JSON payload', 'INVALID_PAYLOAD', 400)
        }

        const signature = request.headers.get('x-webhook-signature') || undefined
        const result = await handleConnectorWebhook(connectorType, payload, signature)

        return apiResponse({
          action: 'webhook',
          connectorType,
          ...result,
        })
      }

      default:
        return apiErrorResponse(
          `Unknown action: ${action}. Valid actions: sync, sync_all, register, webhook`,
          'INVALID_ACTION',
          400
        )
    }
  } catch (error) {
    return handleApiError(error, 'Connectors API')
  }
}

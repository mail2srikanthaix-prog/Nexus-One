/**
 * API Key Creation Route
 *
 * POST /api/auth/api-key
 * Generates a new API key for the authenticated user.
 * Body: { name: string, permissions?: string[], expiresAt?: string (ISO 8601), tenantId?: string }
 *
 * Returns the full key ONCE — it won't be shown again.
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/audit'
import { apiResponse, apiErrorResponse, handleApiError, getClientIp } from '@/lib/api-utils'
import { generateApiKey } from '@/lib/api-key-auth'

export async function POST(request: NextRequest) {
  try {
    // ── Authenticate via session ──────────────────────────────────────
    const session = await getServerSession({
      providers: [],
      session: { strategy: 'jwt' as const },
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!session?.user) {
      return apiErrorResponse('Authentication required', 'UNAUTHENTICATED', 401)
    }

    const userId = (session.user as { id?: string }).id
    if (!userId) {
      return apiErrorResponse('Invalid session', 'INVALID_SESSION', 401)
    }

    // ── Parse request body ────────────────────────────────────────────
    const body = await request.json().catch(() => ({}))
    const { name, permissions, expiresAt, tenantId } = body as {
      name?: string
      permissions?: string[]
      expiresAt?: string
      tenantId?: string
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return apiErrorResponse('API key name is required', 'NAME_REQUIRED', 400)
    }

    if (name.trim().length > 100) {
      return apiErrorResponse('API key name must be at most 100 characters', 'NAME_TOO_LONG', 400)
    }

    // ── Limit keys per user ───────────────────────────────────────────
    const existingKeyCount = await db.apiKey.count({
      where: { userId, status: 'active' },
    })

    if (existingKeyCount >= 10) {
      return apiErrorResponse(
        'Maximum of 10 active API keys per user — revoke an existing key first',
        'KEY_LIMIT_EXCEEDED',
        400
      )
    }

    // ── Generate API key ──────────────────────────────────────────────
    const { fullKey, keyPrefix, keyHash } = generateApiKey()

    // ── Validate expiration date ──────────────────────────────────────
    let expiresAtDate: Date | null = null
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt)
      if (isNaN(expiresAtDate.getTime())) {
        return apiErrorResponse('Invalid expiresAt date format', 'INVALID_EXPIRES_AT', 400)
      }
      if (expiresAtDate <= new Date()) {
        return apiErrorResponse('Expiration date must be in the future', 'PAST_EXPIRES_AT', 400)
      }
    }

    // ── Validate tenantId if provided ─────────────────────────────────
    if (tenantId) {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
      if (!tenant) {
        return apiErrorResponse('Tenant not found', 'TENANT_NOT_FOUND', 404)
      }
    }

    // ── Store key in database ─────────────────────────────────────────
    const apiKey = await db.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyPrefix,
        userId,
        tenantId: tenantId ?? null,
        permissions: permissions ? JSON.stringify(permissions) : null,
        expiresAt: expiresAtDate,
        status: 'active',
      },
    })

    // ── Audit log ─────────────────────────────────────────────────────
    const ipAddress = getClientIp(request)
    await logSecurityEvent('api_key.created', 'info', {
      actor: session.user.email ?? 'unknown',
      actorId: userId,
      resource: `api_key:${apiKey.id}`,
      resourceType: 'api_key',
      ipAddress,
      userAgent: request.headers.get('user-agent') ?? undefined,
      keyName: name.trim(),
    })

    // ── Return full key (only time it's shown) ────────────────────────
    return apiResponse({
      id: apiKey.id,
      name: apiKey.name,
      key: fullKey,
      keyPrefix,
      permissions: permissions ?? [],
      expiresAt: expiresAtDate?.toISOString() ?? null,
      createdAt: apiKey.createdAt.toISOString(),
      warning: 'Store this key securely. It will not be shown again.',
    }, 201)
  } catch (error) {
    return handleApiError(error, 'API key creation')
  }
}

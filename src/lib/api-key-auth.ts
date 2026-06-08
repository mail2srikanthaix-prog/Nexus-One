/**
 * API Key Authentication Helper
 *
 * Provides authentication via `Authorization: Bearer nx_live_...` header.
 * Used by API routes as an alternative to session-based auth.
 *
 * Flow:
 * 1. Extract Authorization header
 * 2. Validate prefix format (nx_live_)
 * 3. Hash the key with SHA-256
 * 4. Look up in ApiKey table
 * 5. Check expiration and status
 * 6. Update lastUsedAt
 * 7. Return user context
 */

import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/audit'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiKeyAuthResult {
  userId: string
  permissions: string[]
  tenantId?: string
  apiKeyId: string
  keyName: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const API_KEY_PREFIX = 'nx_live_'
const API_KEY_RANDOM_BYTES = 32

// ─── Key Generation ────────────────────────────────────────────────────────

/**
 * Generate a new API key in the format nx_live_{random32bytes}
 * The key is hex-encoded, so the full key is nx_live_ + 64 hex characters.
 */
export function generateApiKey(): { fullKey: string; keyPrefix: string; keyHash: string } {
  const randomPart = randomBytes(API_KEY_RANDOM_BYTES).toString('hex')
  const fullKey = `${API_KEY_PREFIX}${randomPart}`
  const keyPrefix = fullKey.slice(0, 16) // nx_live_ + first 7 hex chars for display
  const keyHash = hashApiKey(fullKey)

  return { fullKey, keyPrefix, keyHash }
}

/**
 * Hash an API key using SHA-256.
 * Same pattern as security.ts hashToken but synchronous for convenience.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

// ─── Authentication ────────────────────────────────────────────────────────

/**
 * Authenticate a request using an API key from the Authorization header.
 *
 * @param request - The incoming request
 * @returns ApiKeyAuthResult if valid, null if invalid or missing
 */
export async function authenticateApiKey(request: Request): Promise<ApiKeyAuthResult | null> {
  // ── Extract Authorization header ───────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  // ── Validate Bearer format ─────────────────────────────────────────
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null

  const key = parts[1]

  // ── Validate key prefix ────────────────────────────────────────────
  if (!key.startsWith(API_KEY_PREFIX)) return null

  // ── Hash the key and look it up ────────────────────────────────────
  const keyHash = hashApiKey(key)

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: { id: true, role: true, email: true },
      },
    },
  })

  if (!apiKey) {
    // Log potential abuse — key doesn't exist
    await logSecurityEvent('api_key.invalid', 'warning', {
      resource: 'api_key',
      resourceType: 'authentication',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip')?.trim() ?? 'unknown',
      userAgent: request.headers.get('user-agent') ?? undefined,
      reason: 'API key not found in database',
    })
    return null
  }

  // ── Check status ───────────────────────────────────────────────────
  if (apiKey.status !== 'active') {
    await logSecurityEvent('api_key.revoked', 'warning', {
      actor: apiKey.user?.email ?? 'unknown',
      actorId: apiKey.userId ?? undefined,
      resource: `api_key:${apiKey.id}`,
      resourceType: 'api_key',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip')?.trim() ?? 'unknown',
      userAgent: request.headers.get('user-agent') ?? undefined,
      reason: `API key status is ${apiKey.status}`,
    })
    return null
  }

  // ── Check expiration ───────────────────────────────────────────────
  if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
    // Auto-expire the key
    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { status: 'expired' },
    })

    await logSecurityEvent('api_key.expired', 'info', {
      actor: apiKey.user?.email ?? 'unknown',
      actorId: apiKey.userId ?? undefined,
      resource: `api_key:${apiKey.id}`,
      resourceType: 'api_key',
      reason: 'API key has expired',
    })
    return null
  }

  // ── Update lastUsedAt (non-blocking) ───────────────────────────────
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {
    // Don't fail the request if this update fails
  })

  // ── Parse permissions ──────────────────────────────────────────────
  let permissions: string[] = []
  if (apiKey.permissions) {
    try {
      permissions = JSON.parse(apiKey.permissions)
    } catch {
      permissions = apiKey.permissions.split(',').map((p: string) => p.trim())
    }
  }

  // ── Return user context ────────────────────────────────────────────
  return {
    userId: apiKey.userId ?? '',
    permissions,
    tenantId: apiKey.tenantId ?? undefined,
    apiKeyId: apiKey.id,
    keyName: apiKey.name,
  }
}

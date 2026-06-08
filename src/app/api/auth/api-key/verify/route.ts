/**
 * API Key Verify Route
 *
 * POST /api/auth/api-key/verify
 * Verifies an API key and returns the associated user context.
 * Used by middleware (Edge Runtime) to validate API key authentication
 * without direct database access.
 *
 * Body: { key: string }  — the raw API key (nx_live_...)
 * Returns: { valid: boolean, userId?, permissions?, tenantId? }
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, handleApiError } from '@/lib/api-utils'
import { hashApiKey, API_KEY_PREFIX } from '@/lib/api-key-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { key } = body as { key?: string }

    if (!key || !key.startsWith(API_KEY_PREFIX)) {
      return apiResponse({
        valid: false,
        userId: null,
        permissions: [],
        tenantId: null,
      })
    }

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
      return apiResponse({
        valid: false,
        userId: null,
        permissions: [],
        tenantId: null,
      })
    }

    // ── Check status ───────────────────────────────────────────────────
    if (apiKey.status !== 'active') {
      return apiResponse({
        valid: false,
        userId: null,
        permissions: [],
        tenantId: null,
      })
    }

    // ── Check expiration ───────────────────────────────────────────────
    if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
      // Auto-expire the key
      await db.apiKey.update({
        where: { id: apiKey.id },
        data: { status: 'expired' },
      })

      return apiResponse({
        valid: false,
        userId: null,
        permissions: [],
        tenantId: null,
      })
    }

    // ── Update lastUsedAt (non-blocking) ───────────────────────────────
    db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {})

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
    return apiResponse({
      valid: true,
      userId: apiKey.userId ?? '',
      permissions,
      tenantId: apiKey.tenantId ?? null,
      apiKeyId: apiKey.id,
    })
  } catch (error) {
    return handleApiError(error, 'API key verify')
  }
}

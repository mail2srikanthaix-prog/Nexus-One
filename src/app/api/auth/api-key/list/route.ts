/**
 * API Key List Route
 *
 * GET /api/auth/api-key/list
 * Lists all API keys for the current user.
 * Shows prefix, name, status, lastUsed, expiresAt — NOT the full key.
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { apiResponse, apiErrorResponse, handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
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

    // ── Fetch API keys for this user ──────────────────────────────────
    const apiKeys = await db.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        tenantId: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── Format response (never expose full key) ───────────────────────
    const keys = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix + '...' ,
      status: key.status,
      permissions: key.permissions ? JSON.parse(key.permissions) : [],
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      expiresAt: key.expiresAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
      tenantId: key.tenantId,
    }))

    return apiResponse({ keys, total: keys.length })
  } catch (error) {
    return handleApiError(error, 'API key list')
  }
}

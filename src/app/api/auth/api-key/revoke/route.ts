/**
 * API Key Revoke Route
 *
 * POST /api/auth/api-key/revoke
 * Revokes an API key by ID.
 * Body: { keyId: string }
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/audit'
import { apiResponse, apiErrorResponse, handleApiError, getClientIp } from '@/lib/api-utils'

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
    const { keyId } = body as { keyId?: string }

    if (!keyId) {
      return apiErrorResponse('API key ID is required', 'KEY_ID_REQUIRED', 400)
    }

    // ── Find API key (must belong to this user) ───────────────────────
    const apiKey = await db.apiKey.findUnique({
      where: { id: keyId },
    })

    if (!apiKey) {
      return apiErrorResponse('API key not found', 'KEY_NOT_FOUND', 404)
    }

    if (apiKey.userId !== userId) {
      return apiErrorResponse('You can only revoke your own API keys', 'FORBIDDEN', 403)
    }

    if (apiKey.status !== 'active') {
      return apiErrorResponse(`API key is already ${apiKey.status}`, 'KEY_ALREADY_REVOKED', 400)
    }

    // ── Revoke the key ────────────────────────────────────────────────
    await db.apiKey.update({
      where: { id: keyId },
      data: { status: 'revoked' },
    })

    // ── Audit log ─────────────────────────────────────────────────────
    const ipAddress = getClientIp(request)
    await logSecurityEvent('api_key.revoked', 'warning', {
      actor: session.user.email ?? 'unknown',
      actorId: userId,
      resource: `api_key:${keyId}`,
      resourceType: 'api_key',
      ipAddress,
      userAgent: request.headers.get('user-agent') ?? undefined,
      keyName: apiKey.name,
    })

    return apiResponse({
      revoked: true,
      keyId,
      message: `API key "${apiKey.name}" has been revoked.`,
    })
  } catch (error) {
    return handleApiError(error, 'API key revoke')
  }
}

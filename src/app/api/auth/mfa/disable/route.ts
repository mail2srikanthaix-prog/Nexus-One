/**
 * MFA Disable Route — Verify current TOTP code, then disable MFA and clear secret
 *
 * POST /api/auth/mfa/disable
 * Body: { totpCode: string }
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { logSecurityEvent, logAuthEvent } from '@/lib/audit'
import { apiResponse, apiErrorResponse, handleApiError, getClientIp } from '@/lib/api-utils'
import { TOTP } from 'otpauth'

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
    const { totpCode } = body as { totpCode?: string }

    if (!totpCode) {
      return apiErrorResponse('TOTP code is required to disable MFA', 'TOTP_REQUIRED', 400)
    }

    // ── Find user ─────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) {
      return apiErrorResponse('User not found', 'USER_NOT_FOUND', 404)
    }

    if (!user.mfaEnabled) {
      return apiErrorResponse('MFA is not enabled', 'MFA_NOT_ENABLED', 400)
    }

    if (!user.mfaSecret) {
      return apiErrorResponse('MFA secret not found — clearing MFA flag', 'MFA_SECRET_MISSING', 400)
    }

    // ── Verify TOTP code against stored secret ────────────────────────
    const totp = new TOTP({
      issuer: 'NEXUS-ONE',
      label: user.email,
      secret: user.mfaSecret,
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
    })

    const delta = totp.validate({ token: totpCode, window: 1 })
    if (delta === null) {
      const ipAddress = getClientIp(request)
      await logAuthEvent('mfa.failed', {
        email: user.email,
        userId: user.id,
        ipAddress,
        userAgent: request.headers.get('user-agent') ?? undefined,
        reason: 'Invalid TOTP code during MFA disable attempt',
      })

      return apiErrorResponse('Invalid TOTP code — please try again', 'INVALID_TOTP', 400)
    }

    // ── Disable MFA and clear secret ──────────────────────────────────
    await db.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    })

    // ── Audit log ─────────────────────────────────────────────────────
    const ipAddress = getClientIp(request)
    await logSecurityEvent('mfa.disabled', 'warning', {
      actor: user.email,
      actorId: user.id,
      resource: `user:${user.id}`,
      resourceType: 'user',
      ipAddress,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return apiResponse({
      enabled: false,
      message: 'MFA has been disabled. Your account no longer requires TOTP verification.',
    })
  } catch (error) {
    return handleApiError(error, 'MFA disable')
  }
}

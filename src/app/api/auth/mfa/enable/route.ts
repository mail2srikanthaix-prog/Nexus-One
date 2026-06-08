/**
 * MFA Enable Route — Verify a TOTP code against stored secret, then enable MFA
 *
 * POST /api/auth/mfa/enable
 * Requires the user to prove they can generate valid codes before enabling.
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
      return apiErrorResponse('TOTP code is required', 'TOTP_REQUIRED', 400)
    }

    // ── Find user ─────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) {
      return apiErrorResponse('User not found', 'USER_NOT_FOUND', 404)
    }

    if (user.mfaEnabled) {
      return apiErrorResponse('MFA is already enabled', 'MFA_ALREADY_ENABLED', 400)
    }

    if (!user.mfaSecret) {
      return apiErrorResponse('MFA secret not configured — run setup first', 'MFA_NOT_SETUP', 400)
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
        reason: 'Invalid TOTP code during MFA enable',
      })

      return apiErrorResponse('Invalid TOTP code — please try again', 'INVALID_TOTP', 400)
    }

    // ── Enable MFA ────────────────────────────────────────────────────
    await db.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    })

    // ── Audit log ─────────────────────────────────────────────────────
    const ipAddress = getClientIp(request)
    await logSecurityEvent('mfa.enabled', 'warning', {
      actor: user.email,
      actorId: user.id,
      resource: `user:${user.id}`,
      resourceType: 'user',
      ipAddress,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return apiResponse({
      enabled: true,
      message: 'MFA has been enabled. You will need a TOTP code for future logins.',
    })
  } catch (error) {
    return handleApiError(error, 'MFA enable')
  }
}

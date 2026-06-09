/**
 * MFA Setup Route — Generate a new TOTP secret for the authenticated user
 *
 * POST /api/auth/mfa/setup
 * Generates a TOTP secret, stores it (mfaSecret) but does NOT enable MFA yet.
 * Returns the otpauth:// URI for QR code generation.
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/audit'
import { apiResponse, apiErrorResponse, handleApiError, getClientIp } from '@/lib/api-utils'
import { TOTP } from 'otpauth'

export async function POST(request: NextRequest) {
  try {
    // ── Authenticate via session ──────────────────────────────────────
    // We need to reconstruct authOptions for getServerSession since the
    // NextAuth handler doesn't export them directly.
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

    // ── Find user ─────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) {
      return apiErrorResponse('User not found', 'USER_NOT_FOUND', 404)
    }

    if (user.mfaEnabled) {
      return apiErrorResponse('MFA is already enabled — disable it first to reconfigure', 'MFA_ALREADY_ENABLED', 400)
    }

    // ── Generate new TOTP secret ──────────────────────────────────────
    const totp = new TOTP({
      issuer: 'NEXUS-ONE',
      label: user.email,
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
    })

    const secret = totp.secret.base32
    const otpauthUrl = totp.toString()

    // ── Store secret (do NOT enable MFA yet) ──────────────────────────
    await db.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret },
    })

    // ── Audit log ─────────────────────────────────────────────────────
    const ipAddress = getClientIp(request)
    await logSecurityEvent('mfa.setup', 'info', {
      actor: user.email,
      actorId: user.id,
      resource: `user:${user.id}`,
      resourceType: 'user',
      ipAddress,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return apiResponse({
      secret,
      otpauthUrl,
      message: 'MFA secret generated. Verify with a TOTP code before enabling.',
    })
  } catch (error) {
    return handleApiError(error, 'MFA setup')
  }
}

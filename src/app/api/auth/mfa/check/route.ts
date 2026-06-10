/**
 * MFA Check Route — Determine if a user requires MFA after credential validation
 *
 * POST /api/auth/mfa/check
 * Validates email + password, then returns whether MFA (TOTP) is required.
 * Does NOT create a session — the client must still call signIn() after.
 *
 * Body: { email: string, password: string }
 * Response: { mfaRequired: boolean } | { error: string, code: string }
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { checkAccountLockout, recordFailedAttempt } from '@/lib/security'
import { logAuthEvent } from '@/lib/audit'
import { apiResponse, apiErrorResponse, handleApiError, getClientIp, RateLimiter } from '@/lib/api-utils'

// ─── Rate Limiter ────────────────────────────────────────────────────────────
// 5 attempts per minute per IP — tighter than normal since this validates passwords
const mfaCheckLimiter = new RateLimiter(5, 60_000)

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit check ──────────────────────────────────────────────
    const clientIp = getClientIp(request)
    const rateLimit = mfaCheckLimiter.check(`mfa-check:${clientIp}`)
    if (!rateLimit.allowed) {
      return apiErrorResponse(
        `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        'RATE_LIMITED',
        429
      )
    }

    // ── Parse request body ────────────────────────────────────────────
    const body = await request.json().catch(() => ({}))
    const { email, password } = body as { email?: string; password?: string }

    if (!email || !password) {
      return apiErrorResponse('Email and password are required', 'MISSING_CREDENTIALS', 400)
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── Check account lockout ──────────────────────────────────────────
    const lockoutStatus = await checkAccountLockout(normalizedEmail)
    if (lockoutStatus.locked) {
      await logAuthEvent('account.locked', {
        email: normalizedEmail,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') ?? undefined,
        reason: `Account is locked until ${lockoutStatus.lockedUntil?.toISOString()}`,
      })
      // Return generic error — don't reveal lockout status
      return apiErrorResponse('Invalid email or password', 'INVALID_CREDENTIALS', 401)
    }

    // ── Find user ─────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        mfaEnabled: true,
        mfaSecret: true,
      },
    })

    if (!user) {
      // Don't reveal whether the email exists
      await logAuthEvent('login.failed', {
        email: normalizedEmail,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') ?? undefined,
        reason: 'User not found',
      })
      return apiErrorResponse('Invalid email or password', 'INVALID_CREDENTIALS', 401)
    }

    // ── Validate password ──────────────────────────────────────────────
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      // Record failed attempt (may lock account)
      const result = await recordFailedAttempt(normalizedEmail, clientIp)
      await logAuthEvent('login.failed', {
        email: normalizedEmail,
        userId: user.id,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') ?? undefined,
        reason: `Invalid password (attempt ${result.attempts}/5)`,
      })
      return apiErrorResponse('Invalid email or password', 'INVALID_CREDENTIALS', 401)
    }

    // ── Determine MFA requirement ──────────────────────────────────────
    // Credentials are valid — now check if MFA is enabled
    // We do NOT create a session here; the client must call signIn() next.
    const mfaRequired = user.mfaEnabled && !!user.mfaSecret

    if (mfaRequired) {
      await logAuthEvent('mfa.challenge', {
        email: user.email,
        userId: user.id,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })
    }

    return apiResponse({
      mfaRequired,
      // Include a hint about the email for the next step (avoiding re-entry)
      email: normalizedEmail,
    })
  } catch (error) {
    return handleApiError(error, 'MFA check')
  }
}

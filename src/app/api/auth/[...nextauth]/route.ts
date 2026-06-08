import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { checkAccountLockout, recordFailedAttempt, clearFailedAttempts } from '@/lib/security'
import { logAuthEvent } from '@/lib/audit'
import type { AuditSeverity } from '@/lib/audit'
import { TOTP } from 'otpauth'

// ─── Environment Validation ──────────────────────────────────────────────────

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'FATAL: NEXTAUTH_SECRET environment variable is not set. ' +
    'This is required for secure JWT signing and encryption. ' +
    'Set it in your .env file: NEXTAUTH_SECRET=<random-32-byte-hex-string>'
  )
}

// ─── NextAuth Configuration ──────────────────────────────────────────────────

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Extract request metadata for audit logging
        const ipAddress =
          req?.headers?.get?.('x-forwarded-for')?.split(',')?.[0]?.trim() ??
          req?.headers?.get?.('x-real-ip')?.trim() ??
          'unknown'
        const userAgent = req?.headers?.get?.('user-agent') ?? undefined

        // ── Check account lockout ──────────────────────────────────────
        const lockoutStatus = await checkAccountLockout(credentials.email)
        if (lockoutStatus.locked) {
          await logAuthEvent('account.locked', {
            email: credentials.email,
            ipAddress,
            userAgent,
            reason: `Account is locked until ${lockoutStatus.lockedUntil?.toISOString()}`,
          })
          return null
        }

        // ── Find user ─────────────────────────────────────────────────
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user) {
          // Don't reveal whether the email exists
          await logAuthEvent('login.failed', {
            email: credentials.email,
            ipAddress,
            userAgent,
            reason: 'User not found',
          })
          return null
        }

        // ── Validate password ──────────────────────────────────────────
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          // Record failed attempt (may lock account)
          const result = await recordFailedAttempt(credentials.email, ipAddress)
          await logAuthEvent('login.failed', {
            email: credentials.email,
            userId: user.id,
            ipAddress,
            userAgent,
            reason: `Invalid password (attempt ${result.attempts}/${5})`,
          })
          return null
        }

        // ── MFA / TOTP Verification ────────────────────────────────────
        if (user.mfaEnabled) {
          await logAuthEvent('mfa.challenge', {
            email: credentials.email,
            userId: user.id,
            ipAddress,
            userAgent,
          })

          if (!credentials.totpCode || !user.mfaSecret) {
            await logAuthEvent('mfa.failed', {
              email: user.email,
              userId: user.id,
              ipAddress,
              userAgent,
              reason: user.mfaSecret ? 'Missing TOTP code' : 'MFA secret not configured',
            })
            return null
          }

          // Reconstruct TOTP instance from stored secret and validate
          const totp = new TOTP({
            issuer: 'NEXUS-ONE',
            label: user.email,
            secret: user.mfaSecret,
            digits: 6,
            period: 30,
            algorithm: 'SHA1',
          })

          const delta = totp.validate({ token: credentials.totpCode, window: 1 })
          if (delta === null) {
            await logAuthEvent('mfa.failed', {
              email: user.email,
              userId: user.id,
              ipAddress,
              userAgent,
              reason: 'Invalid TOTP code',
            })
            return null
          }

          await logAuthEvent('mfa.success', {
            email: user.email,
            userId: user.id,
            ipAddress,
            userAgent,
          })
        }

        // ── Successful authentication ──────────────────────────────────
        await clearFailedAttempts(credentials.email)

        // Update last login (non-blocking)
        db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {})

        await logAuthEvent('login.success', {
          email: user.email,
          userId: user.id,
          ipAddress,
          userAgent,
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mfaEnabled: user.mfaEnabled,
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,  // 8 hours — production session lifetime
    updateAge: 1 * 60 * 60, // Refresh session every hour
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign-in, enrich the token with user data
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.mfaEnabled = (user as { mfaEnabled: boolean }).mfaEnabled ?? false
        token.mfaVerified = (user as { mfaEnabled: boolean }).mfaEnabled ? false : true
        token.loginAt = Date.now()

        // Resolve the user's first active tenant membership for multi-tenancy
        try {
          const membership = await db.tenantMember.findFirst({
            where: { userId: user.id, status: 'active' },
            select: { tenantId: true },
            orderBy: { joinedAt: 'asc' },
          })
          if (membership) {
            token.tenantId = membership.tenantId
          }
        } catch {
          // Tenant resolution failed — proceed without tenant context
        }
      }

      // On session update, re-fetch role and tenant from DB to catch changes
      if (trigger === 'update') {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, mfaEnabled: true },
          })
          if (dbUser) {
            token.role = dbUser.role
            token.mfaEnabled = dbUser.mfaEnabled
          }

          // Re-resolve tenant membership
          const membership = await db.tenantMember.findFirst({
            where: { userId: token.id as string, status: 'active' },
            select: { tenantId: true },
            orderBy: { joinedAt: 'asc' },
          })
          token.tenantId = membership?.tenantId ?? undefined
        } catch {
          // Keep existing token data if DB fetch fails
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string
        ;(session.user as { role: string }).role = token.role as string
        ;(session.user as { mfaEnabled: boolean }).mfaEnabled = token.mfaEnabled as boolean
        ;(session.user as { mfaVerified: boolean }).mfaVerified = token.mfaVerified as boolean
        ;(session.user as { tenantId?: string }).tenantId = token.tenantId as string | undefined
      }

      // Check if session is expired beyond our stricter limit
      const loginAt = token.loginAt as number | undefined
      if (loginAt && Date.now() - loginAt > 8 * 60 * 60 * 1000) {
        // Session expired — return empty session to force re-login
        return { ...session, expires: new Date(0).toISOString() } as typeof session
      }

      return session
    },
  },

  events: {
    async signOut({ token }) {
      const email = token?.email ?? 'unknown'
      await logAuthEvent('logout', {
        email: email as string,
        userId: (token as { id?: string })?.id,
      })
    },
  },

  pages: {
    signIn: '/',
    error: '/',
  },

  // NO fallback — NEXTAUTH_SECRET is validated at the top of this file
  secret: process.env.NEXTAUTH_SECRET,

  // Additional security settings
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
})

export { handler as GET, handler as POST }

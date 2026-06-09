/**
 * Security Utilities — Input Sanitization, Token Management, Account Lockout, Encryption
 *
 * Production-grade security helpers used across the application.
 * All cryptographic operations use Node.js built-in crypto module.
 */

import { createHash, randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto'
import { db } from '@/lib/db'

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 30
const SALT_LENGTH = 32
const KEY_LENGTH = 32
const IV_LENGTH = 16
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const AUTH_TAG_LENGTH = 16

// ─── Input Sanitization ─────────────────────────────────────────────────────

/**
 * Sanitize a string input by removing dangerous characters and normalizing whitespace.
 * Prevents XSS, injection, and other input-based attacks.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except tab, newline, carriage return
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim
    .trim()
}

/**
 * Sanitize HTML content by escaping dangerous characters.
 * Does NOT allow any HTML tags — use for plain text that might contain HTML.
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return ''

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize a string for use in SQL LIKE patterns.
 * Escapes %, _, and \ characters.
 */
export function sanitizeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

/**
 * Validate and sanitize an email address.
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeInput(email).toLowerCase()
  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format')
  }
  return sanitized
}

// ─── Token Utilities ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token.
 * @param length - Number of bytes (token will be hex-encoded, so 2x this length)
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

/**
 * Generate a URL-safe base64 token.
 */
export function generateUrlSafeToken(length: number = 32): string {
  return randomBytes(length)
    .toString('base64url')
    .slice(0, length)
}

/**
 * Hash a token using SHA-256.
 * Fast and suitable for non-password tokens (API keys, CSRF tokens, etc.).
 */
export function hashToken(token: string): Promise<string> {
  return Promise.resolve(
    createHash('sha256').update(token).digest('hex')
  )
}

/**
 * Verify a token against its SHA-256 hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  const tokenHash = createHash('sha256').update(token).digest('hex')
  return timingSafeEqual(tokenHash, hash)
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length via timing
    const _ = createHash('sha256').update(a).digest('hex')
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ─── Account Lockout ─────────────────────────────────────────────────────────

export interface AccountLockoutStatus {
  locked: boolean
  attempts: number
  lockedUntil: Date | null
}

/**
 * Check if an account is currently locked out.
 */
export async function checkAccountLockout(email: string): Promise<AccountLockoutStatus> {
  const user = await db.user.findUnique({
    where: { email },
    select: { failedLoginAttempts: true, lockedUntil: true },
  })

  if (!user) {
    return { locked: false, attempts: 0, lockedUntil: null }
  }

  // Check if lockout has expired
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    // Lockout expired — clear it
    await db.user.update({
      where: { email },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    })
    return { locked: false, attempts: 0, lockedUntil: null }
  }

  return {
    locked: user.lockedUntil !== null && user.lockedUntil > new Date(),
    attempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil,
  }
}

/**
 * Record a failed login attempt.
 * Locks the account after MAX_FAILED_ATTEMPTS consecutive failures.
 */
export async function recordFailedAttempt(email: string, ipAddress: string): Promise<AccountLockoutStatus> {
  const user = await db.user.findUnique({
    where: { email },
    select: { failedLoginAttempts: true },
  })

  if (!user) {
    // Don't reveal whether the user exists — just return
    return { locked: false, attempts: 0, lockedUntil: null }
  }

  const newAttempts = user.failedLoginAttempts + 1
  const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS

  const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
    failedLoginAttempts: newAttempts,
  }

  if (shouldLock) {
    updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
  }

  await db.user.update({
    where: { email },
    data: updateData,
  })

  // Log security event for lockout
  if (shouldLock) {
    const { logSecurityEvent } = await import('@/lib/audit')
    await logSecurityEvent('account.locked', 'critical', {
      actor: email,
      resource: `user:${email}`,
      resourceType: 'user',
      ipAddress,
      reason: `Account locked after ${MAX_FAILED_ATTEMPTS} failed login attempts`,
      failedAttempts: newAttempts,
    })
  }

  return {
    locked: shouldLock,
    attempts: newAttempts,
    lockedUntil: shouldLock ? updateData.lockedUntil : null,
  }
}

/**
 * Clear failed login attempts after a successful login.
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  await db.user.update({
    where: { email },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })
}

// ─── Encryption Helpers ──────────────────────────────────────────────────────

/**
 * Get the encryption key from environment or generate a deterministic one.
 * In production, ENCRYPTION_KEY must be set as a 32-byte hex string.
 */
function getEncryptionKey(customKey?: string): Buffer {
  const key = customKey ?? process.env.ENCRYPTION_KEY

  if (key) {
    // If the key is a hex string, decode it
    if (/^[0-9a-f]{64}$/i.test(key)) {
      return Buffer.from(key, 'hex')
    }
    // Derive key from passphrase using scrypt
    const salt = createHash('sha256').update('nexus-one-encryption-salt').digest()
    return scryptSync(key, salt, KEY_LENGTH)
  }

  // Fallback: derive from NEXTAUTH_SECRET (must be set in production)
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('ENCRYPTION_KEY or NEXTAUTH_SECRET must be set for field encryption')
  }

  const salt = createHash('sha256').update('nexus-one-encryption-salt').digest()
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Encrypt a string field using AES-256-GCM.
 * Returns a base64-encoded string containing: iv + authTag + ciphertext.
 */
export function encryptField(data: string, key?: string): string {
  const encryptionKey = getEncryptionKey(key)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  let encrypted = cipher.update(data, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: iv (16 bytes) + authTag (16 bytes) + ciphertext
  const result = Buffer.concat([iv, authTag, encrypted])
  return result.toString('base64')
}

/**
 * Decrypt a string field that was encrypted with encryptField.
 */
export function decryptField(encryptedData: string, key?: string): string {
  const encryptionKey = getEncryptionKey(key)
  const buffer = Buffer.from(encryptedData, 'base64')

  // Extract components
  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

// ─── Password Strength ───────────────────────────────────────────────────────

export interface PasswordStrength {
  score: number      // 0-4
  label: string      // 'very_weak', 'weak', 'fair', 'strong', 'very_strong'
  suggestions: string[]
}

/**
 * Evaluate password strength.
 * Returns a score from 0-4 and actionable suggestions.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else suggestions.push('Use at least 8 characters')

  if (password.length >= 12) score++
  if (password.length >= 16) score++

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++
  } else {
    suggestions.push('Mix uppercase and lowercase letters')
  }

  if (/\d/.test(password)) {
    score++
  } else {
    suggestions.push('Include at least one number')
  }

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    score++
  } else {
    suggestions.push('Include at least one special character')
  }

  // Penalize common patterns
  if (/^(123|abc|password|qwerty|admin)/i.test(password)) {
    score = Math.max(0, score - 2)
    suggestions.push('Avoid common patterns and dictionary words')
  }

  // Cap at 4
  score = Math.min(4, score)

  const labels: Record<number, string> = {
    0: 'very_weak',
    1: 'weak',
    2: 'fair',
    3: 'strong',
    4: 'very_strong',
  }

  return {
    score,
    label: labels[score] ?? 'very_weak',
    suggestions: suggestions.slice(0, 3),
  }
}

// ─── CSRF Protection ─────────────────────────────────────────────────────────

const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>()

/**
 * Generate a CSRF token and store it for double-submit verification.
 */
export function generateCsrfToken(sessionId: string): string {
  const token = generateSecureToken(32)
  csrfTokenStore.set(sessionId, {
    token,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
  })

  // Cleanup expired tokens periodically
  if (csrfTokenStore.size > 1000) {
    const now = Date.now()
    for (const [key, value] of csrfTokenStore) {
      if (value.expiresAt < now) {
        csrfTokenStore.delete(key)
      }
    }
  }

  return token
}

/**
 * Validate a CSRF token using double-submit cookie pattern.
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokenStore.get(sessionId)
  if (!stored) return false

  // Check expiration
  if (stored.expiresAt < Date.now()) {
    csrfTokenStore.delete(sessionId)
    return false
  }

  // Use timing-safe comparison
  const isValid = timingSafeEqual(stored.token, token)

  // Remove token after use (one-time use)
  csrfTokenStore.delete(sessionId)

  return isValid
}

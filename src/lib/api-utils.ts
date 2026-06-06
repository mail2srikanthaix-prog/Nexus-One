import { NextResponse } from 'next/server'

// ─── Security Headers ───────────────────────────────────────────────────────

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
} as const

/**
 * Apply security headers to a NextResponse
 */
export function withSecurityHeaders<T>(response: NextResponse<T>): NextResponse<T> {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

/**
 * Create a JSON response with security headers
 */
export function apiResponse<T>(data: T, status = 200): NextResponse<T> {
  const response = NextResponse.json(data, { status })
  return withSecurityHeaders(response)
}

// ─── Structured Error Responses ─────────────────────────────────────────────

export interface ApiError {
  error: string
  code: string
  timestamp: string
}

/**
 * Generate a unique error ID for traceability
 */
function generateErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Create a structured error response with security headers
 */
export function apiErrorResponse(
  error: string,
  code: string,
  status: number
): NextResponse<ApiError> {
  const errorId = generateErrorId()
  console.error(`[${errorId}] API Error [${code}]: ${error}`)
  return apiResponse<ApiError>(
    { error, code, timestamp: new Date().toISOString() },
    status
  )
}

/**
 * Handle unexpected errors with structured response and logging
 */
export function handleApiError(error: unknown, context: string): NextResponse<ApiError> {
  const errorId = generateErrorId()
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`[${errorId}] ${context}:`, error)
  return apiResponse<ApiError>(
    { error: message, code: 'INTERNAL_ERROR', timestamp: new Date().toISOString() },
    500
  )
}

// ─── Method Guards ──────────────────────────────────────────────────────────

/**
 * Create a 405 Method Not Allowed handler
 */
export function methodNotAllowed(allowedMethods: string[]): NextResponse<ApiError> {
  const response = apiErrorResponse(
    `Method not allowed. Allowed: ${allowedMethods.join(', ')}`,
    'METHOD_NOT_ALLOWED',
    405
  )
  response.headers.set('Allow', allowedMethods.join(', '))
  return response
}

// ─── Rate Limiter ───────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

/**
 * Simple in-memory rate limiter with TTL cleanup
 */
export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>()
  private maxRequests: number
  private windowMs: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs

    // Periodic cleanup of expired entries every window duration
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs)
      // Allow the process to exit even if the interval is running
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
        this.cleanupInterval.unref()
      }
    }
  }

  /**
   * Check if a key is within rate limits
   * Returns { allowed: boolean, retryAfter: number (seconds) }
   */
  check(key: string): { allowed: boolean; retryAfter: number } {
    const now = Date.now()
    const entry = this.entries.get(key)

    if (!entry || now >= entry.resetAt) {
      // New window
      this.entries.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      })
      return { allowed: true, retryAfter: 0 }
    }

    if (entry.count >= this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return { allowed: false, retryAfter }
    }

    entry.count++
    return { allowed: true, retryAfter: 0 }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetAt) {
        this.entries.delete(key)
      }
    }
  }
}

// ─── Input Validation Helpers ───────────────────────────────────────────────

/**
 * Validate and sanitize a string parameter
 */
export function validateString(
  value: string | null,
  fieldName: string,
  opts: { maxLen?: number; required?: boolean } = {}
): { valid: boolean; value: string; error?: string } {
  if (value === null) {
    if (opts.required) {
      return { valid: false, value: '', error: `${fieldName} is required` }
    }
    return { valid: true, value: '' }
  }

  const trimmed = value.trim()

  if (opts.required && trimmed.length === 0) {
    return { valid: false, value: '', error: `${fieldName} must not be empty` }
  }

  if (opts.maxLen && trimmed.length > opts.maxLen) {
    return { valid: false, value: '', error: `${fieldName} must be at most ${opts.maxLen} characters` }
  }

  return { valid: true, value: trimmed }
}

/**
 * Validate a parameter against a set of allowed values
 */
export function validateEnum(
  value: string | null,
  fieldName: string,
  allowed: string[]
): { valid: boolean; value: string | null; error?: string } {
  if (value === null) {
    return { valid: true, value: null }
  }

  if (!allowed.includes(value)) {
    return {
      valid: false,
      value: null,
      error: `${fieldName} must be one of: ${allowed.join(', ')}`,
    }
  }

  return { valid: true, value }
}

/**
 * Validate an integer parameter within a range
 */
export function validateInt(
  value: string | null,
  fieldName: string,
  opts: { min?: number; max?: number; default?: number } = {}
): { valid: boolean; value: number; error?: string } {
  if (value === null) {
    return { valid: true, value: opts.default ?? 0 }
  }

  const parsed = parseInt(value, 10)

  if (isNaN(parsed)) {
    return { valid: false, value: 0, error: `${fieldName} must be a valid integer` }
  }

  if (opts.min !== undefined && parsed < opts.min) {
    return { valid: false, value: 0, error: `${fieldName} must be at least ${opts.min}` }
  }

  if (opts.max !== undefined && parsed > opts.max) {
    return { valid: false, value: 0, error: `${fieldName} must be at most ${opts.max}` }
  }

  return { valid: true, value: parsed }
}

/**
 * Extract client IP from request
 */
export function getClientIp(request: Request): string {
  // Check common headers for forwarded IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return 'unknown'
}

/**
 * Default rate limiter for read endpoints: 60 requests per minute per IP
 */
export const readRateLimiter = new RateLimiter(60, 60_000)

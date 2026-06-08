/**
 * NextAuth Route Protection Middleware
 *
 * Protects ALL /api/ routes except /api/auth/* and /api/health.
 * Validates JWT session on every request, adds security headers,
 * enforces rate limiting, extracts user role for RBAC, and logs
 * all API access.
 *
 * IMPORTANT: This runs in Edge Runtime — no Prisma, no Node.js-specific APIs.
 * Audit logging uses structured console output (consumed by log processors).
 * Full Prisma-based audit logging happens in API routes (Node.js runtime).
 *
 * Uses getToken() instead of withAuth() so we can handle public
 * routes and API-specific error responses (JSON 401 vs redirect).
 */

import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── RBAC Types & Logic (Edge-safe, no Prisma) ──────────────────────────────

type Permission =
  | 'dashboard:read' | 'dashboard:write'
  | 'agents:read' | 'agents:write' | 'agents:execute'
  | 'graph:read' | 'graph:write'
  | 'search:read'
  | 'predictions:read' | 'predictions:write'
  | 'events:read' | 'events:write'
  | 'memory:read' | 'memory:write'
  | 'security:read' | 'security:write' | 'security:admin'
  | 'connectors:read' | 'connectors:write' | 'connectors:admin'
  | 'users:read' | 'users:write' | 'users:admin'
  | 'audit:read' | 'audit:admin'
  | 'tenants:read' | 'tenants:write' | 'tenants:admin'
  | 'chat:read' | 'chat:write'
  | 'boardroom:read' | 'boardroom:write'

type Role = 'super_admin' | 'admin' | 'manager' | 'analyst' | 'viewer' | 'agent'

/**
 * Edge-safe RBAC permission mapping.
 * Duplicated from @/lib/rbac to avoid Prisma dependency in Edge runtime.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    'dashboard:read', 'dashboard:write', 'agents:read', 'agents:write', 'agents:execute',
    'graph:read', 'graph:write', 'search:read', 'predictions:read', 'predictions:write',
    'events:read', 'events:write', 'memory:read', 'memory:write',
    'security:read', 'security:write', 'security:admin',
    'connectors:read', 'connectors:write', 'connectors:admin',
    'users:read', 'users:write', 'users:admin', 'audit:read', 'audit:admin',
    'tenants:read', 'tenants:write', 'tenants:admin', 'chat:read', 'chat:write',
    'boardroom:read', 'boardroom:write',
  ],
  admin: [
    'dashboard:read', 'dashboard:write', 'agents:read', 'agents:write', 'agents:execute',
    'graph:read', 'graph:write', 'search:read', 'predictions:read', 'predictions:write',
    'events:read', 'events:write', 'memory:read', 'memory:write',
    'security:read', 'security:write', 'security:admin',
    'connectors:read', 'connectors:write', 'connectors:admin',
    'users:read', 'users:write', 'users:admin', 'audit:read', 'audit:admin',
    'tenants:read', 'tenants:write', 'chat:read', 'chat:write',
    'boardroom:read', 'boardroom:write',
  ],
  manager: [
    'dashboard:read', 'dashboard:write', 'agents:read', 'agents:execute',
    'graph:read', 'search:read', 'predictions:read',
    'events:read', 'events:write', 'memory:read', 'memory:write',
    'security:read', 'connectors:read', 'connectors:write',
    'users:read', 'audit:read', 'tenants:read',
    'chat:read', 'chat:write', 'boardroom:read', 'boardroom:write',
  ],
  analyst: [
    'dashboard:read', 'agents:read', 'graph:read', 'search:read',
    'predictions:read', 'predictions:write', 'events:read', 'memory:read',
    'security:read', 'connectors:read', 'users:read', 'audit:read', 'tenants:read',
    'chat:read', 'chat:write', 'boardroom:read',
  ],
  viewer: [
    'dashboard:read', 'agents:read', 'graph:read', 'search:read',
    'predictions:read', 'events:read', 'memory:read',
    'security:read', 'connectors:read', 'users:read', 'audit:read', 'tenants:read',
    'chat:read', 'boardroom:read',
  ],
  agent: [
    'dashboard:read', 'agents:read', 'agents:execute', 'graph:read', 'search:read',
    'predictions:read', 'predictions:write', 'events:read', 'events:write',
    'memory:read', 'memory:write', 'security:read', 'connectors:read',
    'chat:read', 'chat:write', 'boardroom:read', 'boardroom:write',
  ],
}

const ROLE_ALIASES: Record<string, Role> = {
  'superadmin': 'super_admin', 'super-admin': 'super_admin', 'administrator': 'admin',
  'mgr': 'manager', 'management': 'manager', 'view': 'viewer', 'read': 'viewer',
  'readonly': 'viewer', 'read-only': 'viewer', 'bot': 'agent', 'system': 'agent',
  'ai': 'agent', 'user': 'viewer',
}

function normalizeRole(role: string): Role | null {
  const lower = role.toLowerCase().trim()
  if (lower in ROLE_PERMISSIONS) return lower as Role
  return ROLE_ALIASES[lower] ?? null
}

function hasPermission(role: string, permission: Permission): boolean {
  const roleKey = normalizeRole(role)
  if (!roleKey) return false
  return ROLE_PERMISSIONS[roleKey].includes(permission)
}

// ─── Route Permission Mapping (Edge-safe) ────────────────────────────────────

interface RoutePermissionRule {
  pattern: RegExp
  methods: Record<string, Permission>
}

const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  { pattern: /^\/api\/dashboard$/, methods: { GET: 'dashboard:read', POST: 'dashboard:write', PUT: 'dashboard:write', PATCH: 'dashboard:write' } },
  { pattern: /^\/api\/agents$/, methods: { GET: 'agents:read', POST: 'agents:write' } },
  { pattern: /^\/api\/agents\/[^/]+\/execute$/, methods: { POST: 'agents:execute' } },
  { pattern: /^\/api\/agents\//, methods: { GET: 'agents:read', PUT: 'agents:write', PATCH: 'agents:write', DELETE: 'agents:write' } },
  { pattern: /^\/api\/graph$/, methods: { GET: 'graph:read', POST: 'graph:write', PUT: 'graph:write' } },
  { pattern: /^\/api\/graph\//, methods: { GET: 'graph:read', PUT: 'graph:write', PATCH: 'graph:write', DELETE: 'graph:write' } },
  { pattern: /^\/api\/search$/, methods: { GET: 'search:read', POST: 'search:read' } },
  { pattern: /^\/api\/predictions$/, methods: { GET: 'predictions:read', POST: 'predictions:write' } },
  { pattern: /^\/api\/predictions\//, methods: { GET: 'predictions:read', PUT: 'predictions:write', PATCH: 'predictions:write', DELETE: 'predictions:write' } },
  { pattern: /^\/api\/events$/, methods: { GET: 'events:read', POST: 'events:write' } },
  { pattern: /^\/api\/events\//, methods: { GET: 'events:read', PUT: 'events:write', PATCH: 'events:write', DELETE: 'events:write' } },
  { pattern: /^\/api\/memory$/, methods: { GET: 'memory:read', POST: 'memory:write' } },
  { pattern: /^\/api\/memory\//, methods: { GET: 'memory:read', PUT: 'memory:write', PATCH: 'memory:write', DELETE: 'memory:write' } },
  { pattern: /^\/api\/security$/, methods: { GET: 'security:read', POST: 'security:write' } },
  { pattern: /^\/api\/security\/admin/, methods: { GET: 'security:admin', POST: 'security:admin', PUT: 'security:admin' } },
  { pattern: /^\/api\/security\//, methods: { GET: 'security:read', PUT: 'security:write', PATCH: 'security:write', DELETE: 'security:write' } },
  { pattern: /^\/api\/connectors$/, methods: { GET: 'connectors:read', POST: 'connectors:write' } },
  { pattern: /^\/api\/connectors\/admin/, methods: { GET: 'connectors:admin', POST: 'connectors:admin', PUT: 'connectors:admin' } },
  { pattern: /^\/api\/connectors\//, methods: { GET: 'connectors:read', PUT: 'connectors:write', PATCH: 'connectors:write', DELETE: 'connectors:write' } },
  { pattern: /^\/api\/users$/, methods: { GET: 'users:read', POST: 'users:write' } },
  { pattern: /^\/api\/users\/admin/, methods: { GET: 'users:admin', POST: 'users:admin', PUT: 'users:admin' } },
  { pattern: /^\/api\/users\//, methods: { GET: 'users:read', PUT: 'users:write', PATCH: 'users:write', DELETE: 'users:write' } },
  { pattern: /^\/api\/audit$/, methods: { GET: 'audit:read' } },
  { pattern: /^\/api\/audit\//, methods: { GET: 'audit:read', DELETE: 'audit:admin' } },
  { pattern: /^\/api\/tenants$/, methods: { GET: 'tenants:read', POST: 'tenants:write' } },
  { pattern: /^\/api\/tenants\/admin/, methods: { GET: 'tenants:admin', POST: 'tenants:admin', PUT: 'tenants:admin' } },
  { pattern: /^\/api\/tenants\//, methods: { GET: 'tenants:read', PUT: 'tenants:write', PATCH: 'tenants:write', DELETE: 'tenants:write' } },
  { pattern: /^\/api\/chat$/, methods: { GET: 'chat:read', POST: 'chat:write' } },
  { pattern: /^\/api\/chat\//, methods: { GET: 'chat:read', POST: 'chat:write' } },
  { pattern: /^\/api\/boardroom$/, methods: { GET: 'boardroom:read', POST: 'boardroom:write' } },
  { pattern: /^\/api\/boardroom\//, methods: { GET: 'boardroom:read', POST: 'boardroom:write' } },
]

function getRequiredPermission(pathname: string, method: string): Permission | null {
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (rule.pattern.test(pathname)) {
      return rule.methods[method.toUpperCase()] ?? null
    }
  }
  // Unmatched API routes default to requiring security:read
  if (pathname.startsWith('/api/')) {
    return 'security:read'
  }
  return null
}

// ─── Rate Limiting (In-Memory, Edge-safe) ────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 120
const RATE_LIMIT_WINDOW_MS = 60_000

function checkRateLimit(key: string): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, retryAfter: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, retryAfter: 0 }
}

// Periodic cleanup of rate limit entries
if (typeof setInterval !== 'undefined') {
  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap) {
      if (now >= entry.resetAt) rateLimitMap.delete(key)
    }
  }, 60_000)
  if (typeof cleanup.unref === 'function') cleanup.unref()
}

// ─── Security Headers ────────────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

const CSP_HEADER =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' data: blob: https:; " +
  "connect-src 'self' ws: wss:; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'"

if (process.env.NODE_ENV === 'production') {
  SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
}

// ─── Public Routes (No Auth Required) ────────────────────────────────────────

const PUBLIC_API_ROUTES = ['/api/auth', '/api/health']

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ─── Structured Console Audit (Edge-safe) ────────────────────────────────────

function logAuditEvent(event: {
  action: string
  actor: string
  actorId?: string
  resource: string
  resourceType?: string
  severity: string
  ipAddress: string
  userAgent?: string
  requestId: string
  duration?: number
  result?: string
}): void {
  // Structured JSON log — consumable by log processors (ELK, Datadog, etc.)
  // Full Prisma-based audit logging happens in API routes (Node.js runtime)
  console.log(JSON.stringify({
    type: 'audit',
    timestamp: new Date().toISOString(),
    ...event,
  }))
}

// ─── Main Middleware ─────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const startTime = Date.now()
  const requestId = generateRequestId()
  const clientIp = getClientIp(request)

  // ── Step 1: Non-API routes — just add security headers ──────────────
  if (!pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    applySecurityHeaders(response, requestId)
    return response
  }

  // ── Step 2: Public API routes — no authentication required ──────────
  if (isPublicApiRoute(pathname)) {
    const response = NextResponse.next()
    applySecurityHeaders(response, requestId)
    return response
  }

  // ── Step 3: Get JWT token for authenticated routes ──────────────────
  let token
  try {
    token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  } catch {
    return createUnauthorizedResponse('Invalid or expired session', requestId, clientIp)
  }

  if (!token) {
    logAuditEvent({
      action: 'auth.unauthorized',
      actor: 'anonymous',
      resource: pathname,
      resourceType: 'api_route',
      severity: 'warning',
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') ?? undefined,
      requestId,
      result: 'unauthenticated',
    })
    return createUnauthorizedResponse('Authentication required', requestId, clientIp)
  }

  const userId = token.id as string | undefined
  const userRole = token.role as string | undefined

  if (!userId || !userRole) {
    return createUnauthorizedResponse('Invalid session token', requestId, clientIp)
  }

  // ── Step 4: Rate limiting ──────────────────────────────────────────
  const rateLimitKey = `${clientIp}:${userId}`
  const rateLimit = checkRateLimit(rateLimitKey)

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        timestamp: new Date().toISOString(),
        retryAfter: rateLimit.retryAfter,
      },
      { status: 429 }
    )
    response.headers.set('Retry-After', String(rateLimit.retryAfter))
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + rateLimit.retryAfter))
    applySecurityHeaders(response, requestId)
    return response
  }

  // ── Step 5: RBAC permission check ─────────────────────────────────
  const requiredPermission = getRequiredPermission(pathname, method)
  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    logAuditEvent({
      action: `api.access.denied`,
      actor: userId,
      actorId: userId,
      resource: pathname,
      resourceType: 'api_route',
      severity: 'warning',
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') ?? undefined,
      requestId,
      duration: Date.now() - startTime,
      result: 'forbidden',
    })

    const response = NextResponse.json(
      {
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        timestamp: new Date().toISOString(),
        required: requiredPermission,
      },
      { status: 403 }
    )
    applySecurityHeaders(response, requestId)
    return response
  }

  // ── Step 6: Allow request through ──────────────────────────────────
  const response = NextResponse.next()

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))

  // Add user context headers for downstream API routes
  response.headers.set('X-User-Id', userId)
  response.headers.set('X-User-Role', userRole)
  response.headers.set('X-Request-Id', requestId)

  applySecurityHeaders(response, requestId)

  // ── Step 7: Log successful access ──────────────────────────────────
  logAuditEvent({
    action: `api.access.allowed`,
    actor: userId,
    actorId: userId,
    resource: pathname,
    resourceType: 'api_route',
    severity: 'info',
    ipAddress: clientIp,
    userAgent: request.headers.get('user-agent') ?? undefined,
    requestId,
    duration: Date.now() - startTime,
    result: 'allowed',
  })

  return response
}

// ─── Apply Security Headers ─────────────────────────────────────────────────

function applySecurityHeaders(response: NextResponse, requestId: string): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  response.headers.set('Content-Security-Policy', CSP_HEADER)
  response.headers.set('X-Request-Id', requestId)
}

// ─── Create 401 Unauthorized Response ───────────────────────────────────────

function createUnauthorizedResponse(
  message: string,
  requestId: string,
  clientIp: string
): NextResponse {
  const response = NextResponse.json(
    {
      error: message,
      code: 'UNAUTHENTICATED',
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  )
  response.headers.set('WWW-Authenticate', 'Bearer realm="Nexus-One"')
  applySecurityHeaders(response, requestId)
  return response
}

// ─── Matcher Configuration ──────────────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|nexus-logo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}

/**
 * NEXUS ONE — Multi-Tenancy Context
 *
 * Provides tenant isolation for API routes. Every request is resolved
 * to a tenant ID (via header or JWT), and database queries are scoped
 * to that tenant.
 *
 * Backward compatible: if no tenant context is found, queries run
 * unfiltered (legacy behavior).
 *
 * ── Tenant Resolution Order ──────────────────────────────────────────────────
 * 1. X-Tenant-Id request header  (set by middleware for API-key requests)
 * 2. JWT token tenantId claim    (set by NextAuth JWT callback)
 *
 * ── Filter Strategies ────────────────────────────────────────────────────────
 * - Direct   : models that have `tenantId` column       → addTenantFilter()
 * - Via Org  : models linked to Organization by `orgId`  → addOrgIdFilter()
 * - Via Person/Project : Event model                     → addEventTenantFilter()
 */

import { db } from '@/lib/db'
import { getToken } from 'next-auth/jwt'

// ─── Tenant Resolution ─────────────────────────────────────────────────────

/**
 * Resolve the tenant ID for the current request.
 *
 * Checks (in order):
 *  1. X-Tenant-Id header  — set by middleware for API-key / service requests
 *  2. JWT `tenantId` claim — embedded by NextAuth JWT callback
 *
 * Returns `null` when no tenant context is available (backward compatible).
 */
export async function getTenantId(request: Request): Promise<string | null> {
  // 1. Check X-Tenant-Id header first (API key / service-to-service)
  const headerTenantId = request.headers.get('x-tenant-id')
  if (headerTenantId) {
    return headerTenantId
  }

  // 2. Check JWT token for user's tenant membership
  try {
    const token = await getToken({
      req: request as Parameters<typeof getToken>[0] & { headers: Headers },
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (token?.tenantId && typeof token.tenantId === 'string') {
      return token.tenantId as string
    }
  } catch {
    // Token resolution failed — continue without tenant context
  }

  return null
}

/**
 * Like `getTenantId` but throws if no tenant is found.
 * Use for routes that *require* tenant isolation.
 */
export async function requireTenant(request: Request): Promise<string> {
  const tenantId = await getTenantId(request)
  if (!tenantId) {
    throw new Error('Tenant context required but not found')
  }
  return tenantId
}

// ─── Direct Tenant Filter ──────────────────────────────────────────────────

/**
 * Add `tenantId` to a Prisma `where` clause for models that have
 * a direct `tenantId` column (Organization, Agent, Memory, Prediction,
 * GraphEntity, AuditLog, DomainEvent, etc.).
 *
 * If `tenantId` is null/undefined, returns the original where clause
 * unchanged (backward compatible).
 */
export function addTenantFilter(
  where: Record<string, unknown>,
  tenantId: string | null
): Record<string, unknown> {
  if (!tenantId) return where
  return { ...where, tenantId }
}

// ─── Org-Based Indirect Filter ─────────────────────────────────────────────

/** In-memory cache for tenant → org IDs mapping (TTL 60s) */
const orgIdCache = new Map<string, { orgIds: string[]; expiresAt: number }>()
const ORG_CACHE_TTL_MS = 60_000

/**
 * Resolve the set of Organization IDs that belong to a tenant.
 * Uses a short-lived in-memory cache to avoid repeated DB lookups.
 */
export async function getTenantOrgIds(tenantId: string): Promise<string[]> {
  const cached = orgIdCache.get(tenantId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.orgIds
  }

  const orgs = await db.organization.findMany({
    where: { tenantId },
    select: { id: true },
  })

  const orgIds = orgs.map((o) => o.id)
  orgIdCache.set(tenantId, { orgIds, expiresAt: Date.now() + ORG_CACHE_TTL_MS })
  return orgIds
}

/**
 * Add an `orgId` filter to a Prisma `where` clause for models linked
 * to Organization (Person, Project, Team, Connector).
 *
 * If `tenantId` is null/undefined, returns the original where clause
 * unchanged (backward compatible).
 *
 * If the tenant has no organizations, adds `{ orgId: { in: [] } }`
 * which will return zero rows — correct isolation behavior.
 */
export async function addOrgIdFilter(
  where: Record<string, unknown>,
  tenantId: string | null
): Promise<Record<string, unknown>> {
  if (!tenantId) return where

  const orgIds = await getTenantOrgIds(tenantId)
  return { ...where, orgId: { in: orgIds } }
}

// ─── Event-Specific Filter ─────────────────────────────────────────────────

/**
 * Add tenant filtering for the Event model, which doesn't have a
 * direct `tenantId` or `orgId`. Events are linked to tenants through
 * their Person or Project relationships.
 *
 * Strategy:
 *  - Get org IDs for the tenant
 *  - Find person IDs in those orgs
 *  - Find project IDs in those orgs
 *  - Filter events where personId OR projectId matches
 *
 * If `tenantId` is null/undefined, returns the original where clause
 * unchanged (backward compatible).
 */
export async function addEventTenantFilter(
  where: Record<string, unknown>,
  tenantId: string | null
): Promise<Record<string, unknown>> {
  if (!tenantId) return where

  const orgIds = await getTenantOrgIds(tenantId)

  // Find person and project IDs belonging to the tenant's orgs
  const [personIds, projectIds] = await Promise.all([
    db.person.findMany({
      where: { orgId: { in: orgIds } },
      select: { id: true },
    }),
    db.project.findMany({
      where: { orgId: { in: orgIds } },
      select: { id: true },
    }),
  ])

  const pIds = personIds.map((p) => p.id)
  const prIds = projectIds.map((p) => p.id)

  // Merge with existing where clause using AND
  const existingConditions = Object.entries(where)
  const tenantFilter: Record<string, unknown> = {
    OR: [
      { personId: { in: pIds } },
      { projectId: { in: prIds } },
    ],
  }

  if (existingConditions.length === 0) {
    return tenantFilter
  }

  // Combine: existing conditions AND tenant filter
  return {
    AND: [where, tenantFilter],
  }
}

// ─── Graph Relation Filter ─────────────────────────────────────────────────

/**
 * Add tenant filtering for GraphRelation, which doesn't have tenantId
 * directly. Filters by requiring that BOTH source and target entities
 * belong to the tenant.
 */
export function addGraphRelationFilter(
  where: Record<string, unknown>,
  tenantId: string | null
): Record<string, unknown> {
  if (!tenantId) return where

  return {
    ...where,
    source: { tenantId },
    target: { tenantId },
  }
}

// ─── Cache Invalidation ────────────────────────────────────────────────────

/**
 * Invalidate the org ID cache for a specific tenant (call after org mutations).
 */
export function invalidateTenantOrgCache(tenantId: string): void {
  orgIdCache.delete(tenantId)
}

/**
 * Invalidate all org ID caches.
 */
export function invalidateAllTenantOrgCaches(): void {
  orgIdCache.clear()
}

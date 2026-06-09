# Task 4: Multi-Tenancy Isolation for NEXUS ONE API Routes

## Agent: main
## Status: COMPLETED

## Summary
Added complete multi-tenancy isolation to NEXUS ONE API routes. The system now enforces tenant-based data filtering on all key API endpoints while maintaining full backward compatibility (unfiltered queries when no tenant context is available).

## Changes Made

### 1. Schema Updates (`prisma/schema.prisma`)
Added `tenantId` field (nullable, with Tenant relation) to models that lacked direct tenant linkage:
- **Organization** — top-level entity; all org-linked models filter through this
- **Agent** — standalone entity not linked to orgs
- **Memory** — standalone entity not linked to orgs
- **Prediction** — standalone entity not linked to orgs
- **GraphEntity** — standalone entity not linked to orgs

Also added reverse relations to Tenant model for all new tenant-linked models.

Schema pushed successfully with `bun run db:push`.

### 2. New Module: `/src/lib/tenant-context.ts`
Core multi-tenancy module providing:
- **`getTenantId(request)`** — Resolves tenant from X-Tenant-Id header or JWT token
- **`requireTenant(request)`** — Throws if no tenant found
- **`addTenantFilter(where, tenantId)`** — Adds `tenantId` to where clause for models with direct tenantId column
- **`getTenantOrgIds(tenantId)`** — Resolves org IDs for a tenant (with 60s in-memory cache)
- **`addOrgIdFilter(where, tenantId)`** — Adds `orgId: { in: orgIds }` for org-linked models (Person, Project, Team, Connector)
- **`addEventTenantFilter(where, tenantId)`** — Filters events through Person/Project → Organization → tenantId chain
- **`addGraphRelationFilter(where, tenantId)`** — Filters relations requiring both source and target belong to tenant
- Cache invalidation helpers for org mutations

### 3. Middleware Update (`/src/middleware.ts`)
- Extracts `tenantId` from JWT token (Step 6)
- Passes it as `X-Tenant-Id` response header to downstream API routes
- Backward compatible: only sets header when tenantId exists in token

### 4. NextAuth JWT Callback Update (`/src/app/api/auth/[...nextauth]/route.ts`)
- On sign-in: resolves user's first active `TenantMember` record and embeds `tenantId` in JWT
- On session update: re-resolves tenant membership to catch changes
- Session callback: exposes `tenantId` on `session.user`

### 5. API Route Updates (8 routes)

| Route | Filter Strategy |
|-------|----------------|
| `/api/dashboard` | Mixed: `tenantFilter` (Agent/Memory/Prediction), `orgFilter` (Person/Project/Team/Connector), `eventFilter` (Event via Person/Project) |
| `/api/events` | `addEventTenantFilter` — indirect via Person/Project → Org → tenantId |
| `/api/agents` | `addTenantFilter` — direct tenantId on Agent model |
| `/api/memory` | `addTenantFilter` — direct tenantId on Memory model |
| `/api/predictions` | `addTenantFilter` — direct tenantId on Prediction model |
| `/api/connectors` | `addOrgIdFilter` — indirect via Connector → Org → tenantId; POST register validates org belongs to tenant |
| `/api/search` | Mixed: `tenantFilter`/`orgFilter`/`eventFilter` applied per entity type in both keyword and semantic modes |
| `/api/graph` | `addTenantFilter` on entities; relation queries require both source and target to belong to tenant |

## Backward Compatibility
All routes return unfiltered data when no tenant context is available (no X-Tenant-Id header and no tenantId in JWT). This preserves existing behavior for:
- Users without tenant memberships
- API key requests without tenant association
- Development/testing scenarios

## Filter Strategy Summary
- **Direct tenantId filter**: Models with `tenantId` column → `addTenantFilter()`
- **Via Organization**: Models with `orgId` → `addOrgIdFilter()` (Person, Project, Team, Connector)
- **Via Person/Project**: Event model → `addEventTenantFilter()` (resolves personIds + projectIds for tenant's orgs)
- **Bidirectional**: GraphRelation → requires both source and target entities in tenant

## Lint & Build Status
- ESLint: Clean (no errors)
- Dev server: Running successfully on port 3000

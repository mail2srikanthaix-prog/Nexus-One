# Task 2: Database & Multi-Tenancy Foundation

## Agent: DB Architect
## Date: 2026-03-04

## Summary
Completed Phase 2 (Database) and Phase 10 (Multi-Tenancy foundation) of the Nexus-One production transformation. Added 10 new models to the Prisma schema, fixed the seed script idempotency, and created 3 new library modules for caching, event sourcing, and observability.

## Changes Made

### 1. `prisma/schema.prisma` — 10 New Models + 4 Existing Model Updates

**New Models:**
- `Tenant` — Multi-tenancy with slug, domain, plan tiers, storage limits, and settings (JSON). `maxStorage` uses `BigInt` to support large byte values.
- `TenantMember` — Join table linking Users to Tenants with roles (super_admin, admin, manager, analyst, viewer). Unique constraint on `[tenantId, userId]`.
- `ApiKey` — API key management with bcrypt keyHash, keyPrefix for identification, permissions (JSON), expiry, and optional tenant/user association.
- `DomainEvent` — Event sourcing with aggregateId, aggregateType, version (optimistic concurrency), payload/metadata (JSON), actor tracking, and tenantId.
- `AgentWorkflow` — Agent workflow execution with type (sequential, parallel, conditional, approval), status lifecycle, definition/context/result (JSON), and timing.
- `AgentMemory` — Agent memory with types (short_term, long_term, episodic, procedural), embeddings, importance scoring, and access tracking.
- `ConnectorSync` — Connector sync tracking with records synced/failed, error reporting, and timing.
- `ConnectorWebhook` — Connector webhook processing with payload, signature verification, retry tracking.
- `Feedback` — User feedback with target type/id, 1-5 rating, comments, and tags.
- `QualityScore` — Quality metrics with unique constraint on `[entityType, entityId, metric, period, periodStart]` for time-series scoring.

**Updated Existing Models:**
- `User` — Added `tenantMemberships TenantMember[]` and `apiKeys ApiKey[]`
- `Agent` — Added `workflows AgentWorkflow[]` and `memories AgentMemory[]`
- `Connector` — Added `syncs ConnectorSync[]` and `webhooks ConnectorWebhook[]`
- `AuditLog` — Added `tenantId String?`, `tenant Tenant?`, and `@@index([tenantId])`

**Important Schema Decision:**
- `Tenant.maxStorage` uses `BigInt` instead of `Int` because values like 100GB (107374182400 bytes) exceed 32-bit INT max. SQLite natively supports 64-bit integers.

### 2. `prisma/seed.ts` — Idempotent Seed with New Data

**Fixes:**
- Replaced `prisma.user.create()` with `prisma.user.upsert()` to prevent P2002 unique constraint errors on re-seed
- Wrapped `sqlite_sequence` cleanup in try/catch since it may not exist with cuid() IDs
- Added all new tables to the cleanup list

**New Seed Data:**
- 1 Tenant (Nexus Corp, enterprise plan, 100GB storage)
- 1 TenantMember (demo user as super_admin)
- 3 API Keys (production, webhook, read-only analytics)
- 8 Domain Events (project.created, agent.action, task.completed, decision.approved, etc.)
- 6 Feedback entries (agent_response, prediction, recommendation ratings)
- 3 Agent Workflows (sequential, parallel, approval types)
- 5 Agent Memories (long_term, episodic, procedural, short_term)
- 3 Connector Syncs (completed, running, failed)
- 3 Connector Webhooks (processed, pending)

**Verified:** Seed runs successfully multiple times without errors.

### 3. `src/lib/cache.ts` — In-Memory Cache with TTL

**Features:**
- Generic `Cache<T>` class with configurable default TTL
- `get()`, `set()`, `delete()`, `clear()`, `has()`, `size()` methods
- `cleanup()` for expired entry removal (auto-runs every 60s)
- `getOrSet()` async factory pattern for cache-aside strategy
- `destroy()` for graceful shutdown
- Timer uses `.unref()` to not block Node.js process exit

**Pre-configured Caches:**
- `dashboardCache` — 30s TTL
- `graphCache` — 60s TTL
- `agentsCache` — 15s TTL
- `searchCache` — 10s TTL
- `userPermissionsCache` — 5min TTL

### 4. `src/lib/event-sourcing.ts` — Event Sourcing Engine

**Functions:**
- `emitEvent(input)` — Create domain events with automatic version incrementing
- `getEventStream(aggregateId, options?)` — Get ordered events for an aggregate
- `getEventsByType(eventType, options?)` — Query events by type for read models
- `replayEvents(aggregateId, handler)` — Replay events through a handler for state reconstruction
- `getAggregateVersion(aggregateId)` — Get current version number for optimistic concurrency

### 5. `src/lib/observability.ts` — Health & Metrics

**MetricsCollector Class:**
- `recordRequest(durationMs, isError?)` — Track request performance
- `getMetrics()` — Returns totalRequests, totalErrors, avgResponseTime, p50, p95, p99
- `reset()` — Clear all metrics
- Sliding window of 1000 response times for percentile calculations

**Health Status:**
- `getHealthStatus()` — Returns comprehensive health report with database latency check, memory usage, service status, and metrics
- Three-tier health: healthy / degraded / unhealthy (based on DB latency and response times)
- Database health checked via `SELECT 1` with latency thresholds (<100ms healthy, <500ms degraded)

## Verification
- `bunx prisma db push --force-reset` — Schema applied successfully
- `bun run prisma/seed.ts` — Seeds successfully (verified 2 consecutive runs)
- `bun run lint` — No errors
- Dev server running without issues

## Schema Stats
- **Before:** 17 models
- **After:** 27 models (10 new)
- **Total indexes:** 80+ across all models

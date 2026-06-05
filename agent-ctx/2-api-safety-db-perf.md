# Task 2: Fix API safety issues and database performance

**Agent**: API Safety & Database Performance Engineer
**Status**: Completed

## Summary

All 4 subtasks completed successfully:

1. **JSON.parse safety** — Wrapped `JSON.parse(e.properties)` in graph API with try/catch IIFE, returns `{}` on failure
2. **Prisma conditional logging** — Changed from `log: ['query']` to environment-aware: production gets `['warn', 'error']`, development gets `['query', 'warn', 'error']`
3. **Database indexes** — Added 37 `@@index` directives across 15 models in schema.prisma; ran `bun run db:push` successfully
4. **Rate limiting** — Added `readRateLimiter` (60 req/min/IP) to api-utils.ts; applied to all 8 read endpoints (dashboard, agents, graph, events, predictions, memory, security, search); added `request: Request` parameter to 4 endpoints that were missing it

## Files Modified

- `src/app/api/graph/route.ts` — try/catch for JSON.parse + rate limiting + request param
- `src/lib/db.ts` — conditional Prisma logging
- `prisma/schema.prisma` — 37 indexes across 15 models
- `src/lib/api-utils.ts` — added `readRateLimiter` export
- `src/app/api/dashboard/route.ts` — rate limiting + request param
- `src/app/api/agents/route.ts` — rate limiting + request param
- `src/app/api/events/route.ts` — rate limiting
- `src/app/api/predictions/route.ts` — rate limiting + request param
- `src/app/api/memory/route.ts` — rate limiting
- `src/app/api/security/route.ts` — rate limiting + request param
- `src/app/api/search/route.ts` — rate limiting

## Verification

- `bun run lint` passes with zero errors
- Dev server running successfully with all APIs responding

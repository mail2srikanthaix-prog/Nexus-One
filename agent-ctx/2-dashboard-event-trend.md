# Task 2: Replace Hardcoded Event Trend Data with Real 7-Day DB Aggregation

## Summary

Replaced the hardcoded sample `eventTrendData` in the Dashboard with a real 7-day aggregation queried from the database via the API.

## Changes Made

### 1. `src/lib/types.ts`
- Added `eventTrend: Array<{ day: string; events: number }>` to the `DashboardData` interface

### 2. `src/app/api/dashboard/route.ts`
- Added a new query in the existing `Promise.all` block for display lists: `recentEventsForTrend` — fetches events from the last 7 days with `select: { createdAt: true }` and tenant filtering via `eventFilter`
- Added aggregation logic after the `Promise.all`:
  - Initializes a `dayMap` with all 7 days (zero-filled) using `toLocaleDateString('en-US', { weekday: 'short' })` for day labels
  - Iterates over `recentEventsForTrend` to increment counts per day
  - Produces `eventTrend` array via `Object.entries(dayMap).map()`
- Added `eventTrend` to the `apiResponse` payload

### 3. `src/components/nexus/dashboard-view.tsx`
- Removed the hardcoded `eventTrendData` constant (was lines 90-100)
- Changed `<AreaChart data={eventTrendData}>` → `<AreaChart data={data.eventTrend}>`
- Updated chart label from "Event Trend (7 Days) — Sample" → "Event Trend (7 Days)"
- Updated comment from "sample data" → "7-day DB aggregation"

## Key Design Decisions
- The 7-day window always returns all 7 days even if no events exist (zero-filled) by pre-populating `dayMap`
- The trend query reuses the existing `eventFilter` for tenant isolation
- The query is added to the existing `Promise.all` block for parallel execution
- SQLite-compatible grouping done in JS (no `date_trunc` dependency)

## Verification
- `bun run lint` passes with no errors

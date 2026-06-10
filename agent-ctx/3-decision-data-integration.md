# Task 3: Replace Hardcoded Reality Gap Data with Real Decision Model Data

## Summary
Replaced the hardcoded `realityGapData` in the Time Machine view with real Decision model data fetched from a new `/api/decisions` endpoint.

## Files Modified

### 1. `src/lib/types.ts`
- Added `DecisionData` interface with fields: `id, title, description, status, impact, confidence, reasoning, madeBy, projectName, createdAt, expectedOutcome, actualOutcome`
- Added `DecisionsResponse` interface with fields: `decisions, total, statusCounts, impactCounts`

### 2. `src/lib/tenant-context.ts`
- Added `addDecisionTenantFilter()` function for multi-tenant filtering on the Decision model
- Follows same pattern as `addEventTenantFilter()` — resolves tenant org IDs, then filters decisions by `madeById` (Person) or `projectId` (Project)

### 3. `src/app/api/decisions/route.ts` (NEW)
- GET endpoint that fetches Decision records from the database
- Includes tenant filtering via `addDecisionTenantFilter`
- Supports query params: `limit`, `status`, `impact`
- Computes reality gap data:
  - `expectedOutcome` = `confidence * 100`
  - `actualOutcome` = derived from impact base score + confidence factor + status adjustment
- Returns `statusCounts` and `impactCounts` aggregations
- Includes `madeBy` (person name) and `projectName` in response
- Follows existing API route patterns (rate limiting, validation, security headers, error handling)

### 4. `src/components/nexus/timemachine-view.tsx`
- Added `DecisionsResponse` and `DecisionData` imports
- Added `decisionsData` and `decisionsLoading` state
- Added `useEffect` to fetch from `/api/decisions?limit=20`
- Replaced hardcoded `realityGapData` with `useMemo` that maps real decision data
- Updated "Reality Gap Analysis" chart with loading spinner and empty state
- Updated "Key Decisions" card to show:
  - Real decision titles (with truncation for long names)
  - Proper status badges (proposed/approved/rejected/implemented) from DB
  - Expected vs actual outcome with gap percentage
  - Decision maker and project name
  - Loading spinner and empty state
- Added "Decisions" count to "At This Point" card
- Retry button resets decisions loading state

## Key Design Decisions
- **Actual outcome derivation**: Since the Decision model lacks a numeric `outcome` field, actual outcome is computed from impact base score (critical=85, high=70, medium=50, low=30) weighted by confidence, with status adjustments (implemented +5, rejected -15)
- **Silent failure**: If decisions fetch fails, the sidebar gracefully shows "No decisions data available" instead of crashing the entire Time Machine view
- **Title truncation**: Decision titles longer than 16 chars are truncated in the chart X-axis to prevent overflow

## Lint Status
- 0 errors (1 pre-existing warning in login-page.tsx, unrelated)

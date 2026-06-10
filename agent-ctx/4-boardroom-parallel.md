# Task 4 — Boardroom AI Agent Parallel Calls

## Summary

Converted the `startDebate` function in `src/components/nexus/boardroom-view.tsx` from sequential `for`-loop agent calls to parallel `Promise.all()` with staggered rendering.

## Changes Made

### 1. Parallel Agent Calls (core change)
- **Before**: Sequential `for` loop — each `await fetch()` blocked the next, taking 30-60+ seconds total
- **After**: `boardMembers.map(async ...)` fires all 5 requests simultaneously, then `Promise.all(responsePromises)` waits for all to complete

### 2. Staggered Rendering
- Each promise's `.then()` callback independently updates the UI as soon as that agent responds
- `setResponses()` is called per-agent as they resolve, giving natural staggered appearance
- No artificial delays needed — responses render in the order they arrive

### 3. "Waiting for Responses" Indicator
- Added a live progress bar showing `X / 5 agents have responded`
- Uses dot indicators (filled/empty) to visualize progress
- Appears with `AnimatePresence` while agents are thinking, disappears when all respond

### 4. Consensus Loading State
- Added `consensusLoading` state to show a dedicated "Generating Board Consensus…" card
- Appears after all agent responses are in, while the consensus AI call is in flight
- Provides clear visual feedback that the final step is happening

### 5. All-Agents-Fail Error Handling
- Added `allFailed` state — if every single agent returns an error, a clear red error banner is shown
- Early return from `startDebate` without attempting consensus generation
- `isDebating` is set to `false` immediately in the all-fail case

### 6. Improved Consensus Prompt
- The consensus prompt now includes the actual agent response text (not just role names)
- This gives the CEO agent real content to synthesize, producing better consensus summaries

## Preserved
- All existing UI components and styling
- `AnimatePresence` for response animations
- Board member visual indicators (responded/thinking states)
- Consensus generation logic
- Scroll-to-bottom behavior (also triggers on `consensusLoading`)
- Preset scenarios
- `isDebating` only becomes false after consensus is fully generated (or all agents fail)

## Lint
- ESLint passes with zero errors

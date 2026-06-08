# Task 1: Replace Fake WebSearchConnector with Real Web Search

**Agent:** main
**Task ID:** 1
**Date:** 2026-03-05

## Summary

Replaced the fake WebSearchConnector implementation in `src/lib/connectors.ts` that was using `zai.chat.completions.create()` (LLM hallucination) with real web search using `zai.functions.invoke('web_search', ...)`.

## Changes

### File: `src/lib/connectors.ts`

Three methods in `WebSearchConnector` were updated:

1. **`search()` (lines 270-297)** — Now uses `zai.functions.invoke('web_search', { query, num })` instead of chat completions. Maps `name → title`, `snippet → snippet`, `url → url` for backward compatibility.

2. **`sync()` (lines 153-224)** — Now uses real web search for "technology and business trending topics" instead of asking an LLM to generate them. Maps results to structured format with title, url, snippet, source, date. Reports actual result count instead of hardcoded 1.

3. **`getHealthStatus()` (lines 234-268)** — Now uses lightweight web search (`num: 1`) as health check instead of chat completion ping.

## What Was Preserved

- `getZAI()` singleton pattern reused as-is
- `BaseConnector` abstract class and interfaces unchanged
- Other connectors (InternalDatabase, KnowledgeGraph, AgentNetwork) untouched
- ConnectorRegistry, SyncEngine, webhook handler, status helpers untouched
- Return types backward compatible
- Error handling patterns consistent

## Verification

- ✅ `bun run lint` — No errors
- ✅ Backward compatible return types

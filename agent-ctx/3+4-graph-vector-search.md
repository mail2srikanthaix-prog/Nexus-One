# Phase 3+4: Enhanced Knowledge Graph & Vector Search

**Task ID:** 3+4  
**Date:** 2026-03-05  
**Agent:** Graph & Search Engineer

## Summary

Implemented production-grade Knowledge Graph Engine with traversal, identity resolution, versioning, and cross-system linking, plus a complete Semantic Search Engine with vector embeddings via z-ai-web-dev-sdk and keyword fallback with TF-IDF-like scoring.

## Files Created

### Core Libraries
- **`src/lib/graph-engine.ts`** — Production Knowledge Graph Engine (400+ lines)
  - `traverseGraph()` — BFS graph traversal with configurable depth (1-4), direction filters, relation/node type filters, and limit
  - `resolveIdentities()` — Duplicate/related entity detection using name similarity (exact, contains, token overlap), property matching, and relation overlap scoring
  - `getEntityHistory()` — Entity version history reconstruction from DomainEvent records with date range filtering
  - `linkExternalSystem()` — Cross-system linking creating `linked_to` relations with external system metadata + domain event emission
  - `queryGraph()` — Structured graph queries with type, name pattern, property, relation type, and connected-to filtering
  - `getGraphFreshness()` — Per-entity-type data freshness metrics (count, last/oldest update)
  - `GRAPH_NODE_TYPES` — 10 node type definitions (person, team, project, system, customer, vendor, decision, data_asset, document, event)

- **`src/lib/vector-search.ts`** — Production Semantic Search Engine (500+ lines)
  - `semanticSearch()` — Hybrid semantic+keyword search with configurable weight (0=keyword, 1=semantic, 0.5=balanced)
  - `keywordSearch()` — TF-IDF-like keyword scoring with token overlap, partial matching, and coverage normalization
  - `findSimilar()` — Find similar entities using embedding similarity + keyword overlap + graph relationships + property matching
  - `storeEmbedding()` — Store embedding vectors as JSON in entity embedding fields (supports memory, document, agentMemory, graphEntity)
  - `reindexAll()` — Batch re-indexing of all entities with progress callbacks and error tracking
  - `cosineSimilarity()` — Vector cosine similarity computation
  - `generateEmbedding()` — Embedding generation via z-ai-web-dev-sdk (singleton pattern matching chat route)
  - Searches across: memories, documents, agent memories, events, decisions, predictions, tasks, people, projects, graph entities
  - Automatic fallback to keyword scoring when AI service is unavailable

### API Endpoints

- **`GET /api/search`** — Updated with `?mode=keyword|semantic|hybrid`, `?limit=N`, plus backward compatibility
- **`POST /api/graph/traverse`** — Graph traversal with `startEntityId` + `options` (maxDepth, direction, limit, relationTypes, nodeTypes)
- **`GET /api/graph/identity`** — Identity resolution with `?name=X&type=Y&threshold=Z`
- **`GET /api/graph/history`** — Entity version history with `?entityId=X&limit=N&from=ISO&to=ISO`
- **`GET /api/graph/freshness`** — Graph data freshness metrics
- **`GET /api/graph/query`** — Structured graph query with `?nodeTypes=X,Y&namePattern=Z&properties=JSON&relationType=R&connectedTo=ID`
- **`POST /api/graph/link`** — Cross-system linking with `{entityId, externalSystem, externalId, metadata}`
- **`POST /api/search/reindex`** — Batch embedding re-indexing with `{entityTypes, batchSize}`
- **`GET /api/search/similar`** — Find similar entities with `?entityId=X&entityType=Y&limit=N`

## Schema Changes

- `Memory` — Added `embedding String?` field
- `Document` — Added `embedding String?` field
- `GraphEntity` — Added `embedding String?` field
- `AgentMemory` already had `embedding String?` (from Phase 2)

## Design Decisions

1. **Embedding storage as JSON string** — SQLite lacks native vector support, so embeddings stored as JSON arrays in String fields. This enables cosine similarity computation in JS after retrieval.
2. **ZAI SDK singleton pattern** — Follows the same `getZAI()` singleton pattern as the chat route for efficient SDK reuse.
3. **Keyword fallback** — When AI/embedding service is unavailable, TF-IDF-like scoring with token overlap provides meaningful results.
4. **Hybrid search weight** — Default 0.7 (favoring semantic when available), configurable per request.
5. **BFS traversal** — Breadth-first search ensures entities at lower depths are discovered first, with configurable max depth 1-4 and node limit.
6. **Identity resolution scoring** — Multi-signal approach: exact name (0.6), contains (0.4), token overlap (0.3), type match (0.15), property overlap (0.1), connectivity bonus (0.02/connection).
7. **Backward compatibility** — Search API retains original GET behavior with `?q=&type=` params; `?mode=` parameter enables new semantic/hybrid modes.

## Verification

- ✅ `prisma db push` — Schema applied (3 new fields added)
- ✅ `bun run lint` — No errors
- ✅ Dev server stable

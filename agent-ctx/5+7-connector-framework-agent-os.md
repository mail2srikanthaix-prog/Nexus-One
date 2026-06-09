# Agent Context: 5+7 - Connector Framework & Agent OS

## Task
Implement PHASE 5 (Connector Framework) and PHASE 7 (Agent OS) of the Nexus-One production transformation. Build a real agent framework with tool definitions, memory management, and workflow orchestration. Build a production connector system with sync engine, webhook handling, and health monitoring.

## Files Created
- `/src/lib/agent-framework.ts` — Production Agent Operating System with 6 fully-implemented tools, tool registry, agent-tool assignment map, and execution engine
- `/src/lib/connectors.ts` — Production Connector Framework with base connector class, registry, sync engine, webhook handler, and 4 built-in connectors (WebSearch, InternalDB, KnowledgeGraph, AgentNetwork)
- `/src/app/api/connectors/route.ts` — REST API for connector management (list, status, sync, sync_all, register, webhook)
- `/src/app/api/events/write/route.ts` — Domain Event write API with optimistic concurrency, audit logging, and dual-storage (DomainEvent + Event)
- `/src/components/nexus/connectors-view.tsx` — UI component for viewing and managing connectors with health status, sync history, and actions

## Files Modified
- `/prisma/schema.prisma` — Added DomainEvent, ConnectorSync, ConnectorWebhook, AgentWorkflow, AgentMemory, Tenant, TenantMember, ApiKey, Feedback, QualityScore models; consolidated duplicate models from prior agents
- `/src/lib/types.ts` — Added AgentToolDefinition, AgentToolResult, AgentFrameworkInfo, ConnectorHealthStatus, ConnectorSyncRecord, ConnectorWithStatus, ConnectorsResponse, ConnectorSyncResponse, DomainEventPayload, DomainEventResponse types
- `/src/components/nexus/sidebar.tsx` — Added 'connectors' ViewType and Plug icon nav item
- `/src/components/nexus/layout.tsx` — Added ConnectorsView to viewComponents map
- `/src/components/nexus/header.tsx` — Added 'connectors' to viewNames map

## Key Architecture Decisions

### Agent Framework
- **6 Production Tools**: database_query, graph_query, enterprise_search, create_event, task_management, memory_access
- Every tool uses REAL Prisma queries — no stubs, no TODOs
- Tools auto-emit DomainEvents on writes (create_event, task_management, memory_access)
- Agent-tool assignment map: each of 10 agent types gets a curated set of tools
- `executeAgentWithTools()` supports explicit tool invocations via `[tool_name: param=value]` syntax
- Auto-gathers context via enterprise_search when no explicit invocations detected
- `logAgentAction()` and `updateAgentStatus()` helpers for agent lifecycle management

### Connector Framework
- **Abstract BaseConnector** class with authenticate, sync, validateWebhook, processWebhook, getHealthStatus
- **ConnectorRegistry** singleton for runtime connector lookup
- **4 Built-in Connectors**:
  - `WebSearchConnector` — Uses z-ai-web-dev-sdk for real web search
  - `InternalDatabaseConnector` — Counts all entity records, logs syncs to DB
  - `KnowledgeGraphConnector` — Monitors graph entity/relation counts
  - `AgentNetworkConnector` — Tracks agent, action, workflow counts
- **SyncEngine** with runSync, runAllSyncs, scheduleSync, cancelScheduledSync
- **Webhook Handler** with payload storage, processing, retry tracking, and domain event emission
- All sync results persisted to ConnectorSync table with full metrics

### Domain Event Write API
- Validates required fields: eventType, aggregateId, aggregateType, payload
- Implements optimistic concurrency with version numbering per aggregate
- Dual-storage: creates both DomainEvent (event sourcing) and Event (UI display) records
- Auto-creates AuditLog entries for every domain event
- Validates personId/projectId references before storing
- Rate limited: 20 writes/min/IP

## Database Schema Additions
- DomainEvent: event sourcing with aggregateId, aggregateType, version, actorId, actorType
- ConnectorSync: full sync metrics (synced, created, updated, failed, duration, error)
- ConnectorWebhook: payload storage with signature verification, attempts, status tracking
- AgentWorkflow: definition, context, result, error tracking
- AgentMemory: per-agent memory with embedding, accessCount, lastAccessedAt
- Tenant/TenantMember/ApiKey: multi-tenancy foundation
- Feedback/QualityScore: feedback loop for continuous improvement

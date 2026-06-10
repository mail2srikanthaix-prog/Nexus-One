<p align="center">
  <img src="public/nexus-banner.png" alt="NEXUS ONE Banner" width="100%" />
</p>

<h1 align="center">NEXUS ONE</h1>

<h3 align="center">Autonomous Enterprise Intelligence Operating System</h3>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-reference">API</a> •
  <a href="#infrastructure">Infrastructure</a> •
  <a href="#security">Security</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6-blueviolet?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Overview

**NEXUS ONE** is a production-grade, full-stack enterprise intelligence platform that combines **autonomous AI agents**, **knowledge graphs**, **semantic search**, **event sourcing**, and **multi-tenant security** into a unified operating system for organizational intelligence.

Built on Next.js 16 with a zero-trust security model, NEXUS ONE provides real-time intelligence dashboards, AI-powered boardroom simulations, predictive analytics, and a self-improving learning engine — all governed by enterprise-grade RBAC, compliance frameworks, and observability.

---

## Features

### 🤖 Autonomous Agent Framework
- **10 specialized agents** — CEO, CTO, CFO, COO, CRO, Security, HR, Knowledge, Workflow, Monitoring
- **6 built-in tools** — database_query, graph_query, enterprise_search, create_event, task_management, memory_access
- Per-agent tool assignments and specialized system prompts
- Agent memory with importance scoring and expiration
- Action logging with confidence levels and evidence chains

### 🧠 Knowledge Graph Engine
- Entity-relationship model with **10 entity types** (person, team, project, system, customer, vendor, decision, data_asset, document, event)
- **BFS graph traversal** with configurable depth, direction, and type filters
- **Identity resolution** — name similarity, property matching, relation overlap scoring
- **Cross-system linking** — integrate records from external systems
- **Entity versioning** via event replay for full history
- **Data freshness monitoring** per entity type

### 🔍 Semantic & Hybrid Search
- **Hybrid search** combining semantic similarity + keyword matching with configurable weights
- **Embedding generation** via AI SDK (nomic-embed-text)
- **Cosine similarity** and TF-IDF fallback scoring
- **Similar entity discovery** with graph relationship bonus
- **Batch reindexing** for embedding regeneration
- Searches across 10 entity types

### 🛡️ Enterprise Security
- **NextAuth v4** with JWT sessions and credentials provider
- **Multi-Factor Authentication** (MFA) with TOTP
- **API Key authentication** (`nx_live_` prefix, SHA-256 hashed, auto-expiry)
- **RBAC** — 6 roles, 30+ granular permissions in `resource:action` format
- **Rate limiting** — 120 req/min with in-memory tracking
- **Input validation** — Zod schemas on all endpoints
- **Field-level encryption** — AES-256-GCM for sensitive data
- **Account lockout** — 5 attempts, 30-minute cooldown
- **CSRF protection** with timing-safe token comparison
- **Security headers** — CSP, HSTS, X-Frame-Options, and more
- **Audit logging** — batched writes, structured events, queryable

### 🏢 Multi-Tenancy
- Tenant isolation at database, API, and UI levels
- Per-tenant resource limits (max users, agents, storage)
- Tenant-aware caching with namespaced keys
- Organization-based indirect filtering for cross-tenant data
- Tenant member roles and permissions

### 📡 Event Sourcing
- Append-only event log with optimistic concurrency (auto-versioning)
- Event stream queries with version filtering
- Event type subscription for read model building
- **Full event replay** for aggregate state reconstruction
- Domain events for graph, agent, connector, and learning subsystems

### 🔌 Connector Framework
- **Abstract `BaseConnector`** class with authenticate, sync, webhook, health lifecycle
- **4 built-in connectors**:
  - `WebSearchConnector` — Real web search via AI SDK
  - `InternalDatabaseConnector` — SQLite health monitoring
  - `KnowledgeGraphConnector` — Entity/relation synchronization
  - `AgentNetworkConnector` — Agent status monitoring
- `SyncEngine` with scheduled syncs, incremental mode, and error handling
- **Webhook processing** with signature validation
- Per-connector health monitoring and sync metrics

### 🎓 Learning Engine
- **Closed-loop pipeline**: Observe → Reason → Act → Improve
- Observation recording with in-memory ring buffer + event persistence
- Accuracy analysis blending predicted vs. observed outcomes
- Root cause analysis with keyword extraction from negative feedback
- Automatic adjustment (decommission, recalibrate, status reset)
- **Quality scoring** with hourly/daily/weekly rolling windows
- Periodic evaluation pipeline for continuous improvement

### 📋 Compliance
- **7 data retention policies** with delete/archive/anonymize actions
- **Legal hold** management — blocks deletion under active holds
- **Data lineage** tracking across the system
- **GDPR** — Right of Access (data export), Right to Erasure, anonymization
- **Compliance reporting** — automated checks for SOC2, GDPR, ISO 27001, HIPAA, NIST
- Overall compliance score calculation

### 📊 Observability
- `MetricsCollector` with sliding window (p50, p95, p99 latencies)
- Database health check with latency grading
- System health status (healthy / degraded / unhealthy)
- Memory usage tracking and alerting
- Prometheus + Grafana dashboards

### 💬 AI Chat & Boardroom
- Agent-specific conversations with context-aware system prompts
- **AI Boardroom** — multi-agent discussions on enterprise topics
- Chat history with session management

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXUS ONE ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Dashboard │  │  Graph   │  │  Agents  │  │  AI Boardroom │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       │              │              │                │             │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌──────┴───────┐    │
│  │  Search  │  │ Predict. │  │  Events  │  │  Time Machine │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       │              │              │                │             │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌──────┴───────┐    │
│  │  Memory  │  │ Security │  │Connector │  │   Learning    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
│                                                                   │
│═══════════════════ API LAYER (30+ REST Endpoints) ═══════════════│
│                                                                   │
│  ┌────────────┐ ┌────────────┐ ┌───────────┐ ┌──────────────┐   │
│  │   Auth     │ │   RBAC     │ │  Audit    │ │  Rate Limit  │   │
│  │ NextAuth   │ │ 6 Roles    │ │ Batched   │ │ 120 req/min  │   │
│  │ JWT + MFA  │ │ 30+ Perms  │ │ Structured│ │ In-Memory    │   │
│  └────────────┘ └────────────┘ └───────────┘ └──────────────┘   │
│                                                                   │
│═══════════════════ ENGINE LAYER ═════════════════════════════════│
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐   │
│  │ Graph Engine │ │ Agent Frame. │ │   Event Sourcing       │   │
│  │ BFS Traverse │ │ 10 Agents    │ │ Append-Only Log        │   │
│  │ Identity Res.│ │ 6 Tools      │ │ Optimistic Concurrency │   │
│  │ Versioning   │ │ Memory Store │ │ Event Replay           │   │
│  └──────────────┘ └──────────────┘ └────────────────────────┘   │
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐   │
│  │ Vector Search│ │  Connectors  │ │   Learning Engine      │   │
│  │ Hybrid Srch  │ │ 4 Built-in   │ │ Closed-Loop Pipeline   │   │
│  │ Embeddings   │ │ Sync Engine  │ │ Quality Scoring        │   │
│  │ Reindexing   │ │ Webhooks     │ │ Auto-Adjustment        │   │
│  └──────────────┘ └──────────────┘ └────────────────────────┘   │
│                                                                   │
│═══════════════════ DATA LAYER ═══════════════════════════════════│
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐   │
│  │   SQLite /   │ │  Caching     │ │   Compliance           │   │
│  │  PostgreSQL  │ │ In-Memory    │ │ GDPR/SOC2/HIPAA/NIST   │   │
│  │  25 Models   │ │ TTL + Tenant │ │ Retention + Legal Hold │   │
│  └──────────────┘ └──────────────┘ └────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, React 19) |
| **Language** | TypeScript 5 |
| **Database** | SQLite (dev) / PostgreSQL (prod) via Prisma 6 |
| **Auth** | NextAuth v4 (JWT, Credentials, MFA, API Keys) |
| **AI/LLM** | z-ai-web-dev-sdk (embeddings, chat, image generation) |
| **State** | Zustand 5 (client), TanStack Query (server) |
| **UI** | Tailwind CSS 4, shadcn/ui (50+ components), Framer Motion |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **Validation** | Zod (all API inputs) |
| **Theming** | next-themes (dark mode default) |
| **Runtime** | Bun (preferred) / Node 20 |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0 (recommended) or Node.js >= 20
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/mail2srikanthaix-prog/Nexus-One.git
cd Nexus-One

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize the database
bun run db:push
bun run db:seed

# Start the development server
bun run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="file:./dev.db"                    # SQLite for dev
# DATABASE_URL="postgresql://user:pass@host:5432/nexus"  # PostgreSQL for prod

# Authentication
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Encryption (optional, derives from NEXTAUTH_SECRET)
ENCRYPTION_KEY="your-encryption-key-32-bytes"

# AI SDK
ZAI_BASE_URL="https://api.z-ai.dev"
ZAI_API_KEY="your-z-ai-api-key"
EMBEDDING_MODEL="nomic-embed-text"
AI_MODEL="your-model-id"

# Infrastructure (optional, for production)
REDIS_URL="redis://localhost:6379"
NEO4J_URI="bolt://localhost:7687"
QDRANT_URL="http://localhost:6333"
KAFKA_BROKERS="localhost:9092"
```

### NPM Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start development server on port 3000 |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint checks |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma Client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:seed` | Seed the database with initial data |

---

## Database Schema

NEXUS ONE uses **25 Prisma models** organized across 6 domains:

<details>
<summary><strong>📊 View Full Schema Overview</strong></summary>

### Core Domain
| Model | Purpose |
|---|---|
| `Organization` | Companies with tenant linkage |
| `Person` | People with risk/influence scores |
| `Team` | Teams with org membership |
| `Project` | Projects with health, progress, risk, budget |
| `Decision` | Decisions with confidence and impact |
| `Task` | Tasks with status, priority, assignment |
| `Document` | Documents with embeddings |
| `Event` | Enterprise events with severity metadata |

### Knowledge Graph
| Model | Purpose |
|---|---|
| `GraphEntity` | Nodes (10 types) with embeddings |
| `GraphRelation` | Typed weighted edges between entities |

### Agent Framework
| Model | Purpose |
|---|---|
| `Agent` | 10 agent types with capabilities and status |
| `AgentAction` | Action log with confidence and evidence |
| `AgentWorkflow` | Workflow execution with context/results |
| `AgentMemory` | Agent-specific memory with embeddings |

### Multi-Tenancy
| Model | Purpose |
|---|---|
| `Tenant` | Tenant with plan and resource limits |
| `TenantMember` | User-tenant membership with role |
| `ApiKey` | API keys with hash, permissions, expiry |

### Event Sourcing
| Model | Purpose |
|---|---|
| `DomainEvent` | Append-only event log with versioning |

### Intelligence
| Model | Purpose |
|---|---|
| `Memory` | Organizational memory (5 types) with embeddings |
| `Prediction` | Predictions with probability and evidence |
| `Connector` | Data connectors with sync status |
| `ConnectorSync` | Sync history with metrics |
| `ConnectorWebhook` | Inbound webhook processing |
| `Feedback` | User feedback with ratings |
| `QualityScore` | Rolling quality metrics |
| `LegalHold` | Legal hold on entities |
| `DataLineage` | Data lineage tracking |
| `User` | Users with MFA and lockout |
| `AuditLog` | Comprehensive audit trail |
| `ChatMessage` | AI chat history |

</details>

---

## API Reference

### 30+ REST Endpoints

<details>
<summary><strong>🔐 Authentication & Authorization</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | NextAuth handler (login, logout, session) |
| `GET` | `/api/auth/session-check` | Validate active session |
| `POST` | `/api/auth/mfa/setup` | Generate MFA secret & QR code |
| `POST` | `/api/auth/mfa/enable` | Enable MFA for user |
| `POST` | `/api/auth/mfa/disable` | Disable MFA for user |
| `POST` | `/api/auth/api-key` | Create new API key |
| `GET` | `/api/auth/api-key/list` | List user's API keys |
| `POST` | `/api/auth/api-key/verify` | Verify an API key |
| `POST` | `/api/auth/api-key/revoke` | Revoke an API key |

</details>

<details>
<summary><strong>📊 Core Platform</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check (DB, AI, memory) |
| `GET` | `/api/dashboard` | Dashboard aggregation data |
| `GET` | `/api/agents` | List and manage agents |
| `POST` | `/api/chat` | AI chat with agents |
| `GET` | `/api/connectors` | Connector management & sync |
| `GET` | `/api/security` | Security dashboard data |

</details>

<details>
<summary><strong>🧠 Knowledge Graph</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/graph` | List graph entities |
| `POST` | `/api/graph/query` | Structured graph queries |
| `POST` | `/api/graph/traverse` | BFS graph traversal |
| `POST` | `/api/graph/identity` | Identity resolution |
| `GET` | `/api/graph/history` | Entity version history |
| `GET` | `/api/graph/freshness` | Data freshness check |
| `POST` | `/api/graph/link` | Cross-system linking |

</details>

<details>
<summary><strong>🔍 Search & Intelligence</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/search` | Enterprise search |
| `POST` | `/api/search/similar` | Find similar entities |
| `POST` | `/api/search/reindex` | Re-generate embeddings |
| `GET` | `/api/predictions` | Predictions CRUD |
| `GET` | `/api/memory` | Organizational memory |
| `GET` | `/api/events` | Read events |
| `POST` | `/api/events/write` | Write events |

</details>

<details>
<summary><strong>🎓 Learning & Quality</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/feedback` | Submit feedback |
| `GET` | `/api/quality` | Quality scores |
| `POST` | `/api/learning` | Trigger learning evaluation |

</details>

---

## Security

NEXUS ONE implements a **zero-trust security model** with defense in depth:

### Authentication Layers
```
Request → Edge Middleware → JWT/API Key Auth → RBAC Permission Check → Rate Limit → Route Handler
```

### RBAC Permission Matrix

| Permission | Super Admin | Admin | Manager | Analyst | Viewer | Agent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `agent:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `agent:execute` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `agent:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `knowledge:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `knowledge:write` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `knowledge:delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `graph:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `graph:write` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `connector:execute` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `chat:write` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `user:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `system:config` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Security Features
- 🔐 **AES-256-GCM** field-level encryption for sensitive data
- 🔑 **SHA-256** hashed API keys with timing-safe comparison
- 🛡️ **CSRF tokens** with validation on every state-changing request
- 🚫 **Account lockout** after 5 failed login attempts (30-min cooldown)
- 📝 **Batched audit logging** with structured event types
- 🧹 **Input sanitization** — XSS, SQL injection, email validation
- 📋 **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options

---

## Infrastructure

### Docker Compose (9 Services)

```bash
# Start full stack
cd infrastructure/docker
docker-compose up -d
```

| Service | Image | Port | Purpose |
|---|---|---|---|
| `app` | Next.js standalone | 3000 | Application server |
| `postgres` | PostgreSQL 16 | 5432 | Primary database |
| `redis` | Redis 7 | 6379 | Caching & sessions |
| `neo4j` | Neo4j 5 | 7474/7687 | Graph database |
| `qdrant` | Qdrant v1.8 | 6333 | Vector search |
| `kafka` | Confluent 7.6 | 9092 | Event streaming |
| `zookeeper` | Confluent 7.6 | 2181 | Kafka coordination |
| `prometheus` | Prometheus v2.50 | 9090 | Metrics collection |
| `grafana` | Grafana 10.3 | 3001 | Dashboards & alerts |

### Production Dockerfile

Multi-stage production build:
1. **Dependencies** — `bun install` + Prisma generate
2. **Build** — Next.js standalone output
3. **Runtime** — Non-root user, tini init, health checks

### Kubernetes

Complete K8s manifest with:
- 3-replica Deployment with rolling updates
- Horizontal Pod Autoscaler (3–12 replicas)
- NetworkPolicy (ingress/egress rules)
- PodDisruptionBudget (50% min available)
- ServiceAccount + RBAC with minimal permissions
- Security context (non-root, read-only FS, seccomp)

### Terraform (AWS)

Full infrastructure-as-code:
- VPC with 3-AZ public/private subnets + NAT Gateways
- RDS PostgreSQL 16 (Multi-AZ, encrypted, Performance Insights)
- ElastiCache Redis 7 (cluster mode, encryption)
- MSK Kafka 3.6 (3 brokers, TLS, monitoring)
- EKS 1.29 with managed node groups
- S3 buckets (logs + backups, KMS encrypted)
- IAM roles with least-privilege policies

### CI/CD Pipeline (GitHub Actions)

5-stage pipeline with security gates:

```
Lint → Security Scan → Build → Deploy Staging → Deploy Production
  ↓         ↓            ↓           ↓                ↓
ESLint   npm audit    Docker      kubectl          Canary
TSC     Trivy scan    build       rollout         deploy
         GitLeaks     + push     + health         + verify
                                   check          + notify
```

### Monitoring (Prometheus + Grafana)

4 pre-built Grafana dashboards:
- 🤖 **Agent Health** — Agent status, action rates, confidence levels
- 📊 **App Overview** — Request rates, latencies (p50/p95/p99), error rates
- 🗄️ **Database Performance** — Query times, connection pools, slow queries
- 🛡️ **Security Monitoring** — Auth events, rate limit hits, permission denials

---

## Project Structure

```
nexus-one/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main entry (landing → login → app)
│   │   ├── layout.tsx                # Root layout (dark theme, providers)
│   │   └── api/                      # 30+ REST API routes
│   │       ├── auth/                 # Authentication (NextAuth, MFA, API keys)
│   │       ├── graph/                # Knowledge Graph (7 endpoints)
│   │       ├── search/              # Search (semantic, similar, reindex)
│   │       ├── agents/              # Agent management
│   │       ├── chat/                # AI conversations
│   │       ├── connectors/          # Data connectors
│   │       ├── events/              # Event sourcing
│   │       └── ...                   # health, dashboard, feedback, etc.
│   ├── components/
│   │   ├── nexus/                    # 15 custom application views
│   │   │   ├── layout.tsx           # App shell (sidebar + header + content)
│   │   │   ├── landing-page.tsx     # Public landing page
│   │   │   ├── login-page.tsx       # Authentication UI
│   │   │   ├── dashboard-view.tsx   # Main dashboard
│   │   │   ├── graph-view.tsx       # Knowledge graph visualization
│   │   │   ├── agents-view.tsx      # Agent management
│   │   │   ├── boardroom-view.tsx   # AI Boardroom
│   │   │   ├── search-view.tsx      # Enterprise search
│   │   │   ├── timemachine-view.tsx # Historical playback
│   │   │   └── ...                   # predictions, events, memory, etc.
│   │   └── ui/                       # 50+ shadcn/ui components
│   ├── lib/                          # 17 core engine modules
│   │   ├── agent-framework.ts       # 10-agent system with tools
│   │   ├── graph-engine.ts          # Graph traversal & identity
│   │   ├── vector-search.ts         # Hybrid semantic search
│   │   ├── event-sourcing.ts        # Append-only event store
│   │   ├── connectors.ts            # Connector registry & sync
│   │   ├── learning-engine.ts       # Closed-loop learning
│   │   ├── compliance.ts            # GDPR, SOC2, HIPAA, NIST
│   │   ├── rbac.ts                  # Role-based access control
│   │   ├── security.ts              # Encryption, sanitization, CSRF
│   │   ├── audit.ts                 # Batched audit logging
│   │   ├── observability.ts         # Health checks & metrics
│   │   ├── tenant-context.ts        # Multi-tenant isolation
│   │   ├── api-key-auth.ts          # API key management
│   │   ├── cache.ts                 # In-memory caching with TTL
│   │   ├── performance.ts           # Performance monitoring
│   │   └── ...                       # db, auth-store, utils
│   ├── hooks/                        # React hooks
│   └── middleware.ts                 # Edge auth, RBAC, rate limiting
├── prisma/
│   ├── schema.prisma                 # 25 database models
│   └── seed.ts                       # Database seeder
├── infrastructure/
│   ├── docker/                       # Docker Compose + Dockerfile
│   ├── kubernetes/                   # K8s manifests
│   ├── terraform/                    # AWS IaC
│   ├── ci-cd/                        # GitHub Actions
│   └── monitoring/                   # Prometheus + Grafana
├── public/                           # Static assets
└── package.json
```

---

## Compliance

NEXUS ONE supports automated compliance reporting for:

| Framework | Key Controls |
|---|---|
| **GDPR** | Right of Access, Right to Erasure, data anonymization, consent tracking |
| **SOC 2** | Access controls, audit logging, encryption, incident response |
| **ISO 27001** | Information security management, risk assessment, access control |
| **HIPAA** | PHI encryption, access audit, breach notification |
| **NIST** | Security controls, risk management framework, continuous monitoring |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>NEXUS ONE</strong> — Autonomous Enterprise Intelligence Operating System<br/>
  Built with ❤️ using Next.js, TypeScript, and AI
</p>

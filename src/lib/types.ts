/**
 * Shared TypeScript interfaces for NEXUS ONE frontend components.
 * These types represent the shape of API responses and internal data structures.
 */

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalPeople: number
  activePeople: number
  totalTeams: number
  totalProjects: number
  activeProjects: number
  totalTasks: number
  activeTasks: number
  completedTasks: number
  criticalEvents: number
  totalEvents: number
  activePredictions: number
  criticalPredictions: number
  connectedConnectors: number
  totalConnectors: number
  totalRecords: number
  totalBudget: number
  totalBudgetUsed: number
  budgetUtilization: string
  avgProjectHealth: string
  agentStatus: {
    idle: number
    thinking: number
    executing: number
    reporting: number
  }
}

export interface DashboardAgent {
  id: string
  name: string
  type: string
  status: string
  lastAction?: string
  actions: Array<{ id: string; type: string; title: string; status: string; confidence?: number; createdAt: string }>
}

export interface DashboardPrediction {
  id: string
  title: string
  probability: number
  impact: string
}

export interface DashboardEvent {
  id: string
  title: string
  type: string
  severity: string
  source?: string
  createdAt: string
}

export interface DashboardProject {
  id: string
  name: string
  health: number
}

export interface DashboardConnector {
  id: string
  name: string
  status: string
}

export interface DashboardData {
  organization: { id: string; name: string; industry?: string; size?: string; revenue?: number } | null
  metrics: DashboardMetrics
  agents: DashboardAgent[]
  predictions: DashboardPrediction[]
  recentEvents: DashboardEvent[]
  topMemories: Array<{ id: string; title: string; type: string; content: string; importance: number }>
  projects: DashboardProject[]
  connectors: DashboardConnector[]
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export interface AgentAction {
  id: string
  type: string
  title: string
  status: string
  confidence?: number
  createdAt: string
}

export interface AgentData {
  id: string
  name: string
  type: string
  status: string
  description?: string
  capabilities?: string
  lastAction?: string
  actions: AgentAction[]
}

export interface AgentsResponse {
  agents: AgentData[]
  statusCounts: Record<string, number>
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchPerson {
  id: string
  name: string
  role: string
  department: string
  status: string
  influenceScore: number
}

export interface SearchProject {
  id: string
  name: string
  status: string
  description?: string
  health: number
  progress: number
}

export interface SearchDecision {
  id: string
  title: string
  status: string
  impact: string
  confidence: number
}

export interface SearchEvent {
  id: string
  title: string
  severity: string
  source?: string
  type: string
  createdAt: string
}

export interface SearchMemory {
  id: string
  title: string
  type: string
  content: string
  importance: number
  tags?: string
}

export interface SearchTask {
  id: string
  title: string
  priority: string
  status: string
}

export interface SearchPrediction {
  id: string
  title: string
  impact: string
  probability: number
}

export interface SearchResults {
  people?: SearchPerson[]
  projects?: SearchProject[]
  decisions?: SearchDecision[]
  events?: SearchEvent[]
  memories?: SearchMemory[]
  tasks?: SearchTask[]
  predictions?: SearchPrediction[]
}

export interface SearchResponse {
  totalResults: number
  results: SearchResults
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  type: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
  relationCount: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
  sourceName: string
  targetName: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  totalEntities: number
  totalRelations: number
  typeCounts: Record<string, number>
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface EventData {
  id: string
  title: string
  type: string
  severity: string
  description?: string
  source?: string
  createdAt: string
  person?: { name: string }
  project?: { name: string }
}

export interface EventsResponse {
  events: EventData[]
  total: number
  severityCounts: Record<string, number>
  typeCounts: Record<string, number>
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export interface PredictionData {
  id: string
  title: string
  type: string
  impact: string
  status: string
  probability: number
  description?: string
  timeframe?: string
  evidence?: string
}

export interface PredictionsResponse {
  predictions: PredictionData[]
  total: number
  highRiskCount: number
  avgProbability: string
  impactCounts: Record<string, number>
  typeCounts: Record<string, number>
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export interface MemoryData {
  id: string
  title: string
  type: string
  content: string
  importance: number
  source?: string
  tags?: string
  createdAt: string
}

export interface MemoryResponse {
  memories: MemoryData[]
  total: number
  typeCounts: Record<string, number>
}

// ─── Security ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  action: string
  actor?: string
  resource?: string
  severity: string
  ipAddress?: string
  createdAt: string
}

export interface SecurityConnector {
  id: string
  name: string
  type: string
  status: string
  lastSync?: string
}

export interface RiskPerson {
  id: string
  name: string
  riskScore: number
  role: string
}

export interface SecurityPrediction {
  id: string
  title: string
  probability: number
  description?: string
}

export interface SecurityResponse {
  securityScore: number
  totalAuditLogs: number
  auditLogs: AuditLog[]
  securityConnectors: SecurityConnector[]
  errorConnectors: SecurityConnector[]
  highRiskPeople: RiskPerson[]
  securityPredictions: SecurityPrediction[]
  severityCounts: Record<string, number>
}

// ─── Agent Framework ─────────────────────────────────────────────────────────

export interface AgentToolDefinition {
  name: string
  description: string
  parameters: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean'
      description: string
      required?: boolean
      enum?: string[]
    }
  >
}

export interface AgentToolResult {
  name: string
  params: Record<string, unknown>
  result: {
    success: boolean
    data?: unknown
    error?: string
    metadata?: Record<string, unknown>
  }
}

export interface AgentFrameworkInfo {
  agentType: string
  availableTools: string[]
  toolDefinitions: AgentToolDefinition[]
}

// ─── Connectors ──────────────────────────────────────────────────────────────

export interface ConnectorHealthStatus {
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  lastSync?: string
  lastError?: string
  uptime: number
}

export interface ConnectorSyncRecord {
  id: string
  status: string
  recordsSynced: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  error?: string
  duration: number
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface ConnectorWithStatus {
  id: string
  name: string
  type: string
  category: string
  status: string
  lastSync: string | null
  recordCount: number | null
  orgId: string | null
  createdAt: string
  updatedAt: string
  health?: ConnectorHealthStatus
  syncHistory?: ConnectorSyncRecord[]
}

export interface ConnectorsResponse {
  connectors: ConnectorWithStatus[]
  summary: {
    total: number
    healthy: number
    degraded: number
    down: number
  }
  runtimeTypes: string[]
}

export interface ConnectorSyncResponse {
  action: string
  connectorType: string
  result: {
    success: boolean
    recordsProcessed: number
    recordsCreated: number
    recordsUpdated: number
    recordsFailed: number
    errors: Array<{ record: unknown; error: string }>
    duration: number
    nextSyncAt: string
  }
}

// ─── Domain Events ───────────────────────────────────────────────────────────

export interface DomainEventPayload {
  eventType: string
  aggregateId: string
  aggregateType: string
  payload: Record<string, unknown>
  metadata?: Record<string, unknown>
  actorId?: string
  actorType?: 'user' | 'agent' | 'system'
  tenantId?: string
  title?: string
  severity?: 'info' | 'warning' | 'error' | 'critical'
  description?: string
  source?: string
  personId?: string
  projectId?: string
}

export interface DomainEventResponse {
  domainEvent: {
    id: string
    eventType: string
    aggregateId: string
    aggregateType: string
    version: number
    payload: Record<string, unknown>
    metadata: Record<string, unknown> | null
    actorId: string | null
    actorType: string | null
    tenantId: string | null
    createdAt: string
  }
  event: {
    id: string
    type: string
    title: string
    severity: string
    source: string
    createdAt: string
  }
}

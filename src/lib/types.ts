/**
 * Shared TypeScript interfaces for NEXUS ONE frontend components.
 * These types represent the shape of API responses and internal data structures.
 */

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalPeople: number
  activeProjects: number
  activeTasks: number
  completedTasks: number
  criticalEvents: number
  budgetUtilization: number
  avgProjectHealth: number
  totalEvents: number
  agentStatus: {
    idle: number
    thinking: number
    executing: number
    reporting: number
    error: number
  }
}

export interface DashboardAgent {
  id: string
  name: string
  type: string
  status: string
  lastAction?: string
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
  metrics: DashboardMetrics
  agents: DashboardAgent[]
  predictions: DashboardPrediction[]
  recentEvents: DashboardEvent[]
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
  highRiskPeople: RiskPerson[]
  securityPredictions: SecurityPrediction[]
}

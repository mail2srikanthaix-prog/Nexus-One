/**
 * Production Knowledge Graph Engine
 *
 * Provides graph traversal, identity resolution, versioning,
 * cross-system linking, structured queries, and freshness checks
 * for the Nexus-One knowledge graph.
 */

import { db } from '@/lib/db'

// ─── Graph Types ──────────────────────────────────────────────────────────

export interface GraphNodeType {
  type: string
  label: string
  color: string
  icon: string
}

export const GRAPH_NODE_TYPES: Record<string, GraphNodeType> = {
  person: { type: 'person', label: 'Person', color: '#10b981', icon: 'user' },
  team: { type: 'team', label: 'Team', color: '#8b5cf6', icon: 'users' },
  project: { type: 'project', label: 'Project', color: '#3b82f6', icon: 'folder' },
  system: { type: 'system', label: 'System', color: '#f59e0b', icon: 'server' },
  customer: { type: 'customer', label: 'Customer', color: '#06b6d4', icon: 'building' },
  vendor: { type: 'vendor', label: 'Vendor', color: '#f97316', icon: 'truck' },
  decision: { type: 'decision', label: 'Decision', color: '#ec4899', icon: 'git-branch' },
  data_asset: { type: 'data_asset', label: 'Data Asset', color: '#84cc16', icon: 'database' },
  document: { type: 'document', label: 'Document', color: '#a855f7', icon: 'file-text' },
  event: { type: 'event', label: 'Event', color: '#ef4444', icon: 'zap' },
}

// ─── Graph Traversal ──────────────────────────────────────────────────────

export interface TraversalOptions {
  maxDepth?: number      // Max traversal depth (default: 2, max: 4)
  relationTypes?: string[]  // Filter by relation types
  nodeTypes?: string[]   // Filter by node types
  direction?: 'outgoing' | 'incoming' | 'both'  // Direction of traversal
  limit?: number         // Max nodes to return
}

export interface TraversalResult {
  nodes: Array<{
    id: string
    type: string
    name: string
    properties: Record<string, unknown> | null
    depth: number
    relationCount: number
  }>
  edges: Array<{
    id: string
    sourceId: string
    targetId: string
    type: string
    weight: number
    properties: Record<string, unknown> | null
  }>
  stats: {
    totalNodes: number
    totalEdges: number
    maxDepthReached: number
    traversalTimeMs: number
  }
}

/**
 * Traverse the graph starting from a given entity.
 * Uses BFS with configurable depth and filters.
 */
export async function traverseGraph(
  startEntityId: string,
  options: TraversalOptions = {}
): Promise<TraversalResult> {
  const startTime = Date.now()
  const maxDepth = Math.min(options.maxDepth ?? 2, 4)
  const limit = options.limit ?? 100
  const direction = options.direction ?? 'both'
  const relationTypes = options.relationTypes
  const nodeTypes = options.nodeTypes

  // Verify start entity exists
  const startEntity = await db.graphEntity.findUnique({
    where: { id: startEntityId },
  })
  if (!startEntity) {
    return {
      nodes: [],
      edges: [],
      stats: { totalNodes: 0, totalEdges: 0, maxDepthReached: 0, traversalTimeMs: Date.now() - startTime },
    }
  }

  // BFS traversal
  const visitedNodes = new Set<string>()
  const visitedEdges = new Set<string>()
  const resultNodes: TraversalResult['nodes'] = []
  const resultEdges: TraversalResult['edges'] = []

  // Queue entries: [entityId, depth]
  const queue: Array<[string, number]> = [[startEntityId, 0]]
  visitedNodes.add(startEntityId)

  // Add the start node
  const startRelationCount = await db.graphRelation.count({
    where: {
      OR: [
        { sourceId: startEntityId },
        { targetId: startEntityId },
      ],
    },
  })
  resultNodes.push({
    id: startEntity.id,
    type: startEntity.type,
    name: startEntity.name,
    properties: safeParseJson(startEntity.properties),
    depth: 0,
    relationCount: startRelationCount,
  })

  while (queue.length > 0 && resultNodes.length < limit) {
    const [currentId, currentDepth] = queue.shift()!

    if (currentDepth >= maxDepth) continue

    // Build where clause for relations based on direction
    const relationWhere: Record<string, unknown>[] = []

    if (direction === 'outgoing' || direction === 'both') {
      relationWhere.push({ sourceId: currentId })
    }
    if (direction === 'incoming' || direction === 'both') {
      relationWhere.push({ targetId: currentId })
    }

    const relationFilter: Record<string, unknown> = {
      OR: relationWhere,
    }

    // Apply relation type filter
    if (relationTypes && relationTypes.length > 0) {
      relationFilter.type = { in: relationTypes }
    }

    const relations = await db.graphRelation.findMany({
      where: relationFilter,
    })

    for (const relation of relations) {
      if (visitedEdges.has(relation.id)) continue
      visitedEdges.add(relation.id)

      // Determine the neighbor entity
      const neighborId = relation.sourceId === currentId ? relation.targetId : relation.sourceId

      // Apply node type filter to neighbors
      if (visitedNodes.has(neighborId)) {
        // Still add the edge even if node was already visited
        resultEdges.push({
          id: relation.id,
          sourceId: relation.sourceId,
          targetId: relation.targetId,
          type: relation.type,
          weight: relation.weight,
          properties: safeParseJson(relation.properties),
        })
        continue
      }

      // Fetch neighbor entity
      const neighbor = await db.graphEntity.findUnique({
        where: { id: neighborId },
      })

      if (!neighbor) continue

      // Apply node type filter
      if (nodeTypes && nodeTypes.length > 0 && !nodeTypes.includes(neighbor.type)) continue

      visitedNodes.add(neighborId)

      const neighborRelationCount = await db.graphRelation.count({
        where: {
          OR: [
            { sourceId: neighborId },
            { targetId: neighborId },
          ],
        },
      })

      resultNodes.push({
        id: neighbor.id,
        type: neighbor.type,
        name: neighbor.name,
        properties: safeParseJson(neighbor.properties),
        depth: currentDepth + 1,
        relationCount: neighborRelationCount,
      })

      resultEdges.push({
        id: relation.id,
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        type: relation.type,
        weight: relation.weight,
        properties: safeParseJson(relation.properties),
      })

      if (resultNodes.length < limit) {
        queue.push([neighborId, currentDepth + 1])
      }
    }
  }

  const maxDepthReached = resultNodes.reduce((max, n) => Math.max(max, n.depth), 0)

  return {
    nodes: resultNodes,
    edges: resultEdges,
    stats: {
      totalNodes: resultNodes.length,
      totalEdges: resultEdges.length,
      maxDepthReached,
      traversalTimeMs: Date.now() - startTime,
    },
  }
}

// ─── Identity Resolution ──────────────────────────────────────────────────

export interface IdentityMatch {
  entityId: string
  entityType: string
  entityName: string
  matchScore: number
  matchFields: string[]
}

/**
 * Resolve potential duplicate or related entities.
 * Uses name similarity, property matching, and relation overlap.
 */
export async function resolveIdentities(
  name: string,
  type?: string,
  threshold: number = 0.5
): Promise<IdentityMatch[]> {
  if (!name || name.trim().length === 0) return []

  const normalizedName = name.toLowerCase().trim()
  const nameTokens = normalizedName.split(/\s+/)

  // Build where clause
  const where: Record<string, unknown> = {}
  if (type) {
    where.type = type
  }

  // Fetch all entities that might match (name contains any token)
  const candidates = await db.graphEntity.findMany({
    where: {
      ...where,
      OR: nameTokens.map(token => ({
        name: { contains: token },
      })),
    },
    include: {
      sourceRelations: { select: { targetId: true, type: true } },
      targetRelations: { select: { sourceId: true, type: true } },
    },
  })

  const matches: IdentityMatch[] = []

  for (const candidate of candidates) {
    const matchFields: string[] = []
    let score = 0

    // Name similarity scoring
    const candidateNameLower = candidate.name.toLowerCase().trim()

    // Exact match
    if (candidateNameLower === normalizedName) {
      score += 0.6
      matchFields.push('name_exact')
    }
    // Contains match
    else if (candidateNameLower.includes(normalizedName) || normalizedName.includes(candidateNameLower)) {
      score += 0.4
      matchFields.push('name_contains')
    }
    // Token overlap
    else {
      const candidateTokens = candidateNameLower.split(/\s+/)
      const overlapTokens = nameTokens.filter(t => candidateTokens.includes(t))
      if (overlapTokens.length > 0) {
        const tokenScore = overlapTokens.length / Math.max(nameTokens.length, candidateTokens.length)
        score += tokenScore * 0.3
        matchFields.push('name_tokens')
      }
    }

    // Type match
    if (type && candidate.type === type) {
      score += 0.15
      matchFields.push('type')
    }

    // Property overlap scoring
    if (candidate.properties) {
      const props = safeParseJson(candidate.properties) as Record<string, unknown> | null
      if (props) {
        // Check if any property value matches the search name
        for (const [key, value] of Object.entries(props)) {
          if (typeof value === 'string' && value.toLowerCase().includes(normalizedName)) {
            score += 0.1
            matchFields.push(`property_${key}`)
            break
          }
          if (typeof value === 'string' && normalizedName.includes(value.toLowerCase())) {
            score += 0.05
            matchFields.push(`property_${key}_reverse`)
            break
          }
        }
      }
    }

    // Relation overlap scoring (shared connections)
    const candidateNeighborIds = new Set([
      ...candidate.sourceRelations.map(r => r.targetId),
      ...candidate.targetRelations.map(r => r.sourceId),
    ])

    // Score bonus for entities with many shared connections
    if (candidateNeighborIds.size > 0) {
      score += Math.min(candidateNeighborIds.size * 0.02, 0.1)
      if (candidateNeighborIds.size >= 3) {
        matchFields.push('high_connectivity')
      }
    }

    if (score >= threshold) {
      matches.push({
        entityId: candidate.id,
        entityType: candidate.type,
        entityName: candidate.name,
        matchScore: Math.min(score, 1),
        matchFields,
      })
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore)

  return matches.slice(0, 20)
}

// ─── Graph Versioning ─────────────────────────────────────────────────────

/**
 * Get the version history of a graph entity.
 * Uses DomainEvent records to reconstruct entity history.
 */
export async function getEntityHistory(
  entityId: string,
  options?: { limit?: number; from?: Date; to?: Date }
): Promise<Array<{
  version: number
  eventType: string
  timestamp: Date
  changes: Record<string, unknown>
  actor: string | null
}>> {
  const where: Record<string, unknown> = {
    aggregateId: entityId,
    aggregateType: 'GraphEntity',
  }

  if (options?.from) {
    where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), gte: options.from }
  }
  if (options?.to) {
    where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), lte: options.to }
  }

  const events = await db.domainEvent.findMany({
    where,
    orderBy: { version: 'asc' },
    take: options?.limit ?? 50,
  })

  return events.map(event => ({
    version: event.version,
    eventType: event.eventType,
    timestamp: event.createdAt,
    changes: safeParseJson(event.payload) as Record<string, unknown>,
    actor: event.actorId,
  }))
}

// ─── Cross-System Linking ─────────────────────────────────────────────────

/**
 * Link a graph entity to an external system record.
 * Creates a relation of type 'linked_to' with system metadata.
 */
export async function linkExternalSystem(
  entityId: string,
  externalSystem: string,
  externalId: string,
  metadata?: Record<string, unknown>
): Promise<{ relationId: string }> {
  // Create a graph entity representing the external system record
  const externalEntity = await db.graphEntity.create({
    data: {
      type: 'system',
      name: `${externalSystem}:${externalId}`,
      properties: JSON.stringify({
        externalSystem,
        externalId,
        linkedAt: new Date().toISOString(),
        ...metadata,
      }),
    },
  })

  // Create a relation from the source entity to the external entity
  const relation = await db.graphRelation.create({
    data: {
      type: 'linked_to',
      sourceId: entityId,
      targetId: externalEntity.id,
      weight: 1.0,
      properties: JSON.stringify({
        externalSystem,
        externalId,
        linkedAt: new Date().toISOString(),
        ...metadata,
      }),
    },
  })

  // Emit a domain event for the linking
  await db.domainEvent.create({
    data: {
      eventType: 'graph.entity.linked',
      aggregateId: entityId,
      aggregateType: 'GraphEntity',
      version: 1,
      payload: JSON.stringify({
        externalSystem,
        externalId,
        relationId: relation.id,
        externalEntityId: externalEntity.id,
      }),
      metadata: JSON.stringify({ action: 'link_external_system' }),
    },
  })

  return { relationId: relation.id }
}

// ─── Graph Query ──────────────────────────────────────────────────────────

/**
 * Execute a structured graph query.
 * Supports filtering by type, name pattern, and property values.
 */
export async function queryGraph(params: {
  nodeTypes?: string[]
  namePattern?: string
  properties?: Record<string, unknown>
  relationType?: string
  connectedTo?: string
  limit?: number
  offset?: number
}): Promise<{
  nodes: Array<{ id: string; type: string; name: string; properties: Record<string, unknown> | null }>
  total: number
}> {
  const limit = params.limit ?? 50
  const offset = params.offset ?? 0

  // Build the entity where clause
  const entityWhere: Record<string, unknown> = {}

  if (params.nodeTypes && params.nodeTypes.length > 0) {
    entityWhere.type = { in: params.nodeTypes }
  }

  if (params.namePattern) {
    entityWhere.name = { contains: params.namePattern }
  }

  // If connectedTo is specified, find entities connected to that entity
  if (params.connectedTo) {
    if (params.relationType) {
      entityWhere.OR = [
        { sourceRelations: { some: { targetId: params.connectedTo, type: params.relationType } } },
        { targetRelations: { some: { sourceId: params.connectedTo, type: params.relationType } } },
      ]
    } else {
      entityWhere.OR = [
        { sourceRelations: { some: { targetId: params.connectedTo } } },
        { targetRelations: { some: { sourceId: params.connectedTo } } },
      ]
    }
  }

  // If relationType is specified without connectedTo, find entities that have that relation type
  if (params.relationType && !params.connectedTo) {
    entityWhere.OR = [
      { sourceRelations: { some: { type: params.relationType } } },
      { targetRelations: { some: { type: params.relationType } } },
    ]
  }

  const [entities, total] = await Promise.all([
    db.graphEntity.findMany({
      where: entityWhere,
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
    }),
    db.graphEntity.count({ where: entityWhere }),
  ])

  // Post-filter by properties if specified (since Prisma can't query JSON fields in SQLite)
  let filteredEntities = entities
  if (params.properties && Object.keys(params.properties).length > 0) {
    filteredEntities = entities.filter(entity => {
      const entityProps = safeParseJson(entity.properties) as Record<string, unknown> | null
      if (!entityProps) return false

      return Object.entries(params.properties!).every(([key, value]) => {
        return entityProps[key] === value
      })
    })
  }

  return {
    nodes: filteredEntities.map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      properties: safeParseJson(e.properties),
    })),
    total: params.properties ? filteredEntities.length : total,
  }
}

// ─── Graph Freshness ──────────────────────────────────────────────────────

/**
 * Check the freshness of graph data.
 * Returns when each entity type was last updated.
 */
export async function getGraphFreshness(): Promise<Record<string, {
  count: number
  lastUpdated: Date | null
  oldestUpdate: Date | null
}>> {
  // Get all distinct types
  const entities = await db.graphEntity.findMany({
    select: { type: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  const freshness: Record<string, {
    count: number
    lastUpdated: Date | null
    oldestUpdate: Date | null
  }> = {}

  for (const entity of entities) {
    if (!freshness[entity.type]) {
      freshness[entity.type] = {
        count: 0,
        lastUpdated: null,
        oldestUpdate: null,
      }
    }

    freshness[entity.type].count++

    if (!freshness[entity.type].lastUpdated || entity.updatedAt > freshness[entity.type].lastUpdated!) {
      freshness[entity.type].lastUpdated = entity.updatedAt
    }

    if (!freshness[entity.type].oldestUpdate || entity.updatedAt < freshness[entity.type].oldestUpdate!) {
      freshness[entity.type].oldestUpdate = entity.updatedAt
    }
  }

  return freshness
}

// ─── Helper Functions ─────────────────────────────────────────────────────

function safeParseJson(jsonStr: string | null): Record<string, unknown> | null {
  if (!jsonStr) return null
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch {
    return null
  }
}

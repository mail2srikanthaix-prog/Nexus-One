/**
 * NEXUS ONE — Production Agent Operating System
 *
 * Provides a complete agent framework with tool definitions, memory management,
 * and workflow orchestration. Every tool is fully implemented with real Prisma
 * queries against the SQLite database.
 */

import { db } from '@/lib/db'

// ─── Agent Tool System ────────────────────────────────────────────────────

export interface AgentTool {
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
  execute: (params: Record<string, unknown>, context: AgentExecutionContext) => Promise<ToolResult>
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  metadata?: Record<string, unknown>
}

export interface AgentExecutionContext {
  agentId: string
  agentType: string
  tenantId?: string
  userId?: string
  conversationId?: string
  maxIterations?: number
}

// ─── Tool: Database Query ─────────────────────────────────────────────────

export const databaseQueryTool: AgentTool = {
  name: 'database_query',
  description:
    'Query the enterprise database for information about people, projects, tasks, events, decisions, memories, predictions, connectors',
  parameters: {
    entity_type: {
      type: 'string',
      description: 'Type of entity to query',
      required: true,
      enum: ['people', 'projects', 'tasks', 'events', 'decisions', 'memories', 'predictions', 'connectors'],
    },
    filter_field: { type: 'string', description: 'Field to filter by' },
    filter_value: { type: 'string', description: 'Value to filter by' },
    limit: { type: 'number', description: 'Max results to return' },
  },
  execute: async (params, _context) => {
    try {
      const entityType = params.entity_type as string
      const filterField = params.filter_field as string | undefined
      const filterValue = params.filter_value as string | undefined
      const limit = (params.limit as number) || 20

      let results: unknown[]

      switch (entityType) {
        case 'people': {
          const where: Record<string, unknown> = {}
          if (filterField && filterValue) {
            if (['status', 'department', 'role', 'name', 'email'].includes(filterField)) {
              where[filterField] = filterField === 'status' || filterField === 'department' || filterField === 'role'
                ? filterValue
                : { contains: filterValue }
            }
          }
          results = await db.person.findMany({
            where,
            take: limit,
            orderBy: { name: 'asc' },
            include: { team: { select: { name: true } } },
          })
          break
        }
        case 'projects': {
          const where: Record<string, unknown> = {}
          if (filterField && filterValue) {
            if (['status', 'name'].includes(filterField)) {
              where[filterField] = filterField === 'status' ? filterValue : { contains: filterValue }
            }
          }
          results = await db.project.findMany({
            where,
            take: limit,
            orderBy: { updatedAt: 'desc' },
            include: { team: { select: { name: true } } },
          })
          break
        }
        case 'tasks': {
          const where: Record<string, unknown> = {}
          if (filterField && filterValue) {
            if (['status', 'priority'].includes(filterField)) {
              where[filterField] = filterValue
            } else if (filterField === 'title') {
              where[filterField] = { contains: filterValue }
            } else if (filterField === 'assigneeId') {
              where[filterField] = filterValue
            }
          }
          results = await db.task.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              assignee: { select: { name: true } },
              project: { select: { name: true } },
            },
          })
          break
        }
        case 'events': {
          const where: Record<string, unknown> = {}
          if (filterField && filterValue) {
            if (['severity', 'type', 'source'].includes(filterField)) {
              where[filterField] = filterField === 'severity' || filterField === 'type' ? filterValue : { contains: filterValue }
            }
          }
          results = await db.event.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              person: { select: { name: true } },
              project: { select: { name: true } },
            },
          })
          break
        }
        case 'decisions': {
          const where: Record<string, unknown> = {}
          if (filterField && filterValue) {
            if (['status', 'impact'].includes(filterField)) {
              where[filterField] = filterValue
            } else if (filterField === 'title') {
              where[filterField] = { contains: filterValue }
            }
          }
          results = await db.decision.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              madeBy: { select: { name: true } },
              project: { select: { name: true } },
            },
          })
          break
        }
        case 'memories': {
          const where: Record<string, unknown> = {}
          if (filterField && filterValue) {
            if (['type'].includes(filterField)) {
              where[filterField] = filterValue
            } else if (filterField === 'title' || filterField === 'content') {
              where[filterField] = { contains: filterValue }
            }
          }
          results = await db.memory.findMany({
            where,
            take: limit,
            orderBy: { importance: 'desc' },
          })
          break
        }
        case 'predictions': {
          const where: Record<string, unknown> = {}
          if (filterField && filterValue) {
            if (['status', 'type', 'impact'].includes(filterField)) {
              where[filterField] = filterValue
            } else if (filterField === 'title') {
              where[filterField] = { contains: filterValue }
            }
          }
          results = await db.prediction.findMany({
            where,
            take: limit,
            orderBy: { probability: 'desc' },
          })
          break
        }
        case 'connectors': {
          const where: Record<string, unknown> = {}
          if (filterField && filterValue) {
            if (['status', 'type', 'category'].includes(filterField)) {
              where[filterField] = filterValue
            } else if (filterField === 'name') {
              where[filterField] = { contains: filterValue }
            }
          }
          results = await db.connector.findMany({
            where,
            take: limit,
            orderBy: { name: 'asc' },
          })
          break
        }
        default:
          return {
            success: false,
            error: `Unknown entity type: ${entityType}`,
            metadata: { validTypes: ['people', 'projects', 'tasks', 'events', 'decisions', 'memories', 'predictions', 'connectors'] },
          }
      }

      return {
        success: true,
        data: results,
        metadata: { entityType, count: results.length, limit },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database query failed',
      }
    }
  },
}

// ─── Tool: Graph Query ────────────────────────────────────────────────────

export const graphQueryTool: AgentTool = {
  name: 'graph_query',
  description: 'Query the knowledge graph for entity relationships and connections',
  parameters: {
    entity_id: { type: 'string', description: 'Entity ID to query', required: true },
    depth: { type: 'number', description: 'Traversal depth (1-3)' },
    relation_type: { type: 'string', description: 'Filter by relation type' },
  },
  execute: async (params, _context) => {
    try {
      const entityId = params.entity_id as string
      const depth = Math.min(Math.max((params.depth as number) || 1, 1), 3)
      const relationType = params.relation_type as string | undefined

      // Verify the entity exists
      const entity = await db.graphEntity.findUnique({
        where: { id: entityId },
      })
      if (!entity) {
        return { success: false, error: `Graph entity not found: ${entityId}` }
      }

      // BFS traversal collecting related entities and relations
      const visitedIds = new Set<string>()
      const collectedEntities: Awaited<ReturnType<typeof db.graphEntity.findUnique>>[] = []
      const collectedRelations: Awaited<ReturnType<typeof db.graphRelation.findMany>> = []
      let currentLevel = [entityId]

      for (let level = 0; level < depth; level++) {
        const nextLevel: string[] = []

        const whereClause = relationType
          ? {
              OR: [
                { sourceId: { in: currentLevel }, type: relationType },
                { targetId: { in: currentLevel }, type: relationType },
              ],
            }
          : {
              OR: [
                { sourceId: { in: currentLevel } },
                { targetId: { in: currentLevel } },
              ],
            }

        const relations = await db.graphRelation.findMany({ where: whereClause })

        for (const rel of relations) {
          if (!visitedIds.has(rel.id)) {
            collectedRelations.push(rel as Awaited<ReturnType<typeof db.graphRelation.findMany>>[number])
            visitedIds.add(rel.id)
          }
          if (!visitedIds.has(rel.sourceId) && !collectedEntities.some((e) => e?.id === rel.sourceId)) {
            nextLevel.push(rel.sourceId)
          }
          if (!visitedIds.has(rel.targetId) && !collectedEntities.some((e) => e?.id === rel.targetId)) {
            nextLevel.push(rel.targetId)
          }
        }

        if (nextLevel.length === 0) break

        // Fetch entities at the next level
        const nextEntities = await db.graphEntity.findMany({
          where: { id: { in: nextLevel } },
        })
        collectedEntities.push(...nextEntities)

        visitedIds.add(...currentLevel)
        currentLevel = nextLevel.filter((id) => !visitedIds.has(id))
      }

      // Include the root entity in results
      const allEntityIds = [
        entityId,
        ...collectedEntities.map((e) => e!.id),
        ...collectedRelations.flatMap((r) => [r.sourceId, r.targetId]),
      ]
      const uniqueEntityIds = [...new Set(allEntityIds)]

      const fullEntities = await db.graphEntity.findMany({
        where: { id: { in: uniqueEntityIds } },
      })

      return {
        success: true,
        data: {
          rootEntity: entity,
          entities: fullEntities,
          relations: collectedRelations,
          depth,
          totalEntities: fullEntities.length,
          totalRelations: collectedRelations.length,
        },
        metadata: { entityId, depth, relationType },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Graph query failed',
      }
    }
  },
}

// ─── Tool: Enterprise Search ──────────────────────────────────────────────

export const searchTool: AgentTool = {
  name: 'enterprise_search',
  description: 'Search across all enterprise data sources',
  parameters: {
    query: { type: 'string', description: 'Search query', required: true },
    entity_types: { type: 'string', description: 'Comma-separated entity types to search' },
    limit: { type: 'number', description: 'Max results' },
  },
  execute: async (params, _context) => {
    try {
      const query = (params.query as string).trim()
      if (!query) {
        return { success: false, error: 'Search query must not be empty' }
      }

      const entityTypesStr = params.entity_types as string | undefined
      const requestedTypes = entityTypesStr
        ? entityTypesStr.split(',').map((t) => t.trim()).filter(Boolean)
        : ['people', 'projects', 'tasks', 'events', 'decisions', 'memories', 'predictions']
      const limit = (params.limit as number) || 10

      const results: Record<string, unknown[]> = {}
      const containsQuery = { contains: query }

      if (requestedTypes.includes('people')) {
        results.people = await db.person.findMany({
          where: { OR: [{ name: containsQuery }, { email: containsQuery }, { role: containsQuery }, { department: containsQuery }] },
          take: limit,
        })
      }

      if (requestedTypes.includes('projects')) {
        results.projects = await db.project.findMany({
          where: { OR: [{ name: containsQuery }, { description: containsQuery }] },
          take: limit,
        })
      }

      if (requestedTypes.includes('tasks')) {
        results.tasks = await db.task.findMany({
          where: { OR: [{ title: containsQuery }, { description: containsQuery }] },
          take: limit,
        })
      }

      if (requestedTypes.includes('events')) {
        results.events = await db.event.findMany({
          where: { OR: [{ title: containsQuery }, { description: containsQuery }, { source: containsQuery }] },
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
      }

      if (requestedTypes.includes('decisions')) {
        results.decisions = await db.decision.findMany({
          where: { OR: [{ title: containsQuery }, { description: containsQuery }, { reasoning: containsQuery }] },
          take: limit,
        })
      }

      if (requestedTypes.includes('memories')) {
        results.memories = await db.memory.findMany({
          where: { OR: [{ title: containsQuery }, { content: containsQuery }, { tags: containsQuery }] },
          take: limit,
        })
      }

      if (requestedTypes.includes('predictions')) {
        results.predictions = await db.prediction.findMany({
          where: { OR: [{ title: containsQuery }, { description: containsQuery }] },
          take: limit,
        })
      }

      const totalResults = Object.values(results).reduce((acc, arr) => acc + arr.length, 0)

      return {
        success: true,
        data: { query, totalResults, results },
        metadata: { query, entityTypes: requestedTypes, limit },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      }
    }
  },
}

// ─── Tool: Create Event ──────────────────────────────────────────────────

export const createEventTool: AgentTool = {
  name: 'create_event',
  description: 'Create a new enterprise event',
  parameters: {
    type: { type: 'string', description: 'Event type', required: true },
    title: { type: 'string', description: 'Event title', required: true },
    severity: { type: 'string', description: 'Severity level', enum: ['info', 'warning', 'error', 'critical'] },
    description: { type: 'string', description: 'Event description' },
    personId: { type: 'string', description: 'Related person ID' },
    projectId: { type: 'string', description: 'Related project ID' },
  },
  execute: async (params, context) => {
    try {
      const type = params.type as string
      const title = params.title as string
      const severity = (params.severity as string) || 'info'
      const description = params.description as string | undefined
      const personId = params.personId as string | undefined
      const projectId = params.projectId as string | undefined

      if (!type || !title) {
        return { success: false, error: 'type and title are required' }
      }

      const validSeverities = ['info', 'warning', 'error', 'critical']
      if (!validSeverities.includes(severity)) {
        return { success: false, error: `severity must be one of: ${validSeverities.join(', ')}` }
      }

      const event = await db.event.create({
        data: {
          type,
          title,
          description,
          severity,
          source: `agent:${context.agentType}`,
          personId: personId || undefined,
          projectId: projectId || undefined,
          metadata: JSON.stringify({ agentId: context.agentId, agentType: context.agentType }),
        },
      })

      // Also emit a domain event
      await db.domainEvent.create({
        data: {
          eventType: `event.created.${type}`,
          aggregateId: event.id,
          aggregateType: 'Event',
          payload: JSON.stringify({ type, title, severity, description }),
          metadata: JSON.stringify({ agentId: context.agentId, agentType: context.agentType }),
          actorId: context.agentId,
          actorType: 'agent',
          tenantId: context.tenantId,
        },
      })

      return {
        success: true,
        data: event,
        metadata: { eventId: event.id, eventType: type, severity },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
      }
    }
  },
}

// ─── Tool: Task Management ───────────────────────────────────────────────

export const taskManagementTool: AgentTool = {
  name: 'task_management',
  description: 'Create, update, or query tasks',
  parameters: {
    action: {
      type: 'string',
      description: 'Action to perform',
      required: true,
      enum: ['create', 'update', 'list', 'assign'],
    },
    title: { type: 'string', description: 'Task title' },
    description: { type: 'string', description: 'Task description' },
    status: { type: 'string', description: 'New status', enum: ['todo', 'in-progress', 'blocked', 'review', 'done'] },
    priority: { type: 'string', description: 'Priority level', enum: ['low', 'medium', 'high', 'critical'] },
    assignee_id: { type: 'string', description: 'Person ID to assign' },
    project_id: { type: 'string', description: 'Project ID' },
    task_id: { type: 'string', description: 'Task ID (for update/assign)' },
    limit: { type: 'number', description: 'Max results for list' },
  },
  execute: async (params, context) => {
    try {
      const action = params.action as string

      switch (action) {
        case 'create': {
          const title = params.title as string
          if (!title) return { success: false, error: 'title is required for create' }

          const task = await db.task.create({
            data: {
              title,
              description: (params.description as string) || undefined,
              status: (params.status as string) || 'todo',
              priority: (params.priority as string) || 'medium',
              assigneeId: (params.assignee_id as string) || undefined,
              projectId: (params.project_id as string) || undefined,
            },
          })

          await db.domainEvent.create({
            data: {
              eventType: 'task.created',
              aggregateId: task.id,
              aggregateType: 'Task',
              payload: JSON.stringify({ title, status: task.status, priority: task.priority }),
              actorId: context.agentId,
              actorType: 'agent',
              tenantId: context.tenantId,
            },
          })

          return { success: true, data: task, metadata: { taskId: task.id } }
        }

        case 'update': {
          const taskId = params.task_id as string
          if (!taskId) return { success: false, error: 'task_id is required for update' }

          const existingTask = await db.task.findUnique({ where: { id: taskId } })
          if (!existingTask) return { success: false, error: `Task not found: ${taskId}` }

          const updateData: Record<string, unknown> = {}
          if (params.title) updateData.title = params.title
          if (params.description) updateData.description = params.description
          if (params.status) updateData.status = params.status
          if (params.priority) updateData.priority = params.priority
          if (params.project_id) updateData.projectId = params.project_id

          if (Object.keys(updateData).length === 0) {
            return { success: false, error: 'No fields to update' }
          }

          const updatedTask = await db.task.update({
            where: { id: taskId },
            data: updateData,
          })

          await db.domainEvent.create({
            data: {
              eventType: 'task.updated',
              aggregateId: taskId,
              aggregateType: 'Task',
              payload: JSON.stringify(updateData),
              metadata: JSON.stringify({ previousStatus: existingTask.status }),
              actorId: context.agentId,
              actorType: 'agent',
              tenantId: context.tenantId,
            },
          })

          return { success: true, data: updatedTask, metadata: { taskId } }
        }

        case 'assign': {
          const taskId = params.task_id as string
          const assigneeId = params.assignee_id as string
          if (!taskId || !assigneeId) {
            return { success: false, error: 'task_id and assignee_id are required for assign' }
          }

          const person = await db.person.findUnique({ where: { id: assigneeId } })
          if (!person) return { success: false, error: `Person not found: ${assigneeId}` }

          const task = await db.task.update({
            where: { id: taskId },
            data: { assigneeId },
          })

          await db.domainEvent.create({
            data: {
              eventType: 'task.assigned',
              aggregateId: taskId,
              aggregateType: 'Task',
              payload: JSON.stringify({ assigneeId, assigneeName: person.name }),
              actorId: context.agentId,
              actorType: 'agent',
              tenantId: context.tenantId,
            },
          })

          return { success: true, data: task, metadata: { taskId, assigneeId } }
        }

        case 'list': {
          const limit = (params.limit as number) || 20
          const where: Record<string, unknown> = {}
          if (params.status) where.status = params.status
          if (params.priority) where.priority = params.priority
          if (params.project_id) where.projectId = params.project_id
          if (params.assignee_id) where.assigneeId = params.assignee_id

          const tasks = await db.task.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              assignee: { select: { name: true } },
              project: { select: { name: true } },
            },
          })

          return {
            success: true,
            data: tasks,
            metadata: { count: tasks.length, filters: where },
          }
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Valid: create, update, list, assign` }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Task management failed',
      }
    }
  },
}

// ─── Tool: Memory Access ─────────────────────────────────────────────────

export const memoryTool: AgentTool = {
  name: 'memory_access',
  description: 'Store or retrieve organizational memories',
  parameters: {
    action: {
      type: 'string',
      description: 'Action',
      required: true,
      enum: ['store', 'retrieve', 'search'],
    },
    type: {
      type: 'string',
      description: 'Memory type',
      enum: ['strategic', 'episodic', 'procedural', 'operational', 'semantic'],
    },
    query: { type: 'string', description: 'Search query for retrieval' },
    title: { type: 'string', description: 'Title for storage' },
    content: { type: 'string', description: 'Content for storage' },
    importance: { type: 'number', description: 'Importance score (0-1) for storage' },
    tags: { type: 'string', description: 'Comma-separated tags for storage' },
    memory_id: { type: 'string', description: 'Memory ID for specific retrieval' },
    limit: { type: 'number', description: 'Max results for search' },
  },
  execute: async (params, context) => {
    try {
      const action = params.action as string

      switch (action) {
        case 'store': {
          const title = params.title as string
          const content = params.content as string
          if (!title || !content) {
            return { success: false, error: 'title and content are required for store' }
          }

          const memoryType = (params.type as string) || 'operational'
          const importance = (params.importance as number) || 0.5
          const tagsStr = params.tags as string | undefined

          const memory = await db.memory.create({
            data: {
              type: memoryType,
              title,
              content,
              source: `agent:${context.agentType}`,
              importance: Math.min(Math.max(importance, 0), 1),
              tags: tagsStr || undefined,
            },
          })

          // Also store in agent-specific memory
          await db.agentMemory.create({
            data: {
              agentId: context.agentId,
              type: memoryType === 'strategic' ? 'long_term' : memoryType === 'episodic' ? 'episodic' : memoryType === 'procedural' ? 'procedural' : 'short_term',
              content: `${title}: ${content}`,
              importance,
              category: memoryType,
            },
          })

          return {
            success: true,
            data: memory,
            metadata: { memoryId: memory.id, type: memoryType },
          }
        }

        case 'retrieve': {
          const memoryId = params.memory_id as string | undefined
          if (memoryId) {
            const memory = await db.memory.findUnique({ where: { id: memoryId } })
            if (!memory) return { success: false, error: `Memory not found: ${memoryId}` }
            return { success: true, data: memory, metadata: { memoryId } }
          }

          // Retrieve by type or general recent
          const memoryType = params.type as string | undefined
          const where: Record<string, unknown> = {}
          if (memoryType) where.type = memoryType

          const memories = await db.memory.findMany({
            where,
            orderBy: { importance: 'desc' },
            take: (params.limit as number) || 10,
          })

          return {
            success: true,
            data: memories,
            metadata: { count: memories.length, type: memoryType || 'all' },
          }
        }

        case 'search': {
          const query = params.query as string
          if (!query) return { success: false, error: 'query is required for search' }

          const containsQuery = { contains: query }
          const where = {
            OR: [
              { title: containsQuery },
              { content: containsQuery },
              { tags: containsQuery },
            ],
          }

          const memories = await db.memory.findMany({
            where,
            orderBy: { importance: 'desc' },
            take: (params.limit as number) || 10,
          })

          return {
            success: true,
            data: memories,
            metadata: { query, count: memories.length },
          }
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Valid: store, retrieve, search` }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Memory access failed',
      }
    }
  },
}

// ─── Tool Registry ────────────────────────────────────────────────────────

export const TOOL_REGISTRY: Record<string, AgentTool> = {
  database_query: databaseQueryTool,
  graph_query: graphQueryTool,
  enterprise_search: searchTool,
  create_event: createEventTool,
  task_management: taskManagementTool,
  memory_access: memoryTool,
}

// ─── Agent Tool Assignment ────────────────────────────────────────────────

export const AGENT_TOOLS: Record<string, string[]> = {
  ceo: ['database_query', 'graph_query', 'enterprise_search', 'create_event', 'memory_access'],
  cto: ['database_query', 'graph_query', 'enterprise_search', 'task_management', 'memory_access'],
  cfo: ['database_query', 'enterprise_search', 'create_event', 'memory_access'],
  coo: ['database_query', 'task_management', 'enterprise_search', 'create_event', 'memory_access'],
  cro: ['database_query', 'enterprise_search', 'create_event', 'memory_access'],
  security: ['database_query', 'graph_query', 'create_event', 'enterprise_search', 'memory_access'],
  hr: ['database_query', 'enterprise_search', 'memory_access', 'task_management'],
  knowledge: ['database_query', 'graph_query', 'enterprise_search', 'memory_access'],
  workflow: ['task_management', 'create_event', 'database_query', 'memory_access'],
  monitoring: ['database_query', 'create_event', 'enterprise_search', 'memory_access'],
}

// ─── Agent Execution Engine ───────────────────────────────────────────────

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  ceo: `You are the CEO Agent of NEXUS ONE. You provide strategic insights, executive briefings, and organizational direction. Use your tools to gather real data before making recommendations. Be decisive, strategic, and forward-thinking.`,
  cto: `You are the CTO Agent of NEXUS ONE. You focus on technology strategy, architecture decisions, and innovation. Use your tools to understand the tech landscape and provide technical guidance.`,
  cfo: `You are the CFO Agent of NEXUS ONE. You specialize in financial planning and budget optimization. Use your tools to access budget data and provide data-driven financial recommendations.`,
  coo: `You are the COO Agent of NEXUS ONE. You optimize operations and manage resources. Use your tools to monitor tasks, allocate resources, and improve process efficiency.`,
  cro: `You are the CRO Agent of NEXUS ONE. You focus on revenue optimization and customer intelligence. Use your tools to analyze revenue data and identify growth opportunities.`,
  security: `You are the Security Agent of NEXUS ONE. You monitor for threats and manage incident response. Use your tools to scan for vulnerabilities and track security events.`,
  hr: `You are the HR Agent of NEXUS ONE. You handle people operations and talent intelligence. Use your tools to access personnel data and provide people recommendations.`,
  knowledge: `You are the Knowledge Agent of NEXUS ONE. You are the enterprise search and knowledge management expert. Use your tools to find and synthesize information across all systems.`,
  workflow: `You are the Workflow Agent of NEXUS ONE. You automate processes and manage task orchestration. Use your tools to create, assign, and track tasks across the organization.`,
  monitoring: `You are the Monitoring Agent of NEXUS ONE. You detect anomalies and monitor system performance. Use your tools to check system health and create alerts.`,
}

interface ToolInvocation {
  name: string
  params: Record<string, unknown>
  result: ToolResult
}

/**
 * Execute an agent with its assigned tools.
 *
 * This function:
 * 1. Resolves the agent's available tools from the AGENT_TOOLS map
 * 2. Provides a structured prompt that includes tool descriptions
 * 3. Returns tool usage metadata for observability
 *
 * Note: The actual LLM call is done in the chat API route. This function
 * focuses on tool execution, context building, and result aggregation.
 */
export async function executeAgentWithTools(
  agentType: string,
  message: string,
  history: Array<{ role: string; content: string }>,
  context: AgentExecutionContext
): Promise<{
  response: string
  toolsUsed: ToolInvocation[]
  reasoningTrace: string[]
}> {
  const toolsUsed: ToolInvocation[] = []
  const reasoningTrace: string[] = []
  const availableTools = AGENT_TOOLS[agentType] || AGENT_TOOLS.ceo

  reasoningTrace.push(`Agent ${agentType} starting execution with tools: ${availableTools.join(', ')}`)

  // Build tool descriptions for the system prompt
  const toolDescriptions = availableTools
    .map((toolName) => {
      const tool = TOOL_REGISTRY[toolName]
      if (!tool) return null
      const params = Object.entries(tool.parameters)
        .map(([name, config]) => {
          const required = config.required ? ' (required)' : ''
          const enumValues = config.enum ? ` [${config.enum.join('|')}]` : ''
          return `    - ${name} (${config.type}${enumValues})${required}: ${config.description}`
        })
        .join('\n')
      return `- ${tool.name}: ${tool.description}\n  Parameters:\n${params}`
    })
    .filter(Boolean)
    .join('\n\n')

  // Detect if the message contains an explicit tool invocation pattern
  // Format: [tool_name: param1=value1, param2=value2]
  const toolInvocationRegex = /\[(\w+):\s*([^\]]+)\]/g
  let match: RegExpExecArray | null
  const invocations: Array<{ toolName: string; params: Record<string, unknown> }> = []

  while ((match = toolInvocationRegex.exec(message)) !== null) {
    const toolName = match[1]
    const paramsStr = match[2]
    const params: Record<string, unknown> = {}

    // Parse key=value pairs
    const paramPairs = paramsStr.split(',').map((s) => s.trim())
    for (const pair of paramPairs) {
      const eqIndex = pair.indexOf('=')
      if (eqIndex > 0) {
        const key = pair.substring(0, eqIndex).trim()
        const value = pair.substring(eqIndex + 1).trim()
        // Try to parse numbers
        const numValue = Number(value)
        params[key] = isNaN(numValue) ? value : numValue
      }
    }

    if (TOOL_REGISTRY[toolName] && availableTools.includes(toolName)) {
      invocations.push({ toolName, params })
    }
  }

  // Execute detected tool invocations
  for (const invocation of invocations) {
    reasoningTrace.push(`Executing tool: ${invocation.toolName} with params: ${JSON.stringify(invocation.params)}`)
    const tool = TOOL_REGISTRY[invocation.toolName]
    if (tool) {
      const result = await tool.execute(invocation.params, context)
      toolsUsed.push({
        name: invocation.toolName,
        params: invocation.params,
        result,
      })
      reasoningTrace.push(
        `Tool ${invocation.toolName} ${result.success ? 'succeeded' : 'failed'}: ${result.success ? JSON.stringify(result.data).substring(0, 200) : result.error}`
      )
    }
  }

  // If no explicit tool invocations, auto-execute contextually relevant tools
  if (invocations.length === 0) {
    reasoningTrace.push('No explicit tool invocations detected, auto-gathering context...')

    // Always gather basic context for the agent
    const contextPromises: Promise<void>[] = []

    // Auto-search for relevant information
    if (availableTools.includes('enterprise_search')) {
      contextPromises.push(
        searchTool
          .execute({ query: message, limit: 5 }, context)
          .then((result) => {
            toolsUsed.push({ name: 'enterprise_search', params: { query: message, limit: 5 }, result })
            reasoningTrace.push(`Auto-search completed with ${result.success ? 'success' : 'failure'}`)
          })
          .catch(() => {
            reasoningTrace.push('Auto-search failed')
          })
      )
    }

    await Promise.all(contextPromises)
  }

  // Build the enriched context for LLM consumption
  const toolResultsContext = toolsUsed
    .map((t) => {
      if (t.result.success && t.result.data) {
        const dataStr = JSON.stringify(t.result.data, null, 2)
        return `--- ${t.name} results ---\n${dataStr.substring(0, 2000)}${dataStr.length > 2000 ? '\n... (truncated)' : ''}`
      }
      return `--- ${t.name} error ---\n${t.result.error || 'Unknown error'}`
    })
    .join('\n\n')

  const systemPrompt = `${AGENT_SYSTEM_PROMPTS[agentType] || AGENT_SYSTEM_PROMPTS.ceo}

You have access to the following tools. Use them to gather real data before responding:

${toolDescriptions}

To invoke a tool in your message, use the format: [tool_name: param1=value1, param2=value2]

Current Tool Results:
${toolResultsContext || 'No tools executed yet.'}`

  reasoningTrace.push('Agent execution complete, returning enriched context for LLM')

  return {
    response: systemPrompt,
    toolsUsed,
    reasoningTrace,
  }
}

// ─── Helper: Get Agent's Available Tools ──────────────────────────────────

export function getAgentTools(agentType: string): AgentTool[] {
  const toolNames = AGENT_TOOLS[agentType] || []
  return toolNames.map((name) => TOOL_REGISTRY[name]).filter(Boolean) as AgentTool[]
}

// ─── Helper: Execute a Single Tool ────────────────────────────────────────

export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  context: AgentExecutionContext
): Promise<ToolResult> {
  const tool = TOOL_REGISTRY[toolName]
  if (!tool) {
    return { success: false, error: `Tool not found: ${toolName}` }
  }

  // Validate required parameters
  for (const [paramName, config] of Object.entries(tool.parameters)) {
    if (config.required && (params[paramName] === undefined || params[paramName] === null)) {
      return { success: false, error: `Missing required parameter: ${paramName}` }
    }
    if (config.enum && params[paramName] !== undefined && !config.enum.includes(params[paramName] as string)) {
      return {
        success: false,
        error: `Invalid value for ${paramName}: ${params[paramName]}. Must be one of: ${config.enum.join(', ')}`,
      }
    }
  }

  return tool.execute(params, context)
}

// ─── Agent Status Management ──────────────────────────────────────────────

export async function updateAgentStatus(
  agentId: string,
  status: string,
  lastAction?: string
): Promise<void> {
  await db.agent.update({
    where: { id: agentId },
    data: {
      status,
      lastAction: lastAction || undefined,
    },
  })
}

// ─── Agent Action Logging ─────────────────────────────────────────────────

export async function logAgentAction(
  agentId: string,
  type: string,
  title: string,
  details: {
    description?: string
    result?: string
    status?: string
    confidence?: number
    evidence?: string
  } = {}
): Promise<string> {
  const action = await db.agentAction.create({
    data: {
      agentId,
      type,
      title,
      description: details.description,
      result: details.result,
      status: details.status || 'completed',
      confidence: details.confidence,
      evidence: details.evidence,
    },
  })
  return action.id
}

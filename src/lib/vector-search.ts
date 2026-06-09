/**
 * Production Semantic Search Engine
 *
 * Provides semantic/vector search using z-ai-web-dev-sdk for embeddings,
 * with keyword fallback using TF-IDF-like scoring. Supports hybrid search
 * combining both approaches.
 */

import { db } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// ─── Vector Search Types ──────────────────────────────────────────────────

export interface SearchResult {
  id: string
  type: string
  title: string
  content: string
  score: number        // 0-1 relevance score
  highlights?: string[] // Matching text fragments
  metadata?: Record<string, unknown>
}

export interface VectorSearchOptions {
  limit?: number       // Max results (default: 10)
  minScore?: number    // Minimum relevance score (default: 0.3)
  entityTypes?: string[] // Filter by entity types
  hybridWeight?: number // Weight for keyword vs semantic (0=keyword, 1=semantic, 0.5=hybrid)
}

// ─── ZAI Singleton for Embeddings ─────────────────────────────────────────

let zaiInstance: InstanceType<typeof import('z-ai-web-dev-sdk').default> | null = null
let zaiInitPromise: Promise<InstanceType<typeof import('z-ai-web-dev-sdk').default>> | null = null

async function ensureConfig(): Promise<void> {
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
  ]
  for (const p of configPaths) {
    try {
      const content = await fs.readFile(p, 'utf-8')
      const config = JSON.parse(content)
      if (config.baseUrl && config.apiKey) return
    } catch {
      // file doesn't exist or is invalid, continue
    }
  }
  const baseUrl = process.env.ZAI_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
  const apiKey = process.env.ZAI_API_KEY || 'ollama'
  const chatId = process.env.ZAI_CHAT_ID || 'nexus-one-search'
  const userId = process.env.ZAI_USER_ID || 'nexus-user'
  const config = { baseUrl, apiKey, chatId, userId }
  const configPath = path.join(process.cwd(), '.z-ai-config')
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (err) {
    console.error('[VectorSearch] Failed to auto-create .z-ai-config:', err)
  }
}

async function getZAI(): Promise<InstanceType<typeof import('z-ai-web-dev-sdk').default>> {
  if (zaiInstance) return zaiInstance

  if (zaiInitPromise) return zaiInitPromise

  zaiInitPromise = (async () => {
    await ensureConfig()
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    zaiInstance = await ZAI.create()
    return zaiInstance
  })()

  try {
    return await zaiInitPromise
  } catch (error) {
    zaiInitPromise = null
    zaiInstance = null
    throw error
  }
}

// ─── Embedding Generation ─────────────────────────────────────────────────

/**
 * Generate embeddings using the z-ai-web-dev-sdk.
 * Falls back to keyword-based scoring if AI service is unavailable.
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const zai = await getZAI()
    const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text'
    const response = await zai.embeddings.create({
      model: embeddingModel,
      input: text.slice(0, 2000), // Truncate very long text
    })
    if (response.data && response.data.length > 0 && response.data[0].embedding) {
      return response.data[0].embedding
    }
    return null
  } catch (error) {
    console.warn('[VectorSearch] Embedding generation failed, will use keyword fallback:', error instanceof Error ? error.message : String(error))
    return null
  }
}

// ─── Cosine Similarity ───────────────────────────────────────────────────

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

// ─── TF-IDF Scoring ──────────────────────────────────────────────────────

/**
 * Simple TF-IDF-like keyword scoring.
 * Tokenizes both query and document, computes term frequency overlap.
 */
function computeKeywordScore(queryTokens: string[], docTokens: string[]): number {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0

  const docFreq = new Map<string, number>()
  for (const token of docTokens) {
    docFreq.set(token, (docFreq.get(token) ?? 0) + 1)
  }

  let score = 0
  const matchedTokens = new Set<string>()

  for (const qToken of queryTokens) {
    if (docFreq.has(qToken)) {
      // TF component: how many times the query token appears in the doc
      const tf = docFreq.get(qToken)! / docTokens.length
      // Boost for exact match
      score += tf * 2
      matchedTokens.add(qToken)
    } else {
      // Partial match: check if any doc token contains the query token or vice versa
      for (const dToken of docFreq.keys()) {
        if (dToken.includes(qToken) || qToken.includes(dToken)) {
          const tf = docFreq.get(dToken)! / docTokens.length
          score += tf * 0.5
          matchedTokens.add(dToken)
          break
        }
      }
    }
  }

  // Normalize by query length for coverage
  const coverage = matchedTokens.size / queryTokens.length
  return Math.min(score * coverage, 1)
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
}

// ─── Data Fetching for Search ─────────────────────────────────────────────

interface SearchableItem {
  id: string
  type: string
  title: string
  content: string
  embedding: string | null
  metadata: Record<string, unknown>
}

async function fetchSearchableItems(entityTypes?: string[]): Promise<SearchableItem[]> {
  const items: SearchableItem[] = []
  const types = entityTypes

  // Memories
  if (!types || types.includes('memory')) {
    const memories = await db.memory.findMany({ take: 200 })
    for (const m of memories) {
      items.push({
        id: m.id,
        type: 'memory',
        title: m.title,
        content: m.content,
        embedding: m.embedding,
        metadata: { source: m.source, importance: m.importance, tags: m.tags, type: m.type },
      })
    }
  }

  // Documents
  if (!types || types.includes('document')) {
    const documents = await db.document.findMany({ take: 200 })
    for (const d of documents) {
      items.push({
        id: d.id,
        type: 'document',
        title: d.title,
        content: d.content ?? '',
        embedding: d.embedding,
        metadata: { type: d.type, authorId: d.authorId },
      })
    }
  }

  // Agent Memories
  if (!types || types.includes('agentMemory')) {
    const agentMemories = await db.agentMemory.findMany({ take: 200 })
    for (const am of agentMemories) {
      items.push({
        id: am.id,
        type: 'agentMemory',
        title: `[Agent Memory] ${am.type}`,
        content: am.content,
        embedding: am.embedding,
        metadata: { agentId: am.agentId, category: am.category, importance: am.importance },
      })
    }
  }

  // Events
  if (!types || types.includes('event')) {
    const events = await db.event.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
    for (const e of events) {
      items.push({
        id: e.id,
        type: 'event',
        title: e.title,
        content: [e.title, e.description, e.source].filter(Boolean).join(' '),
        embedding: null,
        metadata: { type: e.type, severity: e.severity, source: e.source },
      })
    }
  }

  // Decisions
  if (!types || types.includes('decision')) {
    const decisions = await db.decision.findMany({ take: 200 })
    for (const d of decisions) {
      items.push({
        id: d.id,
        type: 'decision',
        title: d.title,
        content: [d.title, d.description, d.reasoning].filter(Boolean).join(' '),
        embedding: null,
        metadata: { status: d.status, impact: d.impact, confidence: d.confidence },
      })
    }
  }

  // Predictions
  if (!types || types.includes('prediction')) {
    const predictions = await db.prediction.findMany({ take: 200 })
    for (const p of predictions) {
      items.push({
        id: p.id,
        type: 'prediction',
        title: p.title,
        content: [p.title, p.description, p.evidence].filter(Boolean).join(' '),
        embedding: null,
        metadata: { type: p.type, probability: p.probability, impact: p.impact, status: p.status },
      })
    }
  }

  // Tasks
  if (!types || types.includes('task')) {
    const tasks = await db.task.findMany({ take: 200 })
    for (const t of tasks) {
      items.push({
        id: t.id,
        type: 'task',
        title: t.title,
        content: [t.title, t.description].filter(Boolean).join(' '),
        embedding: null,
        metadata: { status: t.status, priority: t.priority, assigneeId: t.assigneeId, projectId: t.projectId },
      })
    }
  }

  // People
  if (!types || types.includes('person')) {
    const people = await db.person.findMany({ take: 200 })
    for (const p of people) {
      items.push({
        id: p.id,
        type: 'person',
        title: p.name,
        content: [p.name, p.email, p.role, p.department].filter(Boolean).join(' '),
        embedding: null,
        metadata: { email: p.email, role: p.role, department: p.department, status: p.status },
      })
    }
  }

  // Projects
  if (!types || types.includes('project')) {
    const projects = await db.project.findMany({ take: 200 })
    for (const p of projects) {
      items.push({
        id: p.id,
        type: 'project',
        title: p.name,
        content: [p.name, p.description].filter(Boolean).join(' '),
        embedding: null,
        metadata: { status: p.status, health: p.health, progress: p.progress, riskScore: p.riskScore },
      })
    }
  }

  // Graph Entities
  if (!types || types.includes('graphEntity')) {
    const graphEntities = await db.graphEntity.findMany({ take: 200 })
    for (const g of graphEntities) {
      const props = g.properties ? safeParseJson(g.properties) : null
      const propContent = props ? Object.values(props).join(' ') : ''
      items.push({
        id: g.id,
        type: 'graphEntity',
        title: g.name,
        content: [g.name, g.type, propContent].filter(Boolean).join(' '),
        embedding: g.embedding,
        metadata: { entityType: g.type, properties: props },
      })
    }
  }

  return items
}

// ─── Search Functions ─────────────────────────────────────────────────────

/**
 * Perform semantic search across all enterprise data.
 * Combines keyword matching with semantic similarity.
 */
export async function semanticSearch(
  query: string,
  options: VectorSearchOptions = {}
): Promise<{
  results: SearchResult[]
  totalResults: number
  searchTimeMs: number
  query: string
  method: 'semantic' | 'keyword' | 'hybrid'
}> {
  const startTime = Date.now()
  const limit = options.limit ?? 10
  const minScore = options.minScore ?? 0.3
  const hybridWeight = options.hybridWeight ?? 0.7 // Default: lean toward semantic

  const items = await fetchSearchableItems(options.entityTypes)
  const queryTokens = tokenize(query)

  // Try to generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)
  const hasEmbedding = queryEmbedding !== null

  // Determine search method
  let method: 'semantic' | 'keyword' | 'hybrid'
  if (hasEmbedding && hybridWeight > 0 && hybridWeight < 1) {
    method = 'hybrid'
  } else if (hasEmbedding && hybridWeight >= 1) {
    method = 'semantic'
  } else {
    method = 'keyword'
  }

  const scoredResults: SearchResult[] = []

  for (const item of items) {
    let keywordScore = 0
    let semanticScore = 0

    // Keyword scoring
    const docTokens = tokenize(item.content)
    keywordScore = computeKeywordScore(queryTokens, docTokens)

    // Also boost by title match
    const titleTokens = tokenize(item.title)
    const titleScore = computeKeywordScore(queryTokens, titleTokens)
    keywordScore = Math.max(keywordScore, keywordScore * 0.6 + titleScore * 0.4)

    // Semantic scoring (if we have embeddings)
    if (hasEmbedding && item.embedding) {
      try {
        const itemEmbedding = JSON.parse(item.embedding) as number[]
        if (Array.isArray(itemEmbedding) && itemEmbedding.length > 0) {
          semanticScore = cosineSimilarity(queryEmbedding!, itemEmbedding)
        }
      } catch {
        // Invalid embedding data, skip semantic scoring
      }
    }

    // Combine scores based on method
    let finalScore: number
    if (method === 'semantic') {
      finalScore = semanticScore > 0 ? semanticScore : keywordScore * 0.5
    } else if (method === 'hybrid') {
      // If no semantic score available, use keyword score with a penalty
      if (semanticScore > 0) {
        finalScore = keywordScore * (1 - hybridWeight) + semanticScore * hybridWeight
      } else {
        finalScore = keywordScore * 0.7 // Reduce keyword score slightly when semantic was expected
      }
    } else {
      finalScore = keywordScore
    }

    if (finalScore >= minScore) {
      // Generate highlights
      const highlights = generateHighlights(queryTokens, item.content)

      scoredResults.push({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content.slice(0, 500),
        score: Math.round(finalScore * 1000) / 1000,
        highlights: highlights.length > 0 ? highlights : undefined,
        metadata: item.metadata,
      })
    }
  }

  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score)

  return {
    results: scoredResults.slice(0, limit),
    totalResults: scoredResults.length,
    searchTimeMs: Date.now() - startTime,
    query,
    method,
  }
}

/**
 * Perform keyword-based search using Prisma contains queries.
 * Used as fallback when AI service is unavailable.
 */
export async function keywordSearch(
  query: string,
  options: VectorSearchOptions = {}
): Promise<{
  results: SearchResult[]
  totalResults: number
  searchTimeMs: number
}> {
  const startTime = Date.now()
  const limit = options.limit ?? 10
  const minScore = options.minScore ?? 0.3
  const entityTypes = options.entityTypes

  const items = await fetchSearchableItems(entityTypes)
  const queryTokens = tokenize(query)

  const scoredResults: SearchResult[] = []

  for (const item of items) {
    const docTokens = tokenize(item.content)
    const keywordScore = computeKeywordScore(queryTokens, docTokens)

    const titleTokens = tokenize(item.title)
    const titleScore = computeKeywordScore(queryTokens, titleTokens)
    const finalScore = Math.max(keywordScore, keywordScore * 0.6 + titleScore * 0.4)

    if (finalScore >= minScore) {
      const highlights = generateHighlights(queryTokens, item.content)

      scoredResults.push({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content.slice(0, 500),
        score: Math.round(finalScore * 1000) / 1000,
        highlights: highlights.length > 0 ? highlights : undefined,
        metadata: item.metadata,
      })
    }
  }

  scoredResults.sort((a, b) => b.score - a.score)

  return {
    results: scoredResults.slice(0, limit),
    totalResults: scoredResults.length,
    searchTimeMs: Date.now() - startTime,
  }
}

/**
 * Find similar entities to a given entity.
 * Uses both property matching and graph relationships.
 */
export async function findSimilar(
  entityId: string,
  entityType: string,
  limit: number = 10
): Promise<SearchResult[]> {
  // Fetch the source entity based on type
  let sourceItem: SearchableItem | null = null

  if (entityType === 'memory') {
    const memory = await db.memory.findUnique({ where: { id: entityId } })
    if (memory) {
      sourceItem = {
        id: memory.id, type: 'memory', title: memory.title,
        content: memory.content, embedding: memory.embedding,
        metadata: { source: memory.source, importance: memory.importance },
      }
    }
  } else if (entityType === 'document') {
    const doc = await db.document.findUnique({ where: { id: entityId } })
    if (doc) {
      sourceItem = {
        id: doc.id, type: 'document', title: doc.title,
        content: doc.content ?? '', embedding: doc.embedding,
        metadata: { type: doc.type },
      }
    }
  } else if (entityType === 'agentMemory') {
    const am = await db.agentMemory.findUnique({ where: { id: entityId } })
    if (am) {
      sourceItem = {
        id: am.id, type: 'agentMemory', title: `[Agent Memory] ${am.type}`,
        content: am.content, embedding: am.embedding,
        metadata: { agentId: am.agentId, category: am.category },
      }
    }
  } else if (entityType === 'graphEntity') {
    const ge = await db.graphEntity.findUnique({ where: { id: entityId } })
    if (ge) {
      sourceItem = {
        id: ge.id, type: 'graphEntity', title: ge.name,
        content: ge.name, embedding: ge.embedding,
        metadata: { entityType: ge.type },
      }
    }
  } else if (entityType === 'person') {
    const person = await db.person.findUnique({ where: { id: entityId } })
    if (person) {
      sourceItem = {
        id: person.id, type: 'person', title: person.name,
        content: [person.name, person.email, person.role, person.department].filter(Boolean).join(' '),
        embedding: null,
        metadata: { email: person.email, role: person.role, department: person.department },
      }
    }
  } else if (entityType === 'project') {
    const project = await db.project.findUnique({ where: { id: entityId } })
    if (project) {
      sourceItem = {
        id: project.id, type: 'project', title: project.name,
        content: [project.name, project.description].filter(Boolean).join(' '),
        embedding: null,
        metadata: { status: project.status, health: project.health },
      }
    }
  }

  if (!sourceItem) return []

  // Fetch all items of the same type for comparison
  const allItems = await fetchSearchableItems([entityType])

  // Also fetch graph neighbors for relationship-based similarity
  let graphNeighborIds = new Set<string>()
  if (entityType === 'graphEntity') {
    const relations = await db.graphRelation.findMany({
      where: {
        OR: [{ sourceId: entityId }, { targetId: entityId }],
      },
    })
    graphNeighborIds = new Set(
      relations.map(r => r.sourceId === entityId ? r.targetId : r.sourceId)
    )
  }

  const sourceTokens = tokenize(sourceItem.content)
  const sourceEmbedding = sourceItem.embedding
    ? safeParseEmbedding(sourceItem.embedding)
    : null

  const results: SearchResult[] = []

  for (const item of allItems) {
    if (item.id === entityId) continue // Skip self

    let score = 0

    // Content similarity (keyword-based)
    const itemTokens = tokenize(item.content)
    const keywordScore = computeKeywordScore(sourceTokens, itemTokens)
    score += keywordScore * 0.4

    // Embedding similarity
    if (sourceEmbedding && item.embedding) {
      const itemEmbedding = safeParseEmbedding(item.embedding)
      if (itemEmbedding) {
        const semanticScore = cosineSimilarity(sourceEmbedding, itemEmbedding)
        score += semanticScore * 0.5
      }
    }

    // Graph relationship bonus
    if (graphNeighborIds.has(item.id)) {
      score += 0.3
    }

    // Property overlap bonus
    const sourceMeta = sourceItem.metadata
    const itemMeta = item.metadata
    if (sourceMeta && itemMeta) {
      const commonKeys = Object.keys(sourceMeta).filter(k => k in itemMeta)
      let matchCount = 0
      for (const key of commonKeys) {
        if (sourceMeta[key] === itemMeta[key]) matchCount++
      }
      if (commonKeys.length > 0) {
        score += (matchCount / commonKeys.length) * 0.1
      }
    }

    if (score > 0.1) {
      results.push({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content.slice(0, 500),
        score: Math.round(Math.min(score, 1) * 1000) / 1000,
        metadata: item.metadata,
      })
    }
  }

  results.sort((a, b) => b.score - a.score)

  return results.slice(0, limit)
}

// ─── Embedding Storage ────────────────────────────────────────────────────

/**
 * Store an embedding vector for an entity.
 * Stores as JSON string in the entity's embedding field.
 */
export async function storeEmbedding(
  entityType: string,  // 'memory', 'document', 'agentMemory', 'graphEntity', etc.
  entityId: string,
  embedding: number[]
): Promise<void> {
  const embeddingJson = JSON.stringify(embedding)

  switch (entityType) {
    case 'memory':
      await db.memory.update({ where: { id: entityId }, data: { embedding: embeddingJson } })
      break
    case 'document':
      await db.document.update({ where: { id: entityId }, data: { embedding: embeddingJson } })
      break
    case 'agentMemory':
      await db.agentMemory.update({ where: { id: entityId }, data: { embedding: embeddingJson } })
      break
    case 'graphEntity':
      await db.graphEntity.update({ where: { id: entityId }, data: { embedding: embeddingJson } })
      break
    default:
      throw new Error(`Unsupported entity type for embedding storage: ${entityType}`)
  }
}

// ─── Re-Index ─────────────────────────────────────────────────────────────

/**
 * Re-index all entities, generating and storing embeddings.
 * Called after bulk data changes.
 */
export async function reindexAll(options?: {
  entityTypes?: string[]
  batchSize?: number
  onProgress?: (processed: number, total: number) => void
}): Promise<{
  processed: number
  failed: number
  total: number
}> {
  const batchSize = options?.batchSize ?? 10
  const entityTypes = options?.entityTypes ?? ['memory', 'document', 'agentMemory', 'graphEntity']
  let processed = 0
  let failed = 0
  let total = 0

  // Count total items to index
  for (const type of entityTypes) {
    const count = await countEntities(type)
    total += count
  }

  // Process each entity type
  for (const type of entityTypes) {
    const items = await fetchEntitiesForIndexing(type)

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)

      for (const item of batch) {
        try {
          const text = [item.title, item.content].filter(Boolean).join(' ')
          if (text.trim().length === 0) {
            failed++
            continue
          }

          const embedding = await generateEmbedding(text)
          if (embedding) {
            await storeEmbedding(type, item.id, embedding)
            processed++
          } else {
            // AI service unavailable, count as failed
            failed++
          }
        } catch (error) {
          console.error(`[VectorSearch] Failed to index ${type}/${item.id}:`, error)
          failed++
        }

        options?.onProgress?.(processed + failed, total)
      }

      // Small delay between batches to avoid overwhelming the AI service
      if (items.length > batchSize) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  return { processed, failed, total }
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

function safeParseEmbedding(embeddingStr: string | null): number[] | null {
  if (!embeddingStr) return null
  try {
    const parsed = JSON.parse(embeddingStr)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function generateHighlights(queryTokens: string[], content: string): string[] {
  if (queryTokens.length === 0 || !content) return []

  const highlights: string[] = []
  const contentLower = content.toLowerCase()
  const maxHighlights = 3
  const contextChars = 50

  for (const token of queryTokens) {
    if (highlights.length >= maxHighlights) break

    const idx = contentLower.indexOf(token)
    if (idx !== -1) {
      const start = Math.max(0, idx - contextChars)
      const end = Math.min(content.length, idx + token.length + contextChars)
      let snippet = content.slice(start, end)
      if (start > 0) snippet = '...' + snippet
      if (end < content.length) snippet = snippet + '...'
      highlights.push(snippet)
    }
  }

  return highlights
}

async function countEntities(type: string): Promise<number> {
  switch (type) {
    case 'memory':
      return db.memory.count()
    case 'document':
      return db.document.count()
    case 'agentMemory':
      return db.agentMemory.count()
    case 'graphEntity':
      return db.graphEntity.count()
    default:
      return 0
  }
}

interface IndexableItem {
  id: string
  title: string
  content: string
}

async function fetchEntitiesForIndexing(type: string): Promise<IndexableItem[]> {
  switch (type) {
    case 'memory': {
      const items = await db.memory.findMany({ select: { id: true, title: true, content: true } })
      return items
    }
    case 'document': {
      const items = await db.document.findMany({ select: { id: true, title: true, content: true } })
      return items.map(i => ({ id: i.id, title: i.title, content: i.content ?? '' }))
    }
    case 'agentMemory': {
      const items = await db.agentMemory.findMany({ select: { id: true, type: true, content: true } })
      return items.map(i => ({ id: i.id, title: `[Agent Memory] ${i.type}`, content: i.content }))
    }
    case 'graphEntity': {
      const items = await db.graphEntity.findMany({ select: { id: true, name: true, properties: true } })
      return items.map(i => ({
        id: i.id,
        title: i.name,
        content: i.name + ' ' + (i.properties ? Object.values(safeParseJson(i.properties) ?? {}).join(' ') : ''),
      }))
    }
    default:
      return []
  }
}

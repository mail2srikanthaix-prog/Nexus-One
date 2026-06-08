import { db } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════════════════
// Closed Loop Learning Engine
// Observe → Reason → Act → Improve
// ═══════════════════════════════════════════════════════════════════════════

// ─── Observation ──────────────────────────────────────────────────────────

export interface Observation {
  entityType: string   // 'prediction', 'agent_response', 'recommendation', 'workflow'
  entityId: string
  observedOutcome: string
  observedAt: Date
  metadata?: Record<string, unknown>
}

/** In-memory store for recent observations (not persisted to a dedicated table,
 *  but recorded as DomainEvents so they can be replayed and audited). */
const recentObservations: Observation[] = []
const MAX_RECENT_OBSERVATIONS = 10_000

/**
 * Record an observation about an entity's outcome.
 * This is the "Observation" step in the closed loop.
 * Observations are stored both in-memory (for fast reasoning) and as domain
 * events (for audit trail and replay).
 */
export async function recordObservation(observation: Observation): Promise<void> {
  // Keep in-memory ring buffer
  recentObservations.push(observation)
  if (recentObservations.length > MAX_RECENT_OBSERVATIONS) {
    recentObservations.splice(0, recentObservations.length - MAX_RECENT_OBSERVATIONS)
  }

  // Persist as a domain event for audit / replay
  await db.domainEvent.create({
    data: {
      eventType: 'observation.recorded',
      aggregateId: observation.entityId,
      aggregateType: observation.entityType,
      payload: JSON.stringify({
        observedOutcome: observation.observedOutcome,
        observedAt: observation.observedAt.toISOString(),
        metadata: observation.metadata ?? {},
      }),
      actorType: 'learning_engine',
    },
  })
}

// ─── Reasoning ────────────────────────────────────────────────────────────

export interface ReasoningResult {
  entityType: string
  entityId: string
  accuracy: number      // 0-1, how accurate was the original prediction
  deviation: number     // How far off from expected
  rootCause?: string
  lessonsLearned: string[]
  suggestedAdjustments: Record<string, unknown>
}

/**
 * Determine the original prediction / confidence for an entity so we can
 * compare it against observed outcomes.
 */
async function getEntityBaseline(
  entityType: string,
  entityId: string,
): Promise<{ confidence: number; status: string; metadata: Record<string, unknown> } | null> {
  switch (entityType) {
    case 'prediction': {
      const pred = await db.prediction.findUnique({ where: { id: entityId } })
      if (!pred) return null
      return {
        confidence: pred.probability,
        status: pred.status,
        metadata: {
          type: pred.type,
          impact: pred.impact,
          timeframe: pred.timeframe,
          evidence: pred.evidence,
        },
      }
    }
    case 'agent_response':
    case 'agent': {
      const action = await db.agentAction.findUnique({ where: { id: entityId } })
      if (!action) return null
      return {
        confidence: action.confidence ?? 0.5,
        status: action.status,
        metadata: {
          type: action.type,
          result: action.result,
          evidence: action.evidence,
        },
      }
    }
    case 'workflow': {
      const wf = await db.agentWorkflow.findUnique({ where: { id: entityId } })
      if (!wf) return null
      return {
        confidence: 0.5,
        status: wf.status,
        metadata: {
          type: wf.type,
          result: wf.result,
          error: wf.error,
        },
      }
    }
    case 'connector': {
      const sync = await db.connectorSync.findUnique({ where: { id: entityId } })
      if (!sync) return null
      return {
        confidence: 0.5,
        status: sync.status,
        metadata: {
          recordsSynced: sync.recordsSynced,
          recordsFailed: sync.recordsFailed,
          error: sync.error,
        },
      }
    }
    default:
      return null
  }
}

/**
 * Analyze observations to determine accuracy and derive lessons.
 * This is the "Reasoning" step in the closed loop.
 */
export async function analyzeOutcome(
  entityType: string,
  entityId: string,
): Promise<ReasoningResult | null> {
  // Gather observations for this entity
  const observations = recentObservations.filter(
    (o) => o.entityType === entityType && o.entityId === entityId,
  )

  // Also check domain events for historical observations
  const domainEvents = await db.domainEvent.findMany({
    where: {
      eventType: 'observation.recorded',
      aggregateId: entityId,
      aggregateType: entityType,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Parse historical observations from domain events
  const historicalOutcomes: string[] = []
  for (const de of domainEvents) {
    try {
      const payload = JSON.parse(de.payload) as { observedOutcome?: string }
      if (payload.observedOutcome) {
        historicalOutcomes.push(payload.observedOutcome)
      }
    } catch {
      // skip malformed
    }
  }

  if (observations.length === 0 && historicalOutcomes.length === 0) {
    return null
  }

  // Get the entity's baseline (original prediction / confidence)
  const baseline = await getEntityBaseline(entityType, entityId)

  // Get quality scores for additional context
  const qualityScores = await db.qualityScore.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Get feedback for this entity
  const feedback = await db.feedback.findMany({
    where: { targetType: entityType, targetId: entityId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // ── Compute accuracy ─────────────────────────────────────────────────
  let accuracy = baseline?.confidence ?? 0.5
  let deviation = 0

  if (baseline) {
    // Positive outcomes increase accuracy, negative decrease it
    const allOutcomes = [
      ...observations.map((o) => o.observedOutcome),
      ...historicalOutcomes,
    ]

    let positiveCount = 0
    let negativeCount = 0

    for (const outcome of allOutcomes) {
      const lower = outcome.toLowerCase()
      if (
        lower.includes('success') ||
        lower.includes('accurate') ||
        lower.includes('correct') ||
        lower.includes('positive') ||
        lower.includes('completed') ||
        lower.includes('resolved')
      ) {
        positiveCount++
      } else if (
        lower.includes('fail') ||
        lower.includes('error') ||
        lower.includes('incorrect') ||
        lower.includes('negative') ||
        lower.includes('timeout') ||
        lower.includes('rejected')
      ) {
        negativeCount++
      }
    }

    const total = positiveCount + negativeCount
    if (total > 0) {
      const observedAccuracy = positiveCount / total
      deviation = Math.abs(observedAccuracy - baseline.confidence)
      // Weighted blend: more observations → more weight on observed
      const observationWeight = Math.min(total / 10, 0.8)
      accuracy = observedAccuracy * observationWeight + baseline.confidence * (1 - observationWeight)
    }
  }

  // Factor in feedback ratings
  if (feedback.length > 0) {
    const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    const ratingNormalized = (avgRating - 1) / 4 // Normalize 1-5 to 0-1
    const feedbackWeight = Math.min(feedback.length / 20, 0.5)
    accuracy = accuracy * (1 - feedbackWeight) + ratingNormalized * feedbackWeight
  }

  // Factor in quality scores
  if (qualityScores.length > 0) {
    const avgQuality = qualityScores.reduce((sum, qs) => sum + qs.score, 0) / qualityScores.length
    const qualityWeight = 0.2
    accuracy = accuracy * (1 - qualityWeight) + avgQuality * qualityWeight
  }

  accuracy = Math.max(0, Math.min(1, accuracy))

  // ── Derive lessons ───────────────────────────────────────────────────
  const lessonsLearned: string[] = []
  const suggestedAdjustments: Record<string, unknown> = {}

  if (accuracy < 0.3) {
    lessonsLearned.push(`${entityType} ${entityId} has very low accuracy (${(accuracy * 100).toFixed(1)}%). Consider decommissioning or major revision.`)
    suggestedAdjustments.recommendation = 'decommission'
  } else if (accuracy < 0.5) {
    lessonsLearned.push(`${entityType} ${entityId} is underperforming (${(accuracy * 100).toFixed(1)}%). Review and improve.`)
    suggestedAdjustments.recommendation = 'improve'
  } else if (accuracy < 0.7) {
    lessonsLearned.push(`${entityType} ${entityId} has moderate accuracy (${(accuracy * 100).toFixed(1)}%). Minor adjustments recommended.`)
    suggestedAdjustments.recommendation = 'review'
  } else {
    lessonsLearned.push(`${entityType} ${entityId} is performing well (${(accuracy * 100).toFixed(1)}%). Continue current approach.`)
    suggestedAdjustments.recommendation = 'continue'
  }

  // Root cause analysis
  let rootCause: string | undefined
  if (baseline?.status === 'error' || baseline?.status === 'failed') {
    rootCause = 'Entity is in an error/failed state'
    lessonsLearned.push('Error state detected — check error details and resolve before further evaluation')
    suggestedAdjustments.statusReset = true
  }

  if (deviation > 0.3) {
    rootCause = (rootCause ? rootCause + '; ' : '') + 'Large deviation between predicted and observed outcomes'
    lessonsLearned.push(`Deviation of ${(deviation * 100).toFixed(1)}% suggests the prediction model needs recalibration`)
    suggestedAdjustments.recalibrate = true
  }

  // Check for common negative patterns in feedback comments
  const negativeFeedback = feedback.filter((f) => f.rating <= 2)
  if (negativeFeedback.length >= 3) {
    const commonWords = extractCommonWords(negativeFeedback.map((f) => f.comment).filter(Boolean) as string[])
    if (commonWords.length > 0) {
      rootCause = (rootCause ? rootCause + '; ' : '') + `Recurring issues: ${commonWords.join(', ')}`
      lessonsLearned.push(`Common complaints mention: ${commonWords.join(', ')}`)
      suggestedAdjustments.focusAreas = commonWords
    }
  }

  // Quality score trends
  if (qualityScores.length >= 2) {
    const recent = qualityScores[0].score
    const previous = qualityScores[qualityScores.length - 1].score
    const trend = recent - previous
    if (trend < -0.1) {
      lessonsLearned.push(`Quality score declining (trend: ${(trend * 100).toFixed(1)}%). Investigate recent changes.`)
      suggestedAdjustments.investigateDecline = true
    } else if (trend > 0.1) {
      lessonsLearned.push(`Quality score improving (trend: +${(trend * 100).toFixed(1)}%). Recent changes are positive.`)
    }
  }

  return {
    entityType,
    entityId,
    accuracy,
    deviation,
    rootCause,
    lessonsLearned,
    suggestedAdjustments,
  }
}

/**
 * Simple keyword extraction from text — finds the most common meaningful words.
 */
function extractCommonWords(texts: string[], topN = 5): string[] {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or',
    'if', 'while', 'about', 'up', 'it', 'its', 'this', 'that', 'these',
    'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him',
    'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which', 'who',
  ])

  const wordCounts = new Map<string, number>()
  for (const text of texts) {
    const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
    }
  }

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word)
}

// ─── Action ───────────────────────────────────────────────────────────────

/** In-memory store for applied adjustments (so we can track what was applied). */
const appliedAdjustments = new Map<string, { adjustments: Record<string, unknown>; appliedAt: Date }>()

/**
 * Apply learned adjustments to improve future predictions/decisions.
 * This is the "Action" step in the closed loop.
 */
export async function applyLearnings(
  entityType: string,
  adjustments: Record<string, unknown>,
): Promise<{ applied: boolean; details: string }> {
  const key = `${entityType}:${Date.now()}`

  // Store the adjustments for tracking
  appliedAdjustments.set(key, { adjustments, appliedAt: new Date() })

  // Record this as a domain event for audit
  await db.domainEvent.create({
    data: {
      eventType: 'learning.applied',
      aggregateId: key,
      aggregateType: entityType,
      payload: JSON.stringify(adjustments),
      actorType: 'learning_engine',
    },
  })

  // Apply adjustments based on type
  const appliedActions: string[] = []

  // Handle recommendation-based adjustments
  if (adjustments.recommendation === 'decommission') {
    // For predictions, set status to 'dismissed'
    if (entityType === 'prediction') {
      const entityId = adjustments.entityId as string | undefined
      if (entityId) {
        try {
          await db.prediction.update({
            where: { id: entityId },
            data: { status: 'dismissed' },
          })
          appliedActions.push('Prediction status set to dismissed')
        } catch {
          appliedActions.push('Failed to update prediction status (not found)')
        }
      }
    }
    // For agents, set status to 'idle' (soft decommission)
    if (entityType === 'agent' || entityType === 'agent_response') {
      const entityId = adjustments.entityId as string | undefined
      if (entityId) {
        try {
          await db.agent.update({
            where: { id: entityId },
            data: { status: 'idle' },
          })
          appliedActions.push('Agent status set to idle')
        } catch {
          appliedActions.push('Failed to update agent status (not found)')
        }
      }
    }
  }

  // Handle recalibration — update quality scores to reflect new baseline
  if (adjustments.recalibrate) {
    const entityId = adjustments.entityId as string | undefined
    if (entityId) {
      await db.qualityScore.create({
        data: {
          entityType,
          entityId,
          metric: 'recalibration',
          score: 0.5, // Reset to neutral after recalibration
          sampleSize: 1,
          period: 'daily',
          periodStart: new Date(),
        },
      })
      appliedActions.push('Quality score recalibrated to neutral baseline')
    }
  }

  // Handle status reset
  if (adjustments.statusReset) {
    if (entityType === 'workflow') {
      const entityId = adjustments.entityId as string | undefined
      if (entityId) {
        try {
          await db.agentWorkflow.update({
            where: { id: entityId },
            data: { status: 'pending', error: null },
          })
          appliedActions.push('Workflow status reset to pending')
        } catch {
          appliedActions.push('Failed to reset workflow status (not found)')
        }
      }
    }
  }

  // Handle focus areas from feedback analysis
  if (adjustments.focusAreas) {
    const focusAreas = adjustments.focusAreas as string[]
    // Create an agent memory noting the focus areas
    await db.agentMemory.create({
      data: {
        agentId: 'system',
        type: 'learning',
        category: 'focus_areas',
        content: `Focus areas identified for ${entityType}: ${focusAreas.join(', ')}`,
        importance: 0.8,
      },
    })
    appliedActions.push(`Focus areas recorded: ${focusAreas.join(', ')}`)
  }

  // Handle decline investigation flag
  if (adjustments.investigateDecline) {
    await db.qualityScore.create({
      data: {
        entityType,
        entityId: adjustments.entityId as string ?? 'unknown',
        metric: 'decline_investigation',
        score: 0,
        sampleSize: 1,
        period: 'daily',
        periodStart: new Date(),
      },
    })
    appliedActions.push('Decline investigation flag set')
  }

  const details =
    appliedActions.length > 0
      ? `Applied ${appliedActions.length} adjustment(s): ${appliedActions.join('; ')}`
      : 'Adjustments recorded (no entity-specific actions needed)'

  return { applied: true, details }
}

// ─── Feedback Processing ──────────────────────────────────────────────────

export interface FeedbackAnalysis {
  averageRating: number
  ratingDistribution: Record<number, number>  // 1-5 → count
  commonThemes: string[]
  sentimentScore: number  // -1 to 1
  totalFeedback: number
  period: { from: Date; to: Date }
}

/**
 * Process and analyze user feedback for a given target type.
 */
export async function analyzeFeedback(params: {
  targetType: string
  targetId?: string
  from?: Date
  to?: Date
}): Promise<FeedbackAnalysis> {
  const { targetType, targetId, from, to } = params

  const where: Record<string, unknown> = { targetType }
  if (targetId) where.targetId = targetId
  if (from || to) {
    const createdAt: Record<string, Date> = {}
    if (from) createdAt.gte = from
    if (to) createdAt.lte = to
    where.createdAt = createdAt
  }

  const feedback = await db.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  const totalFeedback = feedback.length

  if (totalFeedback === 0) {
    return {
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      commonThemes: [],
      sentimentScore: 0,
      totalFeedback: 0,
      period: {
        from: from ?? new Date(0),
        to: to ?? new Date(),
      },
    }
  }

  // Average rating
  const averageRating = feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback

  // Rating distribution
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const f of feedback) {
    ratingDistribution[f.rating] = (ratingDistribution[f.rating] ?? 0) + 1
  }

  // Common themes from comments and tags
  const comments = feedback.map((f) => f.comment).filter(Boolean) as string[]
  const tagsLists = feedback.map((f) => f.tags).filter(Boolean) as string[]

  const commonThemes: string[] = []

  // Extract themes from tags
  const tagCounts = new Map<string, number>()
  for (const tagStr of tagsLists) {
    try {
      const parsed = JSON.parse(tagStr) as string[]
      if (Array.isArray(parsed)) {
        for (const tag of parsed) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
        }
      }
    } catch {
      // Treat as single tag
      tagCounts.set(tagStr, (tagCounts.get(tagStr) ?? 0) + 1)
    }
  }

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  commonThemes.push(...topTags)

  // Extract themes from comments
  if (comments.length > 0) {
    const commentThemes = extractCommonWords(comments, 5)
    commonThemes.push(...commentThemes)
  }

  // Sentiment score: -1 (very negative) to 1 (very positive)
  // Based on rating distribution: 5=1, 4=0.5, 3=0, 2=-0.5, 1=-1
  const sentimentWeights: Record<number, number> = { 1: -1, 2: -0.5, 3: 0, 4: 0.5, 5: 1 }
  let sentimentScore = 0
  for (const f of feedback) {
    sentimentScore += sentimentWeights[f.rating] ?? 0
  }
  sentimentScore = totalFeedback > 0 ? sentimentScore / totalFeedback : 0

  return {
    averageRating: Math.round(averageRating * 100) / 100,
    ratingDistribution,
    commonThemes: [...new Set(commonThemes)].slice(0, 10),
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    totalFeedback,
    period: {
      from: from ?? (feedback[feedback.length - 1]?.createdAt ?? new Date(0)),
      to: to ?? (feedback[0]?.createdAt ?? new Date()),
    },
  }
}

/** Number of feedback entries before triggering automatic learning */
const LEARNING_FEEDBACK_THRESHOLD = 5

/**
 * Record user feedback and trigger learning if threshold is met.
 */
export async function recordFeedback(params: {
  targetType: string
  targetId: string
  userId?: string
  rating: number      // 1-5
  comment?: string
  tags?: string[]
}): Promise<{ id: string }> {
  const { targetType, targetId, userId, rating, comment, tags } = params

  const feedback = await db.feedback.create({
    data: {
      targetType,
      targetId,
      userId,
      rating,
      comment,
      tags: tags ? JSON.stringify(tags) : undefined,
    },
  })

  // Check if we've hit the learning threshold for this target
  const feedbackCount = await db.feedback.count({
    where: { targetType, targetId },
  })

  if (feedbackCount >= LEARNING_FEEDBACK_THRESHOLD && feedbackCount % LEARNING_FEEDBACK_THRESHOLD === 0) {
    // Automatically analyze and learn at threshold boundaries
    try {
      const analysis = await analyzeOutcome(targetType, targetId)
      if (analysis && analysis.accuracy < 0.5) {
        await applyLearnings(targetType, {
          ...analysis.suggestedAdjustments,
          entityId: targetId,
          source: 'auto_feedback_threshold',
        })
      }
    } catch (err) {
      console.error('[LearningEngine] Auto-learning failed:', err)
    }
  }

  return { id: feedback.id }
}

// ─── Quality Scoring ──────────────────────────────────────────────────────

/**
 * Update quality scores for an entity based on new observations.
 * Scores are computed over rolling time windows.
 */
export async function updateQualityScore(params: {
  entityType: string
  entityId: string
  metric: string
  score: number
  sampleSize?: number
}): Promise<void> {
  const { entityType, entityId, metric, score, sampleSize = 1 } = params

  // Determine period and period start
  const now = new Date()
  const hourlyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
  const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Start of the week (Monday)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weeklyStart = new Date(dailyStart)
  weeklyStart.setDate(weeklyStart.getDate() - mondayOffset)

  // Upsert for each period type
  for (const [period, periodStart] of [
    ['hourly', hourlyStart],
    ['daily', dailyStart],
    ['weekly', weeklyStart],
  ] as const) {
    try {
      await db.qualityScore.upsert({
        where: {
          entityType_entityId_metric_period_periodStart: {
            entityType,
            entityId,
            metric,
            period,
            periodStart,
          },
        },
        create: {
          entityType,
          entityId,
          metric,
          score,
          sampleSize,
          period,
          periodStart,
        },
        update: {
          // Weighted average: blend existing score with new score
          score: score, // Latest score overwrites for rolling window
          sampleSize: { increment: sampleSize },
        },
      })
    } catch {
      // If unique constraint fails due to timing, create a new entry
      await db.qualityScore.create({
        data: {
          entityType,
          entityId,
          metric,
          score,
          sampleSize,
          period,
          periodStart,
        },
      })
    }
  }
}

/**
 * Get quality scores for an entity or across all entities of a type.
 */
export async function getQualityScores(params: {
  entityType: string
  entityId?: string
  metric?: string
  period?: 'hourly' | 'daily' | 'weekly'
}): Promise<Array<{
  entityId: string
  metric: string
  score: number
  sampleSize: number
  period: string
  periodStart: Date
}>> {
  const { entityType, entityId, metric, period } = params

  const where: Record<string, unknown> = { entityType }
  if (entityId) where.entityId = entityId
  if (metric) where.metric = metric
  if (period) where.period = period

  const scores = await db.qualityScore.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return scores.map((s) => ({
    entityId: s.entityId,
    metric: s.metric,
    score: s.score,
    sampleSize: s.sampleSize,
    period: s.period,
    periodStart: s.periodStart,
  }))
}

// ─── Evaluation Pipeline ──────────────────────────────────────────────────

export interface EvaluationResult {
  entityType: string
  entityId: string
  overallScore: number
  metrics: Record<string, number>
  recommendation: 'continue' | 'improve' | 'review' | 'decommission'
  details: string
}

/**
 * Run a full evaluation pipeline for all entities of a given type.
 * Used for periodic quality assessment.
 */
export async function runEvaluationPipeline(params: {
  entityType: string  // 'agent', 'prediction', 'connector', 'search'
  metrics?: string[]
  minSampleSize?: number
}): Promise<{
  evaluated: number
  results: EvaluationResult[]
  averageScore: number
  timestamp: Date
}> {
  const { entityType, metrics: requestedMetrics, minSampleSize = 3 } = params
  const timestamp = new Date()

  // Collect all entity IDs of the given type
  const entityIds = await getEntityIdsForType(entityType)

  const results: EvaluationResult[] = []

  for (const entityId of entityIds) {
    try {
      const result = await evaluateEntity(entityType, entityId, requestedMetrics, minSampleSize)
      if (result) {
        results.push(result)
      }
    } catch (err) {
      console.error(`[EvaluationPipeline] Failed to evaluate ${entityType}/${entityId}:`, err)
    }
  }

  const averageScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.overallScore, 0) / results.length
      : 0

  return {
    evaluated: results.length,
    results,
    averageScore: Math.round(averageScore * 100) / 100,
    timestamp,
  }
}

/**
 * Get all entity IDs for a given entity type.
 */
async function getEntityIdsForType(entityType: string): Promise<string[]> {
  switch (entityType) {
    case 'agent':
    case 'agent_response': {
      const agents = await db.agent.findMany({ select: { id: true } })
      return agents.map((a) => a.id)
    }
    case 'prediction': {
      const predictions = await db.prediction.findMany({
        where: { status: 'active' },
        select: { id: true },
      })
      return predictions.map((p) => p.id)
    }
    case 'connector': {
      const connectors = await db.connector.findMany({ select: { id: true } })
      return connectors.map((c) => c.id)
    }
    case 'search': {
      // For search, we evaluate the memories as search targets
      const memories = await db.memory.findMany({ select: { id: true }, take: 100 })
      return memories.map((m) => m.id)
    }
    default:
      return []
  }
}

/**
 * Evaluate a single entity and produce an EvaluationResult.
 */
async function evaluateEntity(
  entityType: string,
  entityId: string,
  requestedMetrics?: string[],
  minSampleSize: number = 3,
): Promise<EvaluationResult | null> {
  // Gather quality scores
  const qualityWhere: Record<string, unknown> = { entityType, entityId }
  const scores = await db.qualityScore.findMany({
    where: qualityWhere,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Gather feedback
  const feedback = await db.feedback.findMany({
    where: { targetType: entityType, targetId: entityId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Build metrics map
  const metrics: Record<string, number> = {}

  // Quality score metrics
  if (scores.length > 0) {
    // Group by metric name, take latest for each
    const latestByMetric = new Map<string, number>()
    for (const s of scores) {
      if (!latestByMetric.has(s.metric)) {
        latestByMetric.set(s.metric, s.score)
      }
    }

    for (const [metric, score] of latestByMetric) {
      if (!requestedMetrics || requestedMetrics.includes(metric)) {
        metrics[metric] = score
      }
    }
  }

  // Feedback metrics
  if (feedback.length > 0) {
    metrics.feedback_avg_rating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length / 5 // Normalize to 0-1
    metrics.feedback_count = feedback.length
    metrics.feedback_positive_ratio = feedback.filter((f) => f.rating >= 4).length / feedback.length
  }

  // Observation metrics
  const observationEvents = await db.domainEvent.findMany({
    where: {
      eventType: 'observation.recorded',
      aggregateId: entityId,
      aggregateType: entityType,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  metrics.observation_count = observationEvents.length

  // Filter by min sample size
  const totalSamples = scores.reduce((sum, s) => sum + s.sampleSize, 0) + feedback.length
  if (totalSamples < minSampleSize && feedback.length < minSampleSize) {
    return null // Not enough data to evaluate
  }

  // Compute overall score
  const metricValues = Object.values(metrics).filter((v) => typeof v === 'number' && v >= 0 && v <= 1)
  const overallScore =
    metricValues.length > 0
      ? metricValues.reduce((sum, v) => sum + v, 0) / metricValues.length
      : 0.5 // Default to neutral if no metrics available

  // Determine recommendation
  let recommendation: EvaluationResult['recommendation']
  if (overallScore >= 0.7) {
    recommendation = 'continue'
  } else if (overallScore >= 0.5) {
    recommendation = 'review'
  } else if (overallScore >= 0.3) {
    recommendation = 'improve'
  } else {
    recommendation = 'decommission'
  }

  // Build details string
  const detailsParts: string[] = []
  detailsParts.push(`Overall: ${(overallScore * 100).toFixed(1)}%`)
  if (feedback.length > 0) {
    const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    detailsParts.push(`Avg rating: ${avgRating.toFixed(1)}/5 (${feedback.length} reviews)`)
  }
  if (scores.length > 0) {
    detailsParts.push(`Quality scores: ${scores.length} data points`)
  }
  if (observationEvents.length > 0) {
    detailsParts.push(`Observations: ${observationEvents.length}`)
  }

  // Update quality score with evaluation result
  await updateQualityScore({
    entityType,
    entityId,
    metric: 'evaluation',
    score: overallScore,
    sampleSize: totalSamples,
  })

  return {
    entityType,
    entityId,
    overallScore: Math.round(overallScore * 100) / 100,
    metrics,
    recommendation,
    details: detailsParts.join(' | '),
  }
}

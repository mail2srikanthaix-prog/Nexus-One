import { db } from '@/lib/db'
import {
  apiResponse,
  apiErrorResponse,
  handleApiError,
  methodNotAllowed,
  getClientIp,
  RateLimiter,
  withSecurityHeaders,
} from '@/lib/api-utils'
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// ── Constants ───────────────────────────────────────────────────────────────

const VALID_AGENT_TYPES = ['ceo', 'cto', 'cfo', 'coo', 'cro', 'security', 'hr', 'knowledge', 'workflow', 'monitoring'] as const

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  ceo: `You are the CEO Agent of NEXUS ONE, an Enterprise AI Operating System. You provide strategic insights, executive briefings, and organizational direction. You have access to company data including projects, teams, financials, and predictions. Be decisive, strategic, and forward-thinking. Provide actionable recommendations with confidence levels. Format responses with clear sections and bullet points when appropriate.`,
  cto: `You are the CTO Agent of NEXUS ONE. You focus on technology strategy, architecture decisions, technical debt analysis, and innovation. You understand the company's tech stack, infrastructure, and engineering teams. Provide technical guidance with clear trade-off analysis. Use precise technical language but explain complex concepts clearly.`,
  cfo: `You are the CFO Agent of NEXUS ONE. You specialize in financial planning, budget optimization, cost analysis, and revenue forecasting. You track budget utilization, burn rates, and financial risks. Provide data-driven financial recommendations with ROI projections. Always include specific numbers and percentages.`,
  coo: `You are the COO Agent of NEXUS ONE. You optimize operations, manage resource allocation, handle incident management, and improve process efficiency. You have visibility into operational metrics, team capacity, and workflow bottlenecks. Provide practical operational recommendations with implementation timelines.`,
  cro: `You are the CRO Agent of NEXUS ONE. You focus on revenue optimization, customer intelligence, churn prediction, and pipeline analysis. You understand customer health scores, expansion opportunities, and revenue risks. Provide revenue-focused insights with clear financial impact projections.`,
  security: `You are the Security Agent of NEXUS ONE. You monitor for threats, scan vulnerabilities, track compliance, and manage incident response. You operate in a zero-trust framework. Provide security assessments with severity ratings and immediate action items. Always err on the side of caution.`,
  hr: `You are the HR Agent of NEXUS ONE. You handle people operations, talent intelligence, attrition prediction, engagement analysis, and culture metrics. You understand team dynamics, individual performance, and organizational health. Provide empathetic but data-driven people recommendations.`,
  knowledge: `You are the Knowledge Agent of NEXUS ONE. You are the enterprise search and knowledge management expert. You can find, connect, and synthesize information across all company systems. Provide comprehensive answers with source citations. Always show your reasoning chain.`,
  workflow: `You are the Workflow Agent of NEXUS ONE. You automate processes, route approvals, manage escalations, and orchestrate multi-step operations. You understand business processes, approval chains, and automation opportunities. Provide step-by-step workflow recommendations.`,
  monitoring: `You are the Monitoring Agent of NEXUS ONE. You detect anomalies, monitor system performance, manage alerts, and ensure observability. You understand infrastructure metrics, application performance, and error patterns. Provide real-time status updates with root cause analysis.`,
}

// ── Rate Limiter: 10 requests per minute per IP ─────────────────────────────

const chatRateLimiter = new RateLimiter(10, 60_000)

// ── ZAI Singleton Cache ─────────────────────────────────────────────────────

let zaiInstance: InstanceType<typeof import('z-ai-web-dev-sdk').default> | null = null
let zaiInitPromise: Promise<InstanceType<typeof import('z-ai-web-dev-sdk').default>> | null = null

/**
 * Ensure the .z-ai-config file exists. If not, create it from environment variables.
 * This fixes the issue where the config file is gitignored and missing on cloned machines.
 */
async function ensureConfig(): Promise<void> {
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
  ]
  // Check if any config already exists
  for (const p of configPaths) {
    try {
      const content = await fs.readFile(p, 'utf-8')
      const config = JSON.parse(content)
      if (config.baseUrl && config.apiKey) return // valid config exists
    } catch {
      // file doesn't exist or is invalid, continue
    }
  }
  // No valid config found — auto-create from environment variables
  const baseUrl = process.env.ZAI_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
  const apiKey = process.env.ZAI_API_KEY || 'ollama'
  const chatId = process.env.ZAI_CHAT_ID || 'nexus-one-boardroom'
  const userId = process.env.ZAI_USER_ID || 'nexus-user'
  const config = { baseUrl, apiKey, chatId, userId }
  const configPath = path.join(process.cwd(), '.z-ai-config')
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
    console.log(`[ZAI] Auto-created .z-ai-config at ${configPath} (baseUrl: ${baseUrl})`)
  } catch (err) {
    console.error('[ZAI] Failed to auto-create .z-ai-config:', err)
  }
}

/**
 * Get or create the ZAI SDK singleton.
 * Caches the instance and the init promise to avoid creating a new one per request.
 */
async function getZAI(): Promise<InstanceType<typeof import('z-ai-web-dev-sdk').default>> {
  if (zaiInstance) return zaiInstance

  // If initialization is already in-flight, await that promise
  if (zaiInitPromise) return zaiInitPromise

  zaiInitPromise = (async () => {
    // Ensure config file exists before creating the SDK instance
    await ensureConfig()
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    zaiInstance = await ZAI.create()
    return zaiInstance
  })()

  try {
    return await zaiInitPromise
  } catch (error) {
    // Reset so a retry can attempt re-initialization
    zaiInitPromise = null
    zaiInstance = null
    throw error
  }
}

// ── Input Validation ────────────────────────────────────────────────────────

interface HistoryItem {
  role: string
  content: string
}

function validateChatInput(body: unknown): {
  valid: boolean
  message?: string
  agentType?: string
  history?: HistoryItem[]
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body must be a JSON object' }
  }

  const { message, agentType, history } = body as Record<string, unknown>

  // Validate message
  if (typeof message !== 'string') {
    return { valid: false, message: 'message must be a non-empty string' }
  }
  const trimmedMessage = message.trim()
  if (trimmedMessage.length === 0) {
    return { valid: false, message: 'message must not be empty' }
  }
  if (trimmedMessage.length > 2000) {
    return { valid: false, message: 'message must be at most 2000 characters' }
  }

  // Validate agentType
  if (agentType !== undefined && agentType !== null) {
    if (typeof agentType !== 'string' || !VALID_AGENT_TYPES.includes(agentType as typeof VALID_AGENT_TYPES[number])) {
      return { valid: false, message: `agentType must be one of: ${VALID_AGENT_TYPES.join(', ')}` }
    }
  }

  // Validate history
  if (history !== undefined && history !== null) {
    if (!Array.isArray(history)) {
      return { valid: false, message: 'history must be an array' }
    }
    if (history.length > 20) {
      return { valid: false, message: 'history must contain at most 20 items' }
    }
    for (let i = 0; i < history.length; i++) {
      const item = history[i]
      if (!item || typeof item !== 'object') {
        return { valid: false, message: `history[${i}] must be an object` }
      }
      const h = item as Record<string, unknown>
      if (h.role !== 'user' && h.role !== 'assistant') {
        return { valid: false, message: `history[${i}].role must be 'user' or 'assistant'` }
      }
      if (typeof h.content !== 'string') {
        return { valid: false, message: `history[${i}].content must be a string` }
      }
      if (h.content.length > 2000) {
        return { valid: false, message: `history[${i}].content must be at most 2000 characters` }
      }
    }
  }

  return {
    valid: true,
    message: trimmedMessage,
    agentType: (agentType as string) || 'ceo',
    history: (history as HistoryItem[]) || [],
  }
}

// ── Method Guards ───────────────────────────────────────────────────────────

export async function GET() {
  return methodNotAllowed(['POST', 'HEAD'])
}
export async function PUT() { return methodNotAllowed(['POST', 'HEAD']) }
export async function DELETE() { return methodNotAllowed(['POST', 'HEAD']) }
export async function PATCH() { return methodNotAllowed(['POST', 'HEAD']) }

export async function HEAD() {
  const response = new NextResponse(null, { status: 200 })
  return withSecurityHeaders(response)
}

// ── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── Rate Limiting ───────────────────────────────────────────────────
    const clientIp = getClientIp(request)
    const rateCheck = chatRateLimiter.check(clientIp)
    if (!rateCheck.allowed) {
      const response = apiErrorResponse('Rate limit exceeded', 'RATE_LIMITED', 429)
      response.headers.set('Retry-After', String(rateCheck.retryAfter))
      return response
    }

    // ── Parse & Validate Body ───────────────────────────────────────────
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiErrorResponse('Invalid JSON body', 'INVALID_BODY', 400)
    }

    const validation = validateChatInput(body)
    if (!validation.valid) {
      return apiErrorResponse(validation.message!, 'INVALID_INPUT', 400)
    }

    const { message, agentType, history } = validation

    // ── Fetch Context ───────────────────────────────────────────────────
    const [recentEvents, activeProjects, activePredictions, recentTasks] = await Promise.all([
      db.event.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      db.project.findMany({ where: { status: 'active' }, take: 5 }),
      db.prediction.findMany({ where: { status: 'active' }, take: 5 }),
      db.task.findMany({ where: { status: 'in-progress' }, take: 5 }),
    ])

    const contextData = `
Current Company Context:
- Active Projects: ${activeProjects.map(p => `${p.name} (${p.health}% health, ${p.progress}% progress)`).join('; ')}
- Recent Events: ${recentEvents.map(e => `[${e.severity}] ${e.title}`).join('; ')}
- Active Predictions: ${activePredictions.map(p => `${p.title} (${(p.probability * 100).toFixed(0)}% probability)`).join('; ')}
- In-Progress Tasks: ${recentTasks.map(t => t.title).join('; ')}
`

    const systemPrompt = (AGENT_SYSTEM_PROMPTS[agentType!] || AGENT_SYSTEM_PROMPTS.ceo) + '\n\n' + contextData

    // ── Get ZAI Instance (cached singleton) ─────────────────────────────
    let zai: InstanceType<typeof import('z-ai-web-dev-sdk').default>
    try {
      zai = await getZAI()
    } catch (initError) {
      console.error('ZAI SDK initialization failed:', initError)
      return apiErrorResponse(
        'AI service is currently unavailable. Please try again later.',
        'AI_SERVICE_UNAVAILABLE',
        503
      )
    }

    // ── Build Messages ──────────────────────────────────────────────────
    const messages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...history!.map((h: HistoryItem) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message! },
    ]

    // ── Call LLM ────────────────────────────────────────────────────────
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b'
    const completion = await zai.chat.completions.create({
      model: ollamaModel,
      messages,
      thinking: { type: 'disabled' },
    })

    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'

    // ── Persist Chat Messages ───────────────────────────────────────────
    await Promise.all([
      db.chatMessage.create({
        data: { role: 'user', content: message!, agentType: agentType! },
      }),
      db.chatMessage.create({
        data: { role: 'assistant', content: response, agentType: agentType! },
      }),
    ])

    return apiResponse({
      response,
      agentType: agentType!,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return handleApiError(error, 'Chat API')
  }
}

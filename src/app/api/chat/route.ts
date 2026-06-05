import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

export async function POST(request: Request) {
  try {
    const { message, agentType = 'ceo', history = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Fetch relevant context from the database
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

    const systemPrompt = (AGENT_SYSTEM_PROMPTS[agentType] || AGENT_SYSTEM_PROMPTS.ceo) + '\n\n' + contextData

    // Use z-ai-web-dev-sdk for LLM
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const messages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'

    // Save chat message to database
    await db.chatMessage.create({
      data: {
        role: 'user',
        content: message,
        agentType,
      },
    })
    await db.chatMessage.create({
      data: {
        role: 'assistant',
        content: response,
        agentType,
      },
    })

    return NextResponse.json({
      response,
      agentType,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}

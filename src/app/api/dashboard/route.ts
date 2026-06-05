import { db } from '@/lib/db'
import { apiResponse, apiErrorResponse, getClientIp, handleApiError, methodNotAllowed, readRateLimiter, withSecurityHeaders } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

// Method guard: only GET and HEAD allowed
export async function POST() { return methodNotAllowed(['GET', 'HEAD']) }
export async function PUT() { return methodNotAllowed(['GET', 'HEAD']) }
export async function DELETE() { return methodNotAllowed(['GET', 'HEAD']) }
export async function PATCH() { return methodNotAllowed(['GET', 'HEAD']) }

export async function HEAD() {
  const response = new NextResponse(null, { status: 200 })
  return withSecurityHeaders(response)
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = readRateLimiter.check(clientIp)
    if (!rateCheck.allowed) {
      const response = apiErrorResponse('Rate limit exceeded', 'RATE_LIMITED', 429)
      response.headers.set('Retry-After', String(rateCheck.retryAfter))
      return response
    }
    // ── Count-based metrics (no full row fetch) ──────────────────────────
    const [
      totalPeople,
      activePeople,
      totalTeams,
      totalProjects,
      activeProjectCount,
      totalTasks,
      activeTasks,
      completedTasks,
      criticalEventsCount,
      totalEvents,
      activePredictions,
      criticalPredictions,
      connectedConnectors,
      totalConnectors,
      agentStatusIdle,
      agentStatusThinking,
      agentStatusExecuting,
      agentStatusReporting,
    ] = await Promise.all([
      db.person.count(),
      db.person.count({ where: { status: 'active' } }),
      db.team.count(),
      db.project.count(),
      db.project.count({ where: { status: 'active' } }),
      db.task.count(),
      db.task.count({ where: { status: { not: 'done' } } }),
      db.task.count({ where: { status: 'done' } }),
      db.event.count({ where: { severity: { in: ['critical', 'error'] } } }),
      db.event.count(),
      db.prediction.count({ where: { status: 'active' } }),
      db.prediction.count({ where: { status: 'active', probability: { gt: 0.6 } } }),
      db.connector.count({ where: { status: 'connected' } }),
      db.connector.count(),
      db.agent.count({ where: { status: 'idle' } }),
      db.agent.count({ where: { status: 'thinking' } }),
      db.agent.count({ where: { status: 'executing' } }),
      db.agent.count({ where: { status: 'reporting' } }),
    ])

    // ── Aggregated data for budget / records / health ────────────────────
    const [projectBudgets, connectorRecords, org, activeProjectsWithHealth] = await Promise.all([
      db.project.findMany({ select: { budget: true, budgetUsed: true, status: true } }),
      db.connector.findMany({ select: { recordCount: true } }),
      db.organization.findFirst(),
      db.project.findMany({
        where: { status: 'active' },
        select: { health: true },
      }),
    ])

    const totalBudget = projectBudgets.reduce((acc, p) => acc + (p.budget || 0), 0)
    const totalBudgetUsed = projectBudgets.reduce((acc, p) => acc + (p.budgetUsed || 0), 0)
    const totalRecords = connectorRecords.reduce((acc, c) => acc + (c.recordCount || 0), 0)
    const avgHealth = activeProjectsWithHealth.length > 0
      ? activeProjectsWithHealth.reduce((acc, p) => acc + p.health, 0) / activeProjectsWithHealth.length
      : 0

    // ── Data for display lists ───────────────────────────────────────────
    const [recentEvents, agents, predictions, topMemories, activeProjects, connectors] = await Promise.all([
      db.event.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      db.agent.findMany({ include: { actions: { orderBy: { createdAt: 'desc' }, take: 3 } } }),
      db.prediction.findMany({ where: { status: 'active' }, take: 6 }),
      db.memory.findMany({ orderBy: { importance: 'desc' }, take: 5 }),
      db.project.findMany({ where: { status: 'active' }, take: 6 }),
      db.connector.findMany(),
    ])

    return apiResponse({
      organization: org,
      metrics: {
        totalPeople,
        activePeople,
        totalTeams,
        totalProjects,
        activeProjects: activeProjectCount,
        totalTasks,
        activeTasks,
        completedTasks,
        criticalEvents: criticalEventsCount,
        totalEvents,
        activePredictions,
        criticalPredictions,
        connectedConnectors,
        totalConnectors,
        totalRecords,
        totalBudget,
        totalBudgetUsed,
        budgetUtilization: totalBudget > 0 ? (totalBudgetUsed / totalBudget * 100).toFixed(1) : '0',
        avgProjectHealth: avgHealth.toFixed(0),
        agentStatus: {
          idle: agentStatusIdle,
          thinking: agentStatusThinking,
          executing: agentStatusExecuting,
          reporting: agentStatusReporting,
        },
      },
      recentEvents: recentEvents.slice(0, 10),
      agents,
      predictions,
      topMemories,
      projects: activeProjects,
      connectors,
    })
  } catch (error) {
    return handleApiError(error, 'Dashboard API')
  }
}

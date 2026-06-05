import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      organizations,
      people,
      teams,
      projects,
      tasks,
      events,
      agents,
      predictions,
      connectors,
      memories,
    ] = await Promise.all([
      db.organization.findMany(),
      db.person.findMany(),
      db.team.findMany(),
      db.project.findMany(),
      db.task.findMany(),
      db.event.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      db.agent.findMany({ include: { actions: { orderBy: { createdAt: 'desc' }, take: 3 } } }),
      db.prediction.findMany({ where: { status: 'active' } }),
      db.connector.findMany(),
      db.memory.findMany({ orderBy: { importance: 'desc' }, take: 5 }),
    ])

    const activeProjects = projects.filter(p => p.status === 'active')
    const criticalPredictions = predictions.filter(p => p.probability > 0.6)
    const activeTasks = tasks.filter(t => t.status !== 'done')
    const completedTasks = tasks.filter(t => t.status === 'done')
    const criticalEvents = events.filter(e => e.severity === 'critical' || e.severity === 'error')
    const connectedCount = connectors.filter(c => c.status === 'connected').length
    const totalRecords = connectors.reduce((acc, c) => acc + (c.recordCount || 0), 0)

    const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0)
    const totalBudgetUsed = projects.reduce((acc, p) => acc + (p.budgetUsed || 0), 0)

    const avgHealth = activeProjects.length > 0
      ? activeProjects.reduce((acc, p) => acc + p.health, 0) / activeProjects.length
      : 0

    const org = organizations[0]

    return NextResponse.json({
      organization: org,
      metrics: {
        totalPeople: people.length,
        activePeople: people.filter(p => p.status === 'active').length,
        totalTeams: teams.length,
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        totalTasks: tasks.length,
        activeTasks: activeTasks.length,
        completedTasks: completedTasks.length,
        criticalEvents: criticalEvents.length,
        totalEvents: events.length,
        activePredictions: predictions.length,
        criticalPredictions: criticalPredictions.length,
        connectedConnectors: connectedCount,
        totalConnectors: connectors.length,
        totalRecords,
        totalBudget,
        totalBudgetUsed,
        budgetUtilization: totalBudget > 0 ? (totalBudgetUsed / totalBudget * 100).toFixed(1) : '0',
        avgProjectHealth: avgHealth.toFixed(0),
        agentStatus: {
          idle: agents.filter(a => a.status === 'idle').length,
          thinking: agents.filter(a => a.status === 'thinking').length,
          executing: agents.filter(a => a.status === 'executing').length,
          reporting: agents.filter(a => a.status === 'reporting').length,
        },
      },
      recentEvents: events.slice(0, 10),
      agents,
      predictions: predictions.slice(0, 6),
      topMemories: memories,
      projects: activeProjects.slice(0, 6),
      connectors,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}

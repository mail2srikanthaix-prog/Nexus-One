import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const agents = await db.agent.findMany({
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { name: 'asc' },
    })

    const statusCounts = {
      idle: agents.filter(a => a.status === 'idle').length,
      thinking: agents.filter(a => a.status === 'thinking').length,
      executing: agents.filter(a => a.status === 'executing').length,
      reporting: agents.filter(a => a.status === 'reporting').length,
      error: agents.filter(a => a.status === 'error').length,
    }

    return NextResponse.json({ agents, statusCounts, total: agents.length })
  } catch (error) {
    console.error('Agents API error:', error)
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
  }
}

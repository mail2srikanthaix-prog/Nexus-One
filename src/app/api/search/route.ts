import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'

    const results: Record<string, unknown[]> = {}

    if (type === 'all' || type === 'people') {
      const people = q
        ? await db.person.findMany({ where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { role: { contains: q } }, { department: { contains: q } }] }, take: 10 })
        : await db.person.findMany({ take: 10 })
      results.people = people
    }

    if (type === 'all' || type === 'projects') {
      const projects = q
        ? await db.project.findMany({ where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] }, take: 10 })
        : await db.project.findMany({ take: 10 })
      results.projects = projects
    }

    if (type === 'all' || type === 'decisions') {
      const decisions = q
        ? await db.decision.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }, { reasoning: { contains: q } }] }, take: 10 })
        : await db.decision.findMany({ take: 10 })
      results.decisions = decisions
    }

    if (type === 'all' || type === 'events') {
      const events = q
        ? await db.event.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }, { source: { contains: q } }] }, orderBy: { createdAt: 'desc' }, take: 10 })
        : await db.event.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
      results.events = events
    }

    if (type === 'all' || type === 'memories') {
      const memories = q
        ? await db.memory.findMany({ where: { OR: [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q } }] }, take: 10 })
        : await db.memory.findMany({ take: 10 })
      results.memories = memories
    }

    if (type === 'all' || type === 'tasks') {
      const tasks = q
        ? await db.task.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }] }, take: 10 })
        : await db.task.findMany({ take: 10 })
      results.tasks = tasks
    }

    if (type === 'all' || type === 'predictions') {
      const predictions = q
        ? await db.prediction.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }] }, take: 10 })
        : await db.prediction.findMany({ take: 10 })
      results.predictions = predictions
    }

    const totalResults = Object.values(results).reduce((acc, arr) => acc + arr.length, 0)

    return NextResponse.json({
      query: q,
      type,
      totalResults,
      results,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

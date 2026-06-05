import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const severity = searchParams.get('severity')

    const where = severity ? { severity } : {}

    const events = await db.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        person: { select: { name: true, role: true } },
        project: { select: { name: true, status: true } },
      },
    })

    const typeCounts: Record<string, number> = {}
    const severityCounts: Record<string, number> = {}

    const allEvents = await db.event.findMany()
    for (const e of allEvents) {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
      severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1
    }

    return NextResponse.json({
      events,
      typeCounts,
      severityCounts,
      total: allEvents.length,
    })
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
  }
}

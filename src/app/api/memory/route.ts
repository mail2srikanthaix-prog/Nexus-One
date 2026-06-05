import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const q = searchParams.get('q')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
        { source: { contains: q } },
      ]
    }

    const memories = await db.memory.findMany({
      where,
      orderBy: { importance: 'desc' },
      take: 50,
    })

    const typeCounts: Record<string, number> = {}
    const allMemories = await db.memory.findMany()
    for (const m of allMemories) {
      typeCounts[m.type] = (typeCounts[m.type] || 0) + 1
    }

    return NextResponse.json({
      memories,
      typeCounts,
      total: allMemories.length,
    })
  } catch (error) {
    console.error('Memory API error:', error)
    return NextResponse.json({ error: 'Failed to load memories' }, { status: 500 })
  }
}

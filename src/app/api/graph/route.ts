import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const entities = await db.graphEntity.findMany({
      include: {
        sourceRelations: { include: { target: true } },
        targetRelations: { include: { source: true } },
      },
    })

    const relations = await db.graphRelation.findMany({
      include: { source: true, target: true },
    })

    // Build adjacency info
    const entityMap = new Map(entities.map(e => [e.id, e]))

    const nodes = entities.map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      properties: e.properties ? JSON.parse(e.properties) : {},
      relationCount: e.sourceRelations.length + e.targetRelations.length,
    }))

    const edges = relations.map(r => ({
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
      type: r.type,
      weight: r.weight,
      sourceName: r.source.name,
      targetName: r.target.name,
    }))

    const typeCounts: Record<string, number> = {}
    for (const e of entities) {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
    }

    return NextResponse.json({
      nodes,
      edges,
      typeCounts,
      totalEntities: entities.length,
      totalRelations: relations.length,
    })
  } catch (error) {
    console.error('Graph API error:', error)
    return NextResponse.json({ error: 'Failed to load graph data' }, { status: 500 })
  }
}

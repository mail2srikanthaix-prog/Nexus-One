import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const predictions = await db.prediction.findMany({
      orderBy: { probability: 'desc' },
    })

    const typeCounts: Record<string, number> = {}
    const impactCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}

    for (const p of predictions) {
      typeCounts[p.type] = (typeCounts[p.type] || 0) + 1
      impactCounts[p.impact] = (impactCounts[p.impact] || 0) + 1
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
    }

    const highRisk = predictions.filter(p => p.probability > 0.6)
    const avgProbability = predictions.length > 0
      ? predictions.reduce((acc, p) => acc + p.probability, 0) / predictions.length
      : 0

    return NextResponse.json({
      predictions,
      typeCounts,
      impactCounts,
      statusCounts,
      highRiskCount: highRisk.length,
      avgProbability: avgProbability.toFixed(2),
      total: predictions.length,
    })
  } catch (error) {
    console.error('Predictions API error:', error)
    return NextResponse.json({ error: 'Failed to load predictions' }, { status: 500 })
  }
}

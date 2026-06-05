import { db } from '@/lib/db'
import { apiResponse, handleApiError, methodNotAllowed, withSecurityHeaders } from '@/lib/api-utils'
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

/**
 * Safely parse a JSON capabilities string into an array.
 * The seed data stores capabilities as JSON arrays, but they
 * may also be plain strings – handle both gracefully.
 */
function parseCapabilities(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    // If it parsed but isn't an array, wrap in array
    return [String(parsed)]
  } catch {
    // Not valid JSON – treat as a single capability string
    return [raw]
  }
}

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

    // Parse capabilities from JSON strings to proper arrays
    const parsedAgents = agents.map(agent => ({
      ...agent,
      capabilities: parseCapabilities(agent.capabilities),
    }))

    const statusCounts = {
      idle: agents.filter(a => a.status === 'idle').length,
      thinking: agents.filter(a => a.status === 'thinking').length,
      executing: agents.filter(a => a.status === 'executing').length,
      reporting: agents.filter(a => a.status === 'reporting').length,
      error: agents.filter(a => a.status === 'error').length,
    }

    return apiResponse({ agents: parsedAgents, statusCounts, total: agents.length })
  } catch (error) {
    return handleApiError(error, 'Agents API')
  }
}

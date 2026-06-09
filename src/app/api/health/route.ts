/**
 * Health Check Endpoint — Unauthenticated
 *
 * Returns system health status including database connectivity,
 * AI service availability, memory usage, and uptime.
 * This route is explicitly excluded from middleware auth checks.
 */

import { db } from '@/lib/db'
import { apiResponse, apiErrorResponse } from '@/lib/api-utils'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: { status: 'healthy' | 'unhealthy'; latencyMs?: number; error?: string }
    ai: { status: 'healthy' | 'degraded' | 'unhealthy'; provider?: string; error?: string }
  }
  memory: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
}

async function checkDbHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return { status: 'healthy', latencyMs: Date.now() - start }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed',
    }
  }
}

async function checkAiHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; provider?: string; error?: string }> {
  try {
    // Check if the AI SDK endpoint is configured
    const baseUrl = process.env.OLLAMA_BASE_URL || process.env.AI_BASE_URL
    if (!baseUrl) {
      return { status: 'degraded', provider: 'not_configured', error: 'AI service URL not configured' }
    }

    // Attempt a lightweight health check
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      })
      clearTimeout(timeout)

      if (response.ok) {
        return { status: 'healthy', provider: 'ollama' }
      }
      return { status: 'degraded', provider: 'ollama', error: `AI service returned ${response.status}` }
    } catch (fetchError) {
      clearTimeout(timeout)
      return {
        status: 'degraded',
        provider: 'ollama',
        error: fetchError instanceof Error ? fetchError.message : 'AI service unreachable',
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'AI health check failed',
    }
  }
}

export async function GET(): Promise<Response> {
  try {
    // Run all health checks in parallel
    const [dbHealth, aiHealth] = await Promise.all([
      checkDbHealth(),
      checkAiHealth(),
    ])

    // Get memory usage
    const memUsage = process.memoryUsage()

    // Determine overall status
    let status: HealthStatus['status'] = 'healthy'
    if (dbHealth.status === 'unhealthy') {
      status = 'unhealthy'
    } else if (aiHealth.status === 'unhealthy' || aiHealth.status === 'degraded') {
      status = 'degraded'
    }

    const health: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      version: '0.2.0',
      uptime: process.uptime(),
      services: {
        database: dbHealth,
        ai: aiHealth,
      },
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
    }

    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503
    return apiResponse(health, httpStatus)
  } catch (error) {
    return apiErrorResponse(
      error instanceof Error ? error.message : 'Health check failed',
      'HEALTH_CHECK_ERROR',
      503
    )
  }
}

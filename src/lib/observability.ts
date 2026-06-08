/**
 * Observability: Health Checks & Metrics Collection
 * Provides system health status reporting and request metrics tracking.
 */

import { db } from '@/lib/db'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: { status: string; latencyMs: number }
    ai: { status: string; model?: string }
  }
  memory: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  metrics: {
    totalRequests: number
    totalErrors: number
    avgResponseTime: number
    activeConnections: number
  }
}

const MAX_RESPONSE_TIMES = 1000

/**
 * Request metrics collector for tracking API performance.
 * Keeps a sliding window of response times for percentile calculations.
 */
export class MetricsCollector {
  private requestCount: number
  private errorCount: number
  private responseTimes: number[]
  private startTime: number

  constructor() {
    this.requestCount = 0
    this.errorCount = 0
    this.responseTimes = []
    this.startTime = Date.now()
  }

  /**
   * Record a request with its duration and optional error flag.
   */
  recordRequest(durationMs: number, isError: boolean = false): void {
    this.requestCount++
    if (isError) this.errorCount++

    this.responseTimes.push(durationMs)
    // Keep only the most recent entries to prevent unbounded memory growth
    if (this.responseTimes.length > MAX_RESPONSE_TIMES) {
      this.responseTimes = this.responseTimes.slice(-MAX_RESPONSE_TIMES)
    }
  }

  /**
   * Get computed metrics including percentiles.
   */
  getMetrics(): {
    totalRequests: number
    totalErrors: number
    avgResponseTime: number
    p50: number
    p95: number
    p99: number
  } {
    const times = this.responseTimes
    const len = times.length

    if (len === 0) {
      return {
        totalRequests: this.requestCount,
        totalErrors: this.errorCount,
        avgResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      }
    }

    const sorted = [...times].sort((a, b) => a - b)
    const sum = sorted.reduce((acc, t) => acc + t, 0)

    return {
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      avgResponseTime: Math.round(sum / len),
      p50: sorted[Math.floor(len * 0.5)] ?? 0,
      p95: sorted[Math.floor(len * 0.95)] ?? 0,
      p99: sorted[Math.min(Math.floor(len * 0.99), len - 1)] ?? 0,
    }
  }

  /**
   * Reset all metrics counters.
   */
  reset(): void {
    this.requestCount = 0
    this.errorCount = 0
    this.responseTimes = []
    this.startTime = Date.now()
  }

  /**
   * Get the time since the collector was created or last reset.
   */
  getUptimeMs(): number {
    return Date.now() - this.startTime
  }
}

/** Global metrics collector instance */
export const metrics = new MetricsCollector()

/**
 * Check the health of the database connection.
 * Returns latency in milliseconds or -1 on failure.
 */
async function checkDatabaseHealth(): Promise<{ status: string; latencyMs: number }> {
  try {
    const start = Date.now()
    await db.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - start

    if (latencyMs < 100) {
      return { status: 'healthy', latencyMs }
    } else if (latencyMs < 500) {
      return { status: 'degraded', latencyMs }
    } else {
      return { status: 'unhealthy', latencyMs }
    }
  } catch {
    return { status: 'unhealthy', latencyMs: -1 }
  }
}

/**
 * Get a comprehensive health status report for the system.
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const dbHealth = await checkDatabaseHealth()
  const metricsData = metrics.getMetrics()

  // Determine overall status based on service health
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (dbHealth.status === 'unhealthy') {
    overallStatus = 'unhealthy'
  } else if (dbHealth.status === 'degraded' || metricsData.avgResponseTime > 500) {
    overallStatus = 'degraded'
  }

  // Get memory usage (available in Node.js)
  const memUsage = typeof process !== 'undefined' ? process.memoryUsage() : {
    rss: 0,
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
  }

  // Get version from package.json via env or default
  const version = process.env.APP_VERSION ?? '1.0.0'

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version,
    uptime: typeof process !== 'undefined' ? process.uptime() : 0,
    services: {
      database: dbHealth,
      ai: {
        status: 'healthy',
        model: process.env.AI_MODEL ?? 'default',
      },
    },
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    },
    metrics: {
      totalRequests: metricsData.totalRequests,
      totalErrors: metricsData.totalErrors,
      avgResponseTime: metricsData.avgResponseTime,
      activeConnections: 0, // Placeholder - would need WebSocket/server tracking
    },
  }
}

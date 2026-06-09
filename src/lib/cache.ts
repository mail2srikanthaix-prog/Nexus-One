/**
 * In-Memory Cache with TTL support
 * Provides type-safe caching with automatic expiration and cleanup.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export class Cache<T> {
  private store: Map<string, CacheEntry<T>>
  private defaultTtl: number
  private cleanupInterval: ReturnType<typeof setInterval> | null

  constructor(defaultTtlMs: number = 60_000) {
    this.store = new Map()
    this.defaultTtl = defaultTtlMs
    this.cleanupInterval = null

    // Run cleanup every 60 seconds to remove expired entries
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60_000)
      // Don't prevent Node.js process from exiting
      if (this.cleanupInterval && typeof this.cleanupInterval === 'object' && 'unref' in this.cleanupInterval) {
        this.cleanupInterval.unref()
      }
    }
  }

  /**
   * Get a value from the cache. Returns null if the key doesn't exist or has expired.
   */
  get(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set a value in the cache with an optional TTL override.
   */
  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtl
    this.store.set(key, {
      data: value,
      expiresAt: Date.now() + ttl,
    })
  }

  /**
   * Delete a specific key from the cache.
   */
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Check if a non-expired key exists in the cache.
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Get the number of non-expired entries in the cache.
   */
  size(): number {
    this.cleanup()
    return this.store.size
  }

  /**
   * Remove all expired entries from the cache.
   * Called automatically on a timer, but can also be invoked manually.
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Get or set a value - returns the cached value if it exists and hasn't expired,
   * otherwise calls the factory function, caches and returns the result.
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key)
    if (cached !== null) return cached

    const value = await factory()
    this.set(key, value, ttlMs)
    return value
  }

  /**
   * Stop the cleanup interval. Call this when shutting down the application.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }
}

// ═══════════════════════════════════════════════════════════════════
// Pre-configured caches for different data types
// ═══════════════════════════════════════════════════════════════════

/** Dashboard data cache - 30 second TTL for frequently accessed metrics */
export const dashboardCache = new Cache<unknown>(30_000)

/** Knowledge graph cache - 60 second TTL for graph data */
export const graphCache = new Cache<unknown>(60_000)

/** Agent status cache - 15 second TTL for agent state */
export const agentsCache = new Cache<unknown>(15_000)

/** Search results cache - 10 second TTL for search queries */
export const searchCache = new Cache<unknown>(10_000)

/** User permissions cache - 5 minute TTL for RBAC permission lists */
export const userPermissionsCache = new Cache<string[]>(300_000)

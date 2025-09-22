/**
 * LRU (Least Recently Used) Cache Manager
 * Provides efficient memory management with automatic cleanup
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  size: number // Approximate size in bytes
}

export class LRUCacheManager<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map()
  private accessOrder: Map<K, number> = new Map()
  private weakCache: WeakMap<any, V> = new WeakMap()
  private currentSize: number = 0
  private accessCounter: number = 0

  constructor(
    private maxSize: number = 100 * 1024 * 1024, // 100MB default
    private maxItems: number = 100,
    private ttl: number = 3600000 // 1 hour default TTL
  ) {}

  /**
   * Get item from cache
   */
  get(key: K, weakKey?: any): V | null {
    // Try WeakMap first if weakKey provided
    if (weakKey && this.weakCache.has(weakKey)) {
      return this.weakCache.get(weakKey)!
    }

    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key)
      return null
    }

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter)

    return entry.data
  }

  /**
   * Set item in cache
   */
  set(key: K, value: V, sizeBytes?: number, weakKey?: any): void {
    // Calculate approximate size if not provided
    const size = sizeBytes || this.estimateSize(value)

    // Store in WeakMap for automatic cleanup
    if (weakKey) {
      this.weakCache.set(weakKey, value)
    }

    // Check if we need to evict items
    while (
      (this.cache.size >= this.maxItems || this.currentSize + size > this.maxSize) &&
      this.cache.size > 0
    ) {
      this.evictLRU()
    }

    // Add or update entry
    const existingEntry = this.cache.get(key)
    if (existingEntry) {
      this.currentSize -= existingEntry.size
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      size
    })

    this.currentSize += size
    this.accessOrder.set(key, ++this.accessCounter)
  }

  /**
   * Delete item from cache
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSize -= entry.size
      this.accessOrder.delete(key)
      return this.cache.delete(key)
    }
    return false
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder.clear()
    this.currentSize = 0
    this.accessCounter = 0
    // WeakMap clears automatically
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    items: number
    sizeBytes: number
    maxSizeBytes: number
    hitRate: number
  } {
    return {
      items: this.cache.size,
      sizeBytes: this.currentSize,
      maxSizeBytes: this.maxSize,
      hitRate: this.calculateHitRate()
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lruKey: K | null = null
    let minAccess = Infinity

    // Find LRU item
    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < minAccess) {
        minAccess = accessTime
        lruKey = key
      }
    }

    if (lruKey !== null) {
      this.delete(lruKey)
    }
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: any): number {
    if (value === null || value === undefined) {
      return 0
    }

    // For typed arrays
    if (value instanceof Float32Array || value instanceof Uint32Array) {
      return value.byteLength
    }

    // For objects/arrays, use JSON stringify (approximate)
    try {
      const str = JSON.stringify(value)
      return str.length * 2 // Assuming 2 bytes per character
    } catch {
      // If can't stringify, assume 1KB
      return 1024
    }
  }

  private hits = 0
  private misses = 0

  private calculateHitRate(): number {
    const total = this.hits + this.misses
    return total === 0 ? 0 : this.hits / total
  }

  // Track cache performance
  recordHit(): void {
    this.hits++
  }

  recordMiss(): void {
    this.misses++
  }
}

// Global cache instances for different data types
export const meshDataCache = new LRUCacheManager<string, any>(
  50 * 1024 * 1024, // 50MB for mesh data
  20, // Max 20 mesh items
  86400000 // 24 hours
)

export const salesDataCache = new LRUCacheManager<string, any>(
  200 * 1024 * 1024, // 200MB for sales data
  12, // Max 12 months
  3600000 // 1 hour
)

export const geoJSONCache = new LRUCacheManager<string, any>(
  30 * 1024 * 1024, // 30MB for GeoJSON
  10, // Max 10 items
  86400000 // 24 hours
)
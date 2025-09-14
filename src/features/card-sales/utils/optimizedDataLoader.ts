/**
 * Optimized Data Loader with Binary Format and LRU Cache
 * Provides high-performance data loading for time series visualization
 */

import { loadSalesData } from './salesDataLoader'

// Binary data structure for optimized GPU transfer
export interface BinaryTimeSeriesData {
  month: string
  label: string
  dongCount: number
  dongCodes: Uint32Array // Dong codes
  salesValues: Float32Array // Sales values  
  bounds: {
    minSales: number
    maxSales: number
  }
}

// LRU Cache implementation for mesh and data
class LRUCache<K, V> {
  private maxSize: number
  private cache: Map<K, V>
  private accessOrder: K[]

  constructor(maxSize: number = 5) {
    this.maxSize = maxSize
    this.cache = new Map()
    this.accessOrder = []
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.updateAccessOrder(key)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.updateAccessOrder(key)
    } else {
      if (this.cache.size >= this.maxSize) {
        // Remove least recently used
        const lru = this.accessOrder.shift()
        if (lru !== undefined) {
          this.cache.delete(lru)
          console.log(`[LRUCache] Evicted: ${lru}`)
        }
      }
      this.accessOrder.push(key)
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }

  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  getStats(): { size: number; keys: K[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Performance metrics tracker
class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map()

  startTimer(label: string): () => void {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.recordMetric(label, duration)
      return duration
    }
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }
    const values = this.metrics.get(label)!
    values.push(value)
    // Keep only last 10 measurements
    if (values.length > 10) {
      values.shift()
    }
  }

  getAverageMetric(label: string): number {
    const values = this.metrics.get(label)
    if (!values || values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  getMetrics(): Record<string, { avg: number; last: number; count: number }> {
    const result: Record<string, { avg: number; last: number; count: number }> = {}
    this.metrics.forEach((values, label) => {
      if (values.length > 0) {
        result[label] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          last: values[values.length - 1],
          count: values.length
        }
      }
    })
    return result
  }
}

// Convert regular sales data to binary format for GPU efficiency
export function convertToBinaryFormat(
  dongSalesMap: Map<number, number>
): BinaryTimeSeriesData {
  const dongCount = dongSalesMap.size
  const dongCodes = new Uint32Array(dongCount)
  const salesValues = new Float32Array(dongCount)
  
  let minSales = Infinity
  let maxSales = -Infinity
  let index = 0
  
  dongSalesMap.forEach((sales, dongCode) => {
    dongCodes[index] = dongCode
    salesValues[index] = sales
    minSales = Math.min(minSales, sales)
    maxSales = Math.max(maxSales, sales)
    index++
  })
  
  return {
    month: '',
    label: '',
    dongCount,
    dongCodes,
    salesValues,
    bounds: {
      minSales: minSales === Infinity ? 0 : minSales,
      maxSales: maxSales === -Infinity ? 0 : maxSales
    }
  }
}

// Optimized data loader with caching and lazy loading
export class OptimizedTimeSeriesLoader {
  private dataCache: LRUCache<string, BinaryTimeSeriesData>
  private loadingPromises: Map<string, Promise<BinaryTimeSeriesData | null>>
  private performanceTracker: PerformanceTracker
  private preloadQueue: Set<string>
  private isPreloading: boolean = false

  constructor(cacheSize: number = 5) {
    this.dataCache = new LRUCache(cacheSize)
    this.loadingPromises = new Map()
    this.performanceTracker = new PerformanceTracker()
    this.preloadQueue = new Set()
  }

  // Load data for a specific month with caching
  async loadMonth(month: string, priority: 'high' | 'low' = 'high'): Promise<BinaryTimeSeriesData | null> {
    const stopTimer = this.performanceTracker.startTimer(`load_${month}`)
    
    // Check cache first
    const cached = this.dataCache.get(month)
    if (cached) {
      const duration = stopTimer()
      console.log(`[OptimizedLoader] Cache hit for ${month}`)
      return cached
    }
    
    // Check if already loading
    if (this.loadingPromises.has(month)) {
      console.log(`[OptimizedLoader] Waiting for existing load of ${month}`)
      return this.loadingPromises.get(month)!
    }
    
    // Start new load
    const loadPromise = this.loadMonthData(month)
    this.loadingPromises.set(month, loadPromise)
    
    try {
      const data = await loadPromise
      if (data) {
        this.dataCache.set(month, data)
        const duration = stopTimer()
        console.log(`[OptimizedLoader] Loaded ${month}`)
      }
      return data
    } finally {
      this.loadingPromises.delete(month)
    }
  }

  // Internal method to load and convert data
  private async loadMonthData(month: string): Promise<BinaryTimeSeriesData | null> {
    try {
      const salesData = await loadSalesData(month)
      
      if (!salesData || salesData.size === 0) {
        console.warn(`[OptimizedLoader] No data for ${month}`)
        return null
      }
      
      const binaryData = convertToBinaryFormat(salesData)
      binaryData.month = month
      binaryData.label = this.getMonthLabel(month)
      
      return binaryData
    } catch (error) {
      console.error(`[OptimizedLoader] Failed to load ${month}:`, error)
      return null
    }
  }

  // Preload adjacent months in background (disabled by default to prevent auto-loading)
  async preloadAdjacent(currentMonth: string, enabled: boolean = false): Promise<void> {
    // Disabled by default to prevent unnecessary background processing
    if (!enabled) {
      console.log('[OptimizedLoader] Preloading disabled - skipping adjacent months')
      return
    }
    
    if (this.isPreloading) return
    
    this.isPreloading = true
    const year = parseInt(currentMonth.slice(0, 4))
    const month = parseInt(currentMonth.slice(4))
    
    // Calculate adjacent months
    const prevMonth = month > 1 
      ? `${year}${(month - 1).toString().padStart(2, '0')}`
      : `${year - 1}12`
    
    const nextMonth = month < 12
      ? `${year}${(month + 1).toString().padStart(2, '0')}`
      : `${year + 1}01`
    
    // Add to preload queue
    this.preloadQueue.add(prevMonth)
    this.preloadQueue.add(nextMonth)
    
    // Use requestIdleCallback for background loading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        for (const month of this.preloadQueue) {
          if (!this.dataCache.has(month)) {
            console.log(`[OptimizedLoader] Preloading ${month}`)
            await this.loadMonth(month, 'low')
          }
          this.preloadQueue.delete(month)
        }
        this.isPreloading = false
      }, { timeout: 2000 })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(async () => {
        for (const month of this.preloadQueue) {
          if (!this.dataCache.has(month)) {
            await this.loadMonth(month, 'low')
          }
          this.preloadQueue.delete(month)
        }
        this.isPreloading = false
      }, 100)
    }
  }

  // Load multiple months in parallel
  async loadMonthsParallel(months: string[]): Promise<(BinaryTimeSeriesData | null)[]> {
    const stopTimer = this.performanceTracker.startTimer('load_parallel')
    
    const promises = months.map(month => this.loadMonth(month))
    const results = await Promise.all(promises)
    
    const duration = stopTimer()
    console.log(`[OptimizedLoader] Loaded ${months.length} months in parallel`)
    
    return results
  }

  // Get available months (2024 data)
  getAvailableMonths(): string[] {
    const months: string[] = []
    for (let i = 1; i <= 12; i++) {
      months.push(`2024${i.toString().padStart(2, '0')}`)
    }
    return months
  }

  // Convert month code to display label
  private getMonthLabel(monthCode: string): string {
    const year = monthCode.slice(0, 4)
    const month = parseInt(monthCode.slice(4))
    return `${year}년 ${month}월`
  }

  // Clear cache
  clearCache(): void {
    this.dataCache.clear()
    this.loadingPromises.clear()
    this.preloadQueue.clear()
    console.log('[OptimizedLoader] Cache cleared')
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      cache: this.dataCache.getStats(),
      metrics: this.performanceTracker.getMetrics(),
      preloadQueue: Array.from(this.preloadQueue)
    }
  }

  // Create binary data for direct GPU upload (deck.gl format)
  createGPUData(binaryData: BinaryTimeSeriesData): {
    length: number
    attributes: {
      dongCode: { value: Uint32Array; size: number }
      salesValue: { value: Float32Array; size: number }
    }
  } {
    return {
      length: binaryData.dongCount,
      attributes: {
        dongCode: { value: binaryData.dongCodes, size: 1 },
        salesValue: { value: binaryData.salesValues, size: 1 }
      }
    }
  }
}

// Singleton instance
let loaderInstance: OptimizedTimeSeriesLoader | null = null

export function getOptimizedLoader(cacheSize: number = 5): OptimizedTimeSeriesLoader {
  if (!loaderInstance) {
    loaderInstance = new OptimizedTimeSeriesLoader(cacheSize)
  }
  return loaderInstance
}

// Helper to convert binary data back to Map for compatibility
export function binaryToMap(binaryData: BinaryTimeSeriesData): Map<number, number> {
  const map = new Map<number, number>()
  for (let i = 0; i < binaryData.dongCount; i++) {
    map.set(binaryData.dongCodes[i], binaryData.salesValues[i])
  }
  return map
}
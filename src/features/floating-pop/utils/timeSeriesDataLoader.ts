/**
 * Time Series Data Loader
 * Loads and manages monthly card sales data for animation
 */

import { loadSalesData } from './salesDataLoader'

interface TimeSeriesData {
  month: string // YYYYMM format
  dongSalesMap: Map<number, number>
  label: string // Display label like "2024년 1월"
}

/**
 * Get available months from the data directory
 */
export function getAvailableMonths(): string[] {
  // Based on the project structure, we have data from 202401 to 202412
  const months: string[] = []
  for (let i = 1; i <= 12; i++) {
    const month = i.toString().padStart(2, '0')
    months.push(`2024${month}`)
  }
  return months
}

/**
 * Convert month code to display label
 */
export function getMonthLabel(monthCode: string): string {
  const year = monthCode.slice(0, 4)
  const month = parseInt(monthCode.slice(4))
  return `${year}년 ${month}월`
}

/**
 * Load all monthly data for time series animation
 */
export async function loadTimeSeriesData(): Promise<TimeSeriesData[]> {
  const availableMonths = getAvailableMonths()
  console.log('[TimeSeriesLoader] Loading data for months:', availableMonths)
  
  const results: TimeSeriesData[] = []
  
  // Load data for each month
  for (const month of availableMonths) {
    try {
      console.log(`[TimeSeriesLoader] Loading data for ${month}`)
      const salesData = await loadSalesData(month)
      
      if (salesData && salesData.size > 0) {
        results.push({
          month,
          dongSalesMap: salesData,
          label: getMonthLabel(month)
        })
        console.log(`[TimeSeriesLoader] ✓ ${month}: ${salesData.size} dongs loaded`)
      } else {
        console.warn(`[TimeSeriesLoader] ⚠ ${month}: No data loaded`)
      }
    } catch (error) {
      console.error(`[TimeSeriesLoader] ✗ ${month}: Failed to load`, error)
    }
  }
  
  console.log(`[TimeSeriesLoader] Loaded ${results.length}/${availableMonths.length} months`)
  return results
}

/**
 * Load time series data in parallel for better performance
 */
export async function loadTimeSeriesDataParallel(): Promise<TimeSeriesData[]> {
  const availableMonths = getAvailableMonths()
  console.log('[TimeSeriesLoader] Loading data in parallel for months:', availableMonths)
  
  // Create loading promises for all months
  const loadingPromises = availableMonths.map(async (month) => {
    try {
      console.log(`[TimeSeriesLoader] Starting load for ${month}`)
      const salesData = await loadSalesData(month)
      
      if (salesData && salesData.size > 0) {
        return {
          month,
          dongSalesMap: salesData,
          label: getMonthLabel(month)
        }
      } else {
        console.warn(`[TimeSeriesLoader] ⚠ ${month}: No data loaded`)
        return null
      }
    } catch (error) {
      console.error(`[TimeSeriesLoader] ✗ ${month}: Failed to load`, error)
      return null
    }
  })
  
  // Wait for all promises to complete
  const results = await Promise.all(loadingPromises)
  
  // Filter out failed loads
  const validResults = results.filter((result): result is TimeSeriesData => result !== null)
  
  console.log(`[TimeSeriesLoader] Loaded ${validResults.length}/${availableMonths.length} months in parallel`)
  return validResults
}

/**
 * Progressive loading with callback for progress tracking
 */
export async function loadTimeSeriesDataProgressive(
  onProgress?: (loaded: number, total: number, currentMonth: string) => void
): Promise<TimeSeriesData[]> {
  const availableMonths = getAvailableMonths()
  const results: TimeSeriesData[] = []
  let loaded = 0
  
  console.log('[TimeSeriesLoader] Loading data progressively for months:', availableMonths)
  
  for (const month of availableMonths) {
    try {
      if (onProgress) {
        onProgress(loaded, availableMonths.length, month)
      }
      
      const salesData = await loadSalesData(month)
      
      if (salesData && salesData.size > 0) {
        results.push({
          month,
          dongSalesMap: salesData,
          label: getMonthLabel(month)
        })
        loaded++
        console.log(`[TimeSeriesLoader] ✓ ${month}: ${salesData.size} dongs loaded (${loaded}/${availableMonths.length})`)
      } else {
        console.warn(`[TimeSeriesLoader] ⚠ ${month}: No data loaded`)
      }
    } catch (error) {
      console.error(`[TimeSeriesLoader] ✗ ${month}: Failed to load`, error)
    }
    
    // Small delay to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  if (onProgress) {
    onProgress(loaded, availableMonths.length, 'completed')
  }
  
  console.log(`[TimeSeriesLoader] Progressive loading complete: ${results.length}/${availableMonths.length} months`)
  return results
}

/**
 * Calculate statistics across all months
 */
export function calculateTimeSeriesStats(timeSeriesData: TimeSeriesData[]): {
  minSales: number
  maxSales: number
  totalMonths: number
  avgSalesPerMonth: number
  totalDongs: Set<number>
} {
  let minSales = Infinity
  let maxSales = -Infinity
  let totalSales = 0
  let totalEntries = 0
  const allDongs = new Set<number>()
  
  timeSeriesData.forEach(({ dongSalesMap }) => {
    dongSalesMap.forEach((sales, dongCode) => {
      minSales = Math.min(minSales, sales)
      maxSales = Math.max(maxSales, sales)
      totalSales += sales
      totalEntries++
      allDongs.add(dongCode)
    })
  })
  
  return {
    minSales: minSales === Infinity ? 0 : minSales,
    maxSales: maxSales === -Infinity ? 0 : maxSales,
    totalMonths: timeSeriesData.length,
    avgSalesPerMonth: totalEntries > 0 ? totalSales / totalEntries : 0,
    totalDongs: allDongs
  }
}

/**
 * Find peak sales month and dong
 */
export function findPeakSales(timeSeriesData: TimeSeriesData[]): {
  peakMonth: string
  peakDong: number
  peakSales: number
} | null {
  let peakSales = 0
  let peakMonth = ''
  let peakDong = 0
  
  timeSeriesData.forEach(({ month, dongSalesMap }) => {
    dongSalesMap.forEach((sales, dongCode) => {
      if (sales > peakSales) {
        peakSales = sales
        peakMonth = month
        peakDong = dongCode
      }
    })
  })
  
  if (peakSales === 0) {
    return null
  }
  
  return { peakMonth, peakDong, peakSales }
}

/**
 * Cache for loaded time series data
 */
class TimeSeriesCache {
  private cache: Map<string, TimeSeriesData[]> = new Map()
  private loadingPromise: Promise<TimeSeriesData[]> | null = null
  
  async getData(useParallel: boolean = true): Promise<TimeSeriesData[]> {
    const cacheKey = useParallel ? 'parallel' : 'sequential'
    
    // Return cached data if available
    if (this.cache.has(cacheKey)) {
      console.log('[TimeSeriesCache] Returning cached data')
      return this.cache.get(cacheKey)!
    }
    
    // Return existing loading promise if in progress
    if (this.loadingPromise) {
      console.log('[TimeSeriesCache] Waiting for existing load to complete')
      return this.loadingPromise
    }
    
    // Start new loading
    this.loadingPromise = useParallel 
      ? loadTimeSeriesDataParallel() 
      : loadTimeSeriesData()
    
    try {
      const data = await this.loadingPromise
      this.cache.set(cacheKey, data)
      return data
    } finally {
      this.loadingPromise = null
    }
  }
  
  clear(): void {
    this.cache.clear()
    this.loadingPromise = null
  }
  
  getStats(): { cacheSize: number; hasLoading: boolean } {
    return {
      cacheSize: this.cache.size,
      hasLoading: this.loadingPromise !== null
    }
  }
}

// Singleton cache instance
const timeSeriesCache = new TimeSeriesCache()

/**
 * Get cached time series data
 */
export async function getCachedTimeSeriesData(useParallel: boolean = true): Promise<TimeSeriesData[]> {
  return timeSeriesCache.getData(useParallel)
}

/**
 * Clear time series data cache
 */
export function clearTimeSeriesCache(): void {
  timeSeriesCache.clear()
}

/**
 * Get cache statistics
 */
export function getTimeSeriesCacheStats() {
  return timeSeriesCache.getStats()
}
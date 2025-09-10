/**
 * Sales Data Loader
 * Loads monthly card sales data from optimized JSON files
 */

interface DailyDongData {
  totalSales: number
  salesByType: Record<string, number>
  weather?: {
    avgTemp: number
    maxTemp: number
    minTemp: number
    avgHumidity: number
    discomfortIndex: number
    tempGroup: string
  }
  rank?: number
  percentile?: number
  colorIndex?: number
  height?: number
  formattedSales?: string
  rankLabel?: string
}

interface MonthlyDataFile {
  month: string
  dongCount: number
  metadata: {
    processedAt: string
    themes: string[]
    heightRange: [number, number]
    version: string
    maxSales: number
    minSales: number
    totalDays: number
  }
  days: Record<string, Record<number, DailyDongData>>
}

/**
 * Convert month code from YYYYMM to YYYY-MM format
 */
function formatMonthCode(monthCode: string): string {
  if (monthCode.length === 6) {
    const year = monthCode.slice(0, 4)
    const month = monthCode.slice(4)
    return `${year}-${month}`
  }
  return monthCode
}

/**
 * Load sales data for a specific month
 * @param monthCode Month in YYYYMM format (e.g., "202401")
 * @returns Map of dong code to total sales amount
 */
export async function loadSalesData(monthCode: string): Promise<Map<number, number>> {
  try {
    const formattedMonth = formatMonthCode(monthCode)
    const url = `/data/optimized/monthly/sales-${formattedMonth}.json`
    
    console.log(`[SalesDataLoader] Loading data for ${monthCode} from ${url}`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data: MonthlyDataFile = await response.json()
    const salesMap = new Map<number, number>()
    
    // Aggregate sales across all days for each dong
    const dongTotals = new Map<number, number>()
    
    Object.values(data.days).forEach(dayData => {
      Object.entries(dayData).forEach(([dongCodeStr, dongData]) => {
        const dongCode = parseInt(dongCodeStr)
        const currentTotal = dongTotals.get(dongCode) || 0
        dongTotals.set(dongCode, currentTotal + dongData.totalSales)
      })
    })
    
    // Convert to final sales map
    dongTotals.forEach((totalSales, dongCode) => {
      salesMap.set(dongCode, totalSales)
    })
    
    if (salesMap.size > 0) {
      const salesValues = Array.from(salesMap.values())
      const minSales = Math.min(...salesValues)
      const maxSales = Math.max(...salesValues)
      console.log(`[SalesDataLoader] ✓ Loaded data for ${monthCode}: ${salesMap.size} dongs, total sales range: ${minSales.toLocaleString()} - ${maxSales.toLocaleString()}`)
    } else {
      console.log(`[SalesDataLoader] ✓ Loaded data for ${monthCode}: 0 dongs`)
    }
    
    return salesMap
    
  } catch (error) {
    console.error(`[SalesDataLoader] ✗ Failed to load data for ${monthCode}:`, error)
    return new Map<number, number>()
  }
}

/**
 * Load daily sales data for a specific month and day
 * @param monthCode Month in YYYYMM format
 * @param day Day of the month (1-31)
 * @returns Map of dong code to total sales amount for that day
 */
export async function loadDailySalesData(monthCode: string, day: number): Promise<Map<number, number>> {
  try {
    const formattedMonth = formatMonthCode(monthCode)
    const url = `/data/optimized/monthly/sales-${formattedMonth}.json`
    
    console.log(`[SalesDataLoader] Loading daily data for ${monthCode}-${day} from ${url}`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data: MonthlyDataFile = await response.json()
    const salesMap = new Map<number, number>()
    
    const dayKey = day.toString()
    const dayData = data.days[dayKey]
    
    if (dayData) {
      Object.entries(dayData).forEach(([dongCodeStr, dongData]) => {
        const dongCode = parseInt(dongCodeStr)
        salesMap.set(dongCode, dongData.totalSales)
      })
    }
    
    console.log(`[SalesDataLoader] ✓ Loaded daily data for ${monthCode}-${day}: ${salesMap.size} dongs`)
    
    return salesMap
    
  } catch (error) {
    console.error(`[SalesDataLoader] ✗ Failed to load daily data for ${monthCode}-${day}:`, error)
    return new Map<number, number>()
  }
}

/**
 * Get metadata for a specific month
 */
export async function getMonthMetadata(monthCode: string): Promise<MonthlyDataFile['metadata'] | null> {
  try {
    const formattedMonth = formatMonthCode(monthCode)
    const url = `/data/optimized/monthly/sales-${formattedMonth}.json`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      return null
    }
    
    const data: MonthlyDataFile = await response.json()
    return data.metadata
    
  } catch (error) {
    console.error(`[SalesDataLoader] Failed to get metadata for ${monthCode}:`, error)
    return null
  }
}

/**
 * Check if sales data exists for a specific month
 */
export async function hasSalesData(monthCode: string): Promise<boolean> {
  try {
    const formattedMonth = formatMonthCode(monthCode)
    const url = `/data/optimized/monthly/sales-${formattedMonth}.json`
    
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
    
  } catch (error) {
    return false
  }
}

/**
 * Get all available months
 */
export async function getAvailableMonths(): Promise<string[]> {
  const months: string[] = []
  
  // Check 2024 months (01-12)
  for (let i = 1; i <= 12; i++) {
    const month = i.toString().padStart(2, '0')
    const monthCode = `2024${month}`
    
    if (await hasSalesData(monthCode)) {
      months.push(monthCode)
    }
  }
  
  return months
}
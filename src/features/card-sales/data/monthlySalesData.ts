export interface MonthlySalesDataPoint {
  month: string
  total: number
  categories: { [key: string]: number }
}

/**
 * CSV 파일에서 월별 매출 데이터를 파싱
 */
function parseMonthlySalesCSV(csvText: string): MonthlySalesDataPoint[] {
  // BOM 제거
  const cleanText = csvText.replace(/^\uFEFF/, '')
  const lines = cleanText.trim().split('\n')
  
  if (lines.length < 2) {
    console.error('[MonthlySales] CSV file has insufficient data')
    return []
  }
  
  // 헤더 파싱 (첫 번째 줄)
  const headers = lines[0].split(',').map(h => h.trim())
  console.log('[MonthlySales] CSV Headers:', headers)
  
  // 데이터 파싱
  const monthlyData: MonthlySalesDataPoint[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = line.split(',')
    if (values.length < headers.length) {
      console.warn(`[MonthlySales] Line ${i} has insufficient columns`)
      continue
    }
    
    const month = values[0].trim()
    const categories: { [key: string]: number } = {}
    
    // 전체 매출액 (두 번째 컬럼)
    const total = parseFloat(values[1]) || 0
    
    // 각 업종별 매출액
    for (let j = 2; j < headers.length; j++) {
      const categoryName = headers[j].trim()  // 공백 제거
      const value = parseFloat(values[j]) || 0
      categories[categoryName] = value
    }
    
    monthlyData.push({
      month,
      total,
      categories
    })
  }
  
  console.log('[MonthlySales] Parsed data points:', monthlyData.length)
  if (monthlyData.length > 0) {
    console.log('[MonthlySales] First data point categories:', Object.keys(monthlyData[0].categories))
    console.log('[MonthlySales] Sample category values:', monthlyData[0].categories)
  }
  return monthlyData
}

/**
 * CSV 파일에서 월별 매출 데이터 로드
 */
export async function loadMonthlySalesData(): Promise<MonthlySalesDataPoint[]> {
  try {
    console.log('[MonthlySales] Loading CSV data from /data/charts/monthly_sales.csv')
    const response = await fetch('/data/charts/monthly_sales.csv')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const text = await response.text()
    const data = parseMonthlySalesCSV(text)
    
    console.log('[MonthlySales] Successfully loaded monthly sales data:', data)
    return data
  } catch (error) {
    console.error('[MonthlySales] Failed to load CSV data:', error)
    return []
  }
}

/**
 * 업종 목록 상수
 */
export const SALES_CATEGORIES = [
  '전체',
  '마트/생활잡화',
  '약국',
  '음/식료품',
  '일식/양식/중식',
  '제과/커피/패스트푸드',
  '편의점',
  '한식',
  '병원',
  '숙박',
  '오락/공연/서점',
  '스포츠/헬스시설',
  '패션/잡화',
  '레저/문화용품',
  '백화점',
  '여행'
] as const
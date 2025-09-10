import type { BoxPlotDataPoint, BoxPlotStats } from '../data/boxplotData'

// Recharts ComposedChart용 데이터 형식
export interface ProcessedBoxPlotData {
  category: string
  // 각 날씨별 박스플롯 데이터
  coldData: BoxPlotStats
  mildData: BoxPlotStats
  hotData: BoxPlotStats
  // Y축 범위 계산용
  minValue: number
  maxValue: number
}

// 박스플롯 데이터를 Recharts 형식으로 변환
export function processForRecharts(data: BoxPlotDataPoint[]): ProcessedBoxPlotData[] {
  return data.map(item => {
    // 모든 값 중 최소/최대 찾기 (Y축 범위 설정용)
    const allValues = [
      item.cold.min, item.cold.max,
      item.mild.min, item.mild.max,
      item.hot.min, item.hot.max
    ]
    
    return {
      category: item.category,
      coldData: item.cold,
      mildData: item.mild,
      hotData: item.hot,
      minValue: Math.min(...allValues),
      maxValue: Math.max(...allValues)
    }
  })
}

// 플랫한 데이터 구조 (ErrorBar 방식용)
export interface FlatBoxPlotData {
  category: string
  
  // 한파 데이터
  coldMin: number
  coldQ1: number
  coldMedian: number
  coldQ3: number
  coldMax: number
  coldMean: number
  coldLowerWhisker: number
  coldUpperWhisker: number
  coldError: [number, number]  // ErrorBar용 [lower, upper]
  
  // 온화 데이터
  mildMin: number
  mildQ1: number
  mildMedian: number
  mildQ3: number
  mildMax: number
  mildMean: number
  mildLowerWhisker: number
  mildUpperWhisker: number
  mildError: [number, number]
  
  // 폭염 데이터
  hotMin: number
  hotQ1: number
  hotMedian: number
  hotQ3: number
  hotMax: number
  hotMean: number
  hotLowerWhisker: number
  hotUpperWhisker: number
  hotError: [number, number]
}

// 플랫한 구조로 변환 (ErrorBar 사용을 위해)
export function processForErrorBar(data: BoxPlotDataPoint[]): FlatBoxPlotData[] {
  return data.map(item => ({
    category: item.category,
    
    // 한파
    coldMin: item.cold.min,
    coldQ1: item.cold.Q1,
    coldMedian: item.cold.median,
    coldQ3: item.cold.Q3,
    coldMax: item.cold.max,
    coldMean: item.cold.mean,
    coldLowerWhisker: item.cold.lowerWhisker,
    coldUpperWhisker: item.cold.upperWhisker,
    coldError: [
      item.cold.median - item.cold.lowerWhisker,
      item.cold.upperWhisker - item.cold.median
    ],
    
    // 온화
    mildMin: item.mild.min,
    mildQ1: item.mild.Q1,
    mildMedian: item.mild.median,
    mildQ3: item.mild.Q3,
    mildMax: item.mild.max,
    mildMean: item.mild.mean,
    mildLowerWhisker: item.mild.lowerWhisker,
    mildUpperWhisker: item.mild.upperWhisker,
    mildError: [
      item.mild.median - item.mild.lowerWhisker,
      item.mild.upperWhisker - item.mild.median
    ],
    
    // 폭염
    hotMin: item.hot.min,
    hotQ1: item.hot.Q1,
    hotMedian: item.hot.median,
    hotQ3: item.hot.Q3,
    hotMax: item.hot.max,
    hotMean: item.hot.mean,
    hotLowerWhisker: item.hot.lowerWhisker,
    hotUpperWhisker: item.hot.upperWhisker,
    hotError: [
      item.hot.median - item.hot.lowerWhisker,
      item.hot.upperWhisker - item.hot.median
    ]
  }))
}

// 매출액 포맷팅 (원 단위)
export function formatSalesAmount(value: number): string {
  if (value >= 1e8) {
    // 1억 이상
    return `${(value / 1e8).toFixed(1)}억`
  } else if (value >= 1e7) {
    // 천만 이상
    return `${(value / 1e7).toFixed(1)}천만`
  } else if (value >= 1e4) {
    // 만원 이상
    return `${(value / 1e4).toFixed(0)}만`
  }
  return value.toLocaleString('ko-KR')
}

// 상위 N개 업종 필터링 (매출 기준)
export function filterTopCategories(
  data: BoxPlotDataPoint[], 
  topN: number = 10,
  criterion: 'mean' | 'median' = 'median'
): BoxPlotDataPoint[] {
  return data
    .sort((a, b) => {
      // 온화한 날씨 기준으로 정렬
      const aValue = criterion === 'mean' ? a.mild.mean : a.mild.median
      const bValue = criterion === 'mean' ? b.mild.mean : b.mild.median
      return bValue - aValue
    })
    .slice(0, topN)
}

// 날씨별 변화율 계산
export function calculateWeatherImpact(data: BoxPlotDataPoint): {
  coldChange: number  // 한파 vs 온화 변화율
  hotChange: number   // 폭염 vs 온화 변화율
} {
  const baseValue = data.mild.median
  
  return {
    coldChange: ((data.cold.median - baseValue) / baseValue) * 100,
    hotChange: ((data.hot.median - baseValue) / baseValue) * 100
  }
}

// 박스플롯 Y축 위치 계산 (로그 스케일 대응)
export function calculateYPosition(
  value: number,
  minValue: number,
  maxValue: number,
  height: number,
  useLogScale: boolean = false
): number {
  if (useLogScale) {
    // 로그 스케일
    const logMin = Math.log10(Math.max(1, minValue))
    const logMax = Math.log10(Math.max(1, maxValue))
    const logValue = Math.log10(Math.max(1, value))
    
    return height - ((logValue - logMin) / (logMax - logMin)) * height
  } else {
    // 선형 스케일
    return height - ((value - minValue) / (maxValue - minValue)) * height
  }
}

// 툴팁용 통계 요약
export function getStatsSummary(stats: BoxPlotStats): string {
  return `
최소값: ${formatSalesAmount(stats.min)}
Q1: ${formatSalesAmount(stats.Q1)}
중앙값: ${formatSalesAmount(stats.median)}
Q3: ${formatSalesAmount(stats.Q3)}
최대값: ${formatSalesAmount(stats.max)}
평균: ${formatSalesAmount(stats.mean)}
  `.trim()
}

// 업종명 줄임 처리 (X축 레이블용)
export function truncateCategoryName(name: string, maxLength: number = 10): string {
  if (name.length <= maxLength) return name
  
  // 슬래시가 있으면 첫 부분만 사용
  if (name.includes('/')) {
    return name.split('/')[0]
  }
  
  // 너무 길면 줄임표 추가
  return name.substring(0, maxLength - 1) + '…'
}

// 날씨별 데이터 구조 (온도 그룹별 박스플롯)
export interface WeatherGroupBoxPlotData {
  temperatureGroup: '한파' | '온화' | '폭염'
  min: number
  Q1: number
  median: number
  Q3: number
  max: number
  mean: number
  lowerWhisker: number  // min within 1.5*IQR
  upperWhisker: number  // max within 1.5*IQR
  error: [number, number]  // For ErrorBar
}

// 특정 업종의 박스플롯 데이터를 날씨별로 반환
export function getBoxPlotByCategory(data: BoxPlotDataPoint[], categoryName: string): WeatherGroupBoxPlotData[] | null {
  const categoryData = data.find(item => item.category === categoryName)
  
  if (!categoryData) {
    return null
  }
  
  // 해당 업종의 실제 박스플롯 통계값을 사용
  return [
    {
      temperatureGroup: '한파',
      min: categoryData.cold.min,
      Q1: categoryData.cold.Q1,
      median: categoryData.cold.median,
      Q3: categoryData.cold.Q3,
      max: categoryData.cold.max,
      mean: categoryData.cold.mean,
      lowerWhisker: categoryData.cold.lowerWhisker,
      upperWhisker: categoryData.cold.upperWhisker,
      error: [
        categoryData.cold.median - categoryData.cold.lowerWhisker,
        categoryData.cold.upperWhisker - categoryData.cold.median
      ]
    },
    {
      temperatureGroup: '온화',
      min: categoryData.mild.min,
      Q1: categoryData.mild.Q1,
      median: categoryData.mild.median,
      Q3: categoryData.mild.Q3,
      max: categoryData.mild.max,
      mean: categoryData.mild.mean,
      lowerWhisker: categoryData.mild.lowerWhisker,
      upperWhisker: categoryData.mild.upperWhisker,
      error: [
        categoryData.mild.median - categoryData.mild.lowerWhisker,
        categoryData.mild.upperWhisker - categoryData.mild.median
      ]
    },
    {
      temperatureGroup: '폭염',
      min: categoryData.hot.min,
      Q1: categoryData.hot.Q1,
      median: categoryData.hot.median,
      Q3: categoryData.hot.Q3,
      max: categoryData.hot.max,
      mean: categoryData.hot.mean,
      lowerWhisker: categoryData.hot.lowerWhisker,
      upperWhisker: categoryData.hot.upperWhisker,
      error: [
        categoryData.hot.median - categoryData.hot.lowerWhisker,
        categoryData.hot.upperWhisker - categoryData.hot.median
      ]
    }
  ]
}

// 모든 업종 이름 가져오기
export function getAllCategoryNames(data: BoxPlotDataPoint[]): string[] {
  return data.map(item => item.category).sort()
}

// 모든 업종 데이터를 날씨 그룹별로 집계
export function aggregateByWeatherGroup(data: BoxPlotDataPoint[]): WeatherGroupBoxPlotData[] {
  // 각 날씨별로 모든 업종의 평균 매출액을 수집
  const coldValues: number[] = []
  const mildValues: number[] = []
  const hotValues: number[] = []
  
  // 모든 업종의 평균 매출액(mean) 수집 - 각 업종이 하나의 데이터 포인트
  data.forEach(item => {
    // 각 업종의 평균 매출액을 사용
    coldValues.push(item.cold.mean)
    mildValues.push(item.mild.mean)
    hotValues.push(item.hot.mean)
  })
  
  // 각 날씨 그룹별로 박스플롯 통계 계산
  const calculateBoxPlotStats = (values: number[]): Omit<WeatherGroupBoxPlotData, 'temperatureGroup'> => {
    const sorted = values.sort((a, b) => a - b)
    const n = sorted.length
    
    // 사분위수 계산
    const Q1Index = Math.floor(n * 0.25)
    const medianIndex = Math.floor(n * 0.5)
    const Q3Index = Math.floor(n * 0.75)
    
    const Q1 = sorted[Q1Index]
    const median = sorted[medianIndex]
    const Q3 = sorted[Q3Index]
    const IQR = Q3 - Q1
    
    // 1.5*IQR 범위 내의 min/max (outlier 제외)
    const lowerBound = Q1 - 1.5 * IQR
    const upperBound = Q3 + 1.5 * IQR
    
    const validValues = sorted.filter(v => v >= lowerBound && v <= upperBound)
    const lowerWhisker = validValues.length > 0 ? validValues[0] : sorted[0]
    const upperWhisker = validValues.length > 0 ? validValues[validValues.length - 1] : sorted[sorted.length - 1]
    
    // 평균 계산
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    
    return {
      min: sorted[0],
      Q1,
      median,
      Q3,
      max: sorted[sorted.length - 1],
      mean,
      lowerWhisker,
      upperWhisker,
      error: [median - lowerWhisker, upperWhisker - median]
    }
  }
  
  // 로그 출력으로 데이터 확인
  console.log('[BoxPlot Aggregation] Cold values:', coldValues.length, 'items')
  console.log('[BoxPlot Aggregation] Mild values:', mildValues.length, 'items')
  console.log('[BoxPlot Aggregation] Hot values:', hotValues.length, 'items')
  
  return [
    {
      temperatureGroup: '한파',
      ...calculateBoxPlotStats(coldValues)
    },
    {
      temperatureGroup: '온화',
      ...calculateBoxPlotStats(mildValues)
    },
    {
      temperatureGroup: '폭염',
      ...calculateBoxPlotStats(hotValues)
    }
  ]
}

// 데이터 정렬 옵션
export type SortOption = 'name' | 'cold' | 'mild' | 'hot' | 'variance'

export function sortBoxPlotData(
  data: BoxPlotDataPoint[],
  sortBy: SortOption = 'mild'
): BoxPlotDataPoint[] {
  const sorted = [...data]
  
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.category.localeCompare(b.category))
    
    case 'cold':
      return sorted.sort((a, b) => b.cold.median - a.cold.median)
    
    case 'mild':
      return sorted.sort((a, b) => b.mild.median - a.mild.median)
    
    case 'hot':
      return sorted.sort((a, b) => b.hot.median - a.hot.median)
    
    case 'variance':
      // 날씨별 변동성이 큰 순서로 정렬
      return sorted.sort((a, b) => {
        const aVariance = Math.abs(a.cold.median - a.hot.median)
        const bVariance = Math.abs(b.cold.median - b.hot.median)
        return bVariance - aVariance
      })
    
    default:
      return sorted
  }
}
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
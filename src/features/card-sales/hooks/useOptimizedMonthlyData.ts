/**
 * 하이브리드 최적화 데이터 로딩 Hook
 * 정적 지오메트리 + 월별 매출/기상 데이터 분리 전략
 */

import { useState, useEffect, useMemo, useCallback } from 'react'

interface StaticGeometry {
  dongCode: number
  dongName: string
  sggName: string
  sggCode: number
  centroid: [number, number]
  boundingBox: [number, number, number, number]
  coordinates: number[][][]
}

interface DailyDongData {
  totalSales: number
  salesByType: Record<string, number>
  weather: {
    avgTemp: number
    maxTemp: number
    minTemp: number
    avgHumidity: number
    discomfortIndex: number
    tempGroup: string
  }
  rank: number
  percentile: number
  colorIndex: number
  height: number
  formattedSales: string
  rankLabel: string
}

interface MonthlyOptimizedData {
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

// 합성된 최종 feature 타입 (기존 OptimizedDongFeature와 호환)
export interface OptimizedDongFeature {
  dongCode: number
  dongName: string
  sggName: string
  sggCode: number
  // 사전 계산된 값들
  height: number
  totalSales: number
  salesByType: Record<string, number>
  percentile: number
  colorIndex: number
  fillColorRGB: {
    blue: number[]
    green: number[]
    purple: number[]
    orange: number[]
    bright: number[]
  }
  centroid: [number, number]
  boundingBox: [number, number, number, number]
  // 포맷된 표시값
  formattedSales: string
  rank: number
  rankLabel: string
  // 원본 geometry
  geometry: {
    type: string
    coordinates: number[][][]
  }
  // 기상 정보
  weather: {
    avgTemp: number
    maxTemp: number
    minTemp: number
    avgHumidity: number
    discomfortIndex: number
    tempGroup: string
  }
}

interface UseOptimizedMonthlyDataProps {
  selectedDate: string // YYYY-MM-DD format
  enabled?: boolean
}

interface UseOptimizedMonthlyDataReturn {
  // 기존 호환성을 위한 인터페이스 유지
  data: { features: OptimizedDongFeature[] } | null
  features: OptimizedDongFeature[] | null
  isLoading: boolean
  error: string | null
  dongMap: Map<number, OptimizedDongFeature> | null
  
  // 새로운 기능
  staticGeometry: StaticGeometry[] | null
  monthlyData: MonthlyOptimizedData | null
  availableMonths: string[]
}

// 색상 테마별 RGB 값 (기존과 동일)
const COLOR_THEMES = {
  blue: [
    [219, 234, 254], [147, 197, 253], [96, 165, 250],
    [59, 130, 246], [37, 99, 235], [29, 78, 216]
  ],
  green: [
    [209, 250, 229], [134, 239, 172], [74, 222, 128],
    [34, 197, 94], [22, 163, 74], [21, 128, 61]
  ],
  purple: [
    [233, 213, 255], [192, 132, 252], [168, 85, 247],
    [147, 51, 234], [126, 34, 206], [107, 33, 168]
  ],
  orange: [
    [254, 215, 170], [253, 186, 116], [251, 146, 60],
    [249, 115, 22], [234, 88, 12], [194, 65, 12]
  ],
  bright: [
    [255, 247, 237], [255, 237, 213], [254, 215, 170],
    [253, 186, 116], [251, 146, 60], [249, 115, 22]
  ]
}

// 색상 계산 함수
function calculateThemeColors(colorIndex: number): Record<string, number[]> {
  const colors: Record<string, number[]> = {}
  Object.entries(COLOR_THEMES).forEach(([theme, colorArray]) => {
    colors[theme] = colorArray[colorIndex] || colorArray[0]
  })
  return colors
}

// 전역 캐시
const staticGeometryCache = { data: null as StaticGeometry[] | null }
const monthlyDataCache = new Map<string, MonthlyOptimizedData>()

export function useOptimizedMonthlyData({
  selectedDate,
  enabled = true
}: UseOptimizedMonthlyDataProps): UseOptimizedMonthlyDataReturn {
  const [staticGeometry, setStaticGeometry] = useState<StaticGeometry[] | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyOptimizedData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableMonths] = useState<string[]>([
    '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
    '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
  ])
  
  // 날짜에서 월 추출
  const targetMonth = useMemo(() => {
    if (!selectedDate) return null
    // "2024-01-15" -> "2024-01"
    const month = selectedDate.substring(0, 7)
    console.log('[useOptimizedMonthlyData] Target month:', month, 'from selectedDate:', selectedDate)
    return month
  }, [selectedDate])
  
  // 날짜에서 일 추출
  const targetDay = useMemo(() => {
    if (!selectedDate) return null
    // "2024-01-15" -> "15"
    const day = selectedDate.substring(8, 10)
    console.log('[useOptimizedMonthlyData] Target day:', day, 'from selectedDate:', selectedDate)
    return day
  }, [selectedDate])

  // 1. 정적 지오메트리 로드 (한 번만)
  useEffect(() => {
    if (!enabled) return
    
    async function loadStaticGeometry() {
      // 캐시 확인
      if (staticGeometryCache.data) {
        setStaticGeometry(staticGeometryCache.data)
        return
      }
      
      try {
        setIsLoading(true)
        const response = await fetch('/data/optimized/geometry-static.json')
        
        if (!response.ok) {
          throw new Error(`정적 지오메트리 로드 실패: ${response.status}`)
        }
        
        const geometry: StaticGeometry[] = await response.json()
        staticGeometryCache.data = geometry
        setStaticGeometry(geometry)
        
        console.log(`[StaticGeometry] 로드 완료: ${geometry.length}개 동`)
      } catch (err) {
        console.error('[StaticGeometry] 로드 오류:', err)
        setError(err instanceof Error ? err.message : '정적 지오메트리 로드 실패')
      }
    }
    
    loadStaticGeometry()
  }, [enabled])

  // 2. 월별 데이터 로드
  useEffect(() => {
    console.log('[useOptimizedMonthlyData] Monthly data loading effect triggered:', {
      enabled,
      targetMonth,
      hasTargetMonth: !!targetMonth
    })
    
    if (!enabled || !targetMonth) {
      console.log('[useOptimizedMonthlyData] Monthly data loading skipped:', { enabled, targetMonth })
      return
    }
    
    async function loadMonthlyData() {
      // 캐시 확인
      if (targetMonth && monthlyDataCache.has(targetMonth)) {
        console.log(`[MonthlyData] 캐시에서 로드: ${targetMonth}`)
        setMonthlyData(monthlyDataCache.get(targetMonth)!)
        return
      }
      
      try {
        setIsLoading(true)
        setError(null)
        
        const url = `/data/optimized/monthly/sales-${targetMonth}.json`
        console.log(`[MonthlyData] Fetching URL: ${url}`)
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`월별 데이터 로드 실패: ${response.status} - ${url}`)
        }
        
        const data: MonthlyOptimizedData = await response.json()
        
        // 캐시 저장 (최대 3개월까지)
        if (monthlyDataCache.size >= 3) {
          const firstKey = monthlyDataCache.keys().next().value
          if (firstKey) {
            monthlyDataCache.delete(firstKey)
          }
        }
        if (targetMonth) {
          monthlyDataCache.set(targetMonth, data)
        }
        setMonthlyData(data)
        
        console.log(`[MonthlyData] 로드 완료: ${targetMonth} (${data.metadata.totalDays}일, ${data.dongCount}개 동)`)
      } catch (err) {
        console.error('[MonthlyData] 로드 오류:', err)
        setError(err instanceof Error ? err.message : '월별 데이터 로드 실패')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadMonthlyData()
  }, [enabled, targetMonth])

  // 3. 지오메트리 + 월별 데이터 합성하여 최종 features 생성
  const features = useMemo(() => {
    console.log('[useOptimizedMonthlyData] Features composition triggered:', {
      hasStaticGeometry: !!staticGeometry,
      staticGeometryLength: staticGeometry?.length,
      hasMonthlyData: !!monthlyData,
      targetDay,
      monthlyDataDays: monthlyData ? Object.keys(monthlyData.days) : []
    })
    
    if (!staticGeometry || !monthlyData || !targetDay) {
      console.log('[useOptimizedMonthlyData] Features composition skipped:', {
        staticGeometry: !!staticGeometry,
        monthlyData: !!monthlyData,
        targetDay
      })
      return null
    }
    
    const dayData = monthlyData.days[targetDay]
    if (!dayData) {
      console.warn(`[DataComposition] ${targetDay}일 데이터 없음, 사용 가능한 날짜:`, Object.keys(monthlyData.days))
      return null
    }
    
    const composedFeatures: OptimizedDongFeature[] = []
    
    staticGeometry.forEach(geometry => {
      const dongData = dayData[geometry.dongCode]
      if (!dongData) {
        // 매출 데이터가 없는 동은 기본값으로 처리
        return
      }
      
      const feature: OptimizedDongFeature = {
        // 정적 정보 (지오메트리)
        dongCode: geometry.dongCode,
        dongName: geometry.dongName,
        sggName: geometry.sggName,
        sggCode: geometry.sggCode,
        centroid: geometry.centroid,
        boundingBox: geometry.boundingBox,
        geometry: {
          type: 'Polygon',
          coordinates: geometry.coordinates
        },
        
        // 동적 정보 (매출/기상)
        height: dongData.height,
        totalSales: dongData.totalSales,
        salesByType: dongData.salesByType,
        percentile: dongData.percentile,
        colorIndex: dongData.colorIndex,
        fillColorRGB: calculateThemeColors(dongData.colorIndex) as {
          blue: number[]
          green: number[]
          purple: number[]
          orange: number[]
          bright: number[]
        },
        formattedSales: dongData.formattedSales,
        rank: dongData.rank,
        rankLabel: dongData.rankLabel,
        weather: dongData.weather
      }
      
      composedFeatures.push(feature)
    })
    
    // 디버깅: 높이 데이터 샘플 확인
    const sampleFeatures = composedFeatures.slice(0, 3)
    sampleFeatures.forEach(feature => {
      console.log(`[DEBUG] 동 ${feature.dongCode} (${feature.dongName}): totalSales=${feature.totalSales.toLocaleString()}, height=${feature.height}`)
    })
    
    console.log(`[DataComposition] ${selectedDate} 합성 완료: ${composedFeatures.length}개 동`)
    return composedFeatures
  }, [staticGeometry, monthlyData, targetDay, selectedDate])

  // 빠른 조회를 위한 dongCode -> feature 맵
  const dongMap = useMemo(() => {
    if (!features) return null
    
    const map = new Map<number, OptimizedDongFeature>()
    features.forEach(feature => {
      map.set(feature.dongCode, feature)
    })
    return map
  }, [features])

  // 기존 인터페이스 호환성을 위한 data 객체
  const data = useMemo(() => {
    if (!features) return null
    return { features }
  }, [features])

  return {
    // 기존 호환성
    data,
    features,
    isLoading,
    error,
    dongMap,
    
    // 새로운 기능
    staticGeometry,
    monthlyData,
    availableMonths
  }
}

/**
 * 특정 테마의 색상 값만 추출하는 유틸리티 (기존 호환성)
 */
export function getThemeColors(
  features: OptimizedDongFeature[] | null, 
  theme: string
): Map<number, number[]> {
  const colorMap = new Map<number, number[]>()
  
  if (!features) return colorMap
  
  features.forEach(feature => {
    const themeColors = feature.fillColorRGB[theme as keyof typeof feature.fillColorRGB]
    if (themeColors) {
      colorMap.set(feature.dongCode, themeColors)
    }
  })
  
  return colorMap
}

/**
 * 월별 데이터 프리페치
 */
export function prefetchMonthlyData(months: string[]): void {
  months.forEach(month => {
    if (!monthlyDataCache.has(month)) {
      fetch(`/data/optimized/monthly/sales-${month}.json`)
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Load failed')
        })
        .then(data => {
          if (monthlyDataCache.size >= 3) {
            const firstKey = monthlyDataCache.keys().next().value
            if (firstKey) {
              monthlyDataCache.delete(firstKey)
            }
          }
          monthlyDataCache.set(month, data)
          console.log(`[MonthlyData] 프리페치 완료: ${month}`)
        })
        .catch(err => {
          console.warn(`[MonthlyData] 프리페치 실패 ${month}:`, err)
        })
    }
  })
}

/**
 * 캐시 클리어
 */
export function clearOptimizedDataCache(): void {
  staticGeometryCache.data = null
  monthlyDataCache.clear()
  console.log('[OptimizedData] 캐시 초기화')
}
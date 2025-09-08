/**
 * 사전 처리된 일별 3D 데이터를 로드하는 최적화 Hook
 * 런타임 계산 없이 단순 조회만으로 렌더링 가능
 */

import { useState, useEffect, useMemo } from 'react'

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
}

interface OptimizedDailyData {
  date: string
  dongCount: number
  metadata: {
    processedAt: string
    themes: string[]
    heightRange: [number, number]
    version: string
    maxSales: number
    minSales: number
  }
  features: OptimizedDongFeature[]
}

interface UseOptimizedDailyDataProps {
  selectedDate: string // YYYY-MM-DD format
  enabled?: boolean
}

interface UseOptimizedDailyDataReturn {
  data: OptimizedDailyData | null
  features: OptimizedDongFeature[] | null
  isLoading: boolean
  error: string | null
  // 빠른 조회를 위한 맵
  dongMap: Map<number, OptimizedDongFeature> | null
}

// 전역 캐시 (메모리 최적화)
const dataCache = new Map<string, OptimizedDailyData>()

export function useOptimizedDailyData({
  selectedDate,
  enabled = true
}: UseOptimizedDailyDataProps): UseOptimizedDailyDataReturn {
  const [data, setData] = useState<OptimizedDailyData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 데이터 로드
  useEffect(() => {
    if (!enabled || !selectedDate) return

    async function loadOptimizedData() {
      try {
        setIsLoading(true)
        setError(null)

        // 캐시 확인
        if (dataCache.has(selectedDate)) {
          console.log(`[OptimizedData] 캐시에서 로드: ${selectedDate}`)
          setData(dataCache.get(selectedDate)!)
          setIsLoading(false)
          return
        }

        // 최적화된 데이터 로드
        const response = await fetch(`/data/optimized/daily/${selectedDate}.json`)
        
        if (!response.ok) {
          // Fallback to 2024-01-01 if date not found
          if (response.status === 404) {
            console.warn(`[OptimizedData] ${selectedDate} 데이터 없음, 2024-01-01로 대체`)
            const fallbackResponse = await fetch('/data/optimized/daily/2024-01-01.json')
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json()
              setData(fallbackData)
              // Fallback은 캐시하지 않음
            } else {
              throw new Error('기본 데이터도 로드 실패')
            }
          } else {
            throw new Error(`데이터 로드 실패: ${response.status}`)
          }
        } else {
          const optimizedData: OptimizedDailyData = await response.json()
          
          // 캐시 저장 (최대 5개까지만)
          if (dataCache.size >= 5) {
            const firstKey = dataCache.keys().next().value
            dataCache.delete(firstKey)
          }
          dataCache.set(selectedDate, optimizedData)
          
          setData(optimizedData)
          console.log(`[OptimizedData] 로드 완료: ${selectedDate} (${optimizedData.dongCount}개 동)`)
        }
      } catch (err) {
        console.error('[OptimizedData] 로드 오류:', err)
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setIsLoading(false)
      }
    }

    loadOptimizedData()
  }, [selectedDate, enabled])

  // 빠른 조회를 위한 dongCode -> feature 맵 생성
  const dongMap = useMemo(() => {
    if (!data?.features) return null
    
    const map = new Map<number, OptimizedDongFeature>()
    data.features.forEach(feature => {
      map.set(feature.dongCode, feature)
    })
    return map
  }, [data])

  return {
    data,
    features: data?.features || null,
    isLoading,
    error,
    dongMap
  }
}

/**
 * 특정 테마의 색상 값만 추출하는 유틸리티
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
 * 데이터 프리페치 (페이지 로드시 미리 캐싱)
 */
export function prefetchOptimizedDailyData(dates: string[]) {
  dates.forEach(date => {
    if (!dataCache.has(date)) {
      fetch(`/data/optimized/daily/${date}.json`)
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Load failed')
        })
        .then(data => {
          if (dataCache.size >= 5) {
            const firstKey = dataCache.keys().next().value
            dataCache.delete(firstKey)
          }
          dataCache.set(date, data)
          console.log(`[OptimizedData] 프리페치 완료: ${date}`)
        })
        .catch(err => {
          console.warn(`[OptimizedData] 프리페치 실패 ${date}:`, err)
        })
    }
  })
}

/**
 * 캐시 클리어
 */
export function clearOptimizedDataCache() {
  dataCache.clear()
  console.log('[OptimizedData] 캐시 초기화')
}
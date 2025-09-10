"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { climateDataLoader } from '../utils/climateDataLoader'
import type { ClimateCardSalesData, ClimateFilterOptions } from '../types'

interface MeshTimelineData {
  date: string
  data: ClimateCardSalesData[]
  processedData: any // 처리된 메쉬 데이터
  totalSales: number
  pointCount: number
}

interface UseMeshTimelineCacheProps {
  dates: string[] // 프리로드할 날짜 배열
  filterOptions?: Partial<ClimateFilterOptions>
  onLoadProgress?: (progress: number) => void
  enabled?: boolean
}

interface UseMeshTimelineCacheReturn {
  cache: Map<string, MeshTimelineData>
  isLoading: boolean
  loadProgress: number
  error: string | null
  getCachedData: (date: string) => MeshTimelineData | undefined
  preloadAllDates: () => Promise<void>
  clearCache: () => void
  currentData: MeshTimelineData | null
  setCurrentDate: (date: string) => void
}

/**
 * 메쉬 타임라인 애니메이션을 위한 데이터 캐싱 훅
 * 여러 날짜의 데이터를 미리 로드하고 메모리에 캐싱하여 빠른 전환 지원
 */
export function useMeshTimelineCache({
  dates,
  filterOptions = {},
  onLoadProgress,
  enabled = true
}: UseMeshTimelineCacheProps): UseMeshTimelineCacheReturn {
  const [cache, setCache] = useState<Map<string, MeshTimelineData>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<MeshTimelineData | null>(null)
  
  // Abort controller for cancelling ongoing loads
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 단일 날짜 데이터 로드 및 캐싱
   */
  const loadDateData = useCallback(async (date: string): Promise<MeshTimelineData | null> => {
    try {
      console.log(`[MeshTimelineCache] Loading data for ${date}...`)
      
      // 기존 캐시 확인
      const cached = cache.get(date)
      if (cached) {
        console.log(`[MeshTimelineCache] Using cached data for ${date}`)
        return cached
      }

      // 데이터 로드
      const options: ClimateFilterOptions = {
        ...filterOptions,
        date
      }
      
      const rawData = await climateDataLoader.loadAllData(options)
      
      // 총 매출액 계산
      let totalSales = 0
      rawData.forEach(item => {
        if (item.salesByCategory) {
          Object.values(item.salesByCategory).forEach(sales => {
            if (typeof sales === 'number' && sales > 0) {
              totalSales += sales
            }
          })
        }
      })

      // 메쉬 데이터 구조 생성 (간단한 처리)
      const processedData = rawData.map(item => ({
        ...item,
        // 메쉬 렌더링에 필요한 추가 처리
        meshHeight: Math.log10(Math.max(1, totalSales)) * 10,
        meshColor: [255, 100, 100, 180] // 임시 색상
      }))

      const timelineData: MeshTimelineData = {
        date,
        data: rawData,
        processedData,
        totalSales,
        pointCount: rawData.length
      }

      console.log(`[MeshTimelineCache] Loaded ${date}: ${rawData.length} points, ${(totalSales/100000000).toFixed(1)}억원`)
      
      return timelineData
    } catch (error) {
      console.error(`[MeshTimelineCache] Failed to load ${date}:`, error)
      return null
    }
  }, [cache, filterOptions])

  /**
   * 모든 날짜 데이터를 순차적으로 프리로드
   */
  const preloadAllDates = useCallback(async () => {
    if (isLoading || dates.length === 0) return

    console.log(`[MeshTimelineCache] Starting preload for ${dates.length} dates...`)
    setIsLoading(true)
    setError(null)
    setLoadProgress(0)

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    const newCache = new Map<string, MeshTimelineData>()
    
    try {
      for (let i = 0; i < dates.length; i++) {
        // Check if aborted
        if (abortControllerRef.current.signal.aborted) {
          console.log('[MeshTimelineCache] Preload cancelled')
          break
        }

        const date = dates[i]
        const progress = ((i + 1) / dates.length) * 100
        
        setLoadProgress(progress)
        onLoadProgress?.(progress)
        
        const data = await loadDateData(date)
        if (data) {
          newCache.set(date, data)
        }
        
        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      setCache(newCache)
      console.log(`[MeshTimelineCache] Preload complete. Cached ${newCache.size} dates`)
      
      // 첫 번째 날짜를 현재 데이터로 설정
      if (dates[0] && newCache.has(dates[0])) {
        setCurrentDate(dates[0])
        setCurrentData(newCache.get(dates[0]) || null)
      }
    } catch (error) {
      console.error('[MeshTimelineCache] Preload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to preload data')
    } finally {
      setIsLoading(false)
      setLoadProgress(100)
      abortControllerRef.current = null
    }
  }, [dates, isLoading, loadDateData, onLoadProgress])

  /**
   * 캐시에서 데이터 가져오기
   */
  const getCachedData = useCallback((date: string): MeshTimelineData | undefined => {
    return cache.get(date)
  }, [cache])

  /**
   * 현재 날짜 변경 (캐시된 데이터 즉시 반환)
   */
  const setCurrentDateWithCache = useCallback((date: string) => {
    const cached = cache.get(date)
    if (cached) {
      console.log(`[MeshTimelineCache] Switching to cached data for ${date}`)
      setCurrentDate(date)
      setCurrentData(cached)
    } else {
      console.warn(`[MeshTimelineCache] No cached data for ${date}`)
      setCurrentDate(date)
      setCurrentData(null)
    }
  }, [cache])

  /**
   * 캐시 클리어
   */
  const clearCache = useCallback(() => {
    console.log('[MeshTimelineCache] Clearing cache...')
    cache.clear()
    setCache(new Map())
    setCurrentData(null)
    setCurrentDate(null)
    setLoadProgress(0)
    
    // Cancel ongoing loads
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [cache])

  // 자동 프리로드 (enabled가 true일 때)
  useEffect(() => {
    if (enabled && dates.length > 0 && cache.size === 0) {
      preloadAllDates()
    }
  }, [enabled, dates.length]) // preloadAllDates는 의도적으로 제외

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    cache,
    isLoading,
    loadProgress,
    error,
    getCachedData,
    preloadAllDates,
    clearCache,
    currentData,
    setCurrentDate: setCurrentDateWithCache
  }
}

export default useMeshTimelineCache
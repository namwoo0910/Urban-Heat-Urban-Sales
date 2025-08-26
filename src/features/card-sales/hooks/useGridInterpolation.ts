/**
 * Grid Interpolation Hook
 * 매출 데이터를 80x80 격자로 보간하는 커스텀 훅
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FeatureCollection, Polygon } from 'geojson'
import { SeoulGridInterpolator } from '../utils/gridInterpolator'
import type { 
  DongBoundary, 
  HexagonLayerGridData,
  InterpolatorConfig,
  DistributionMethod
} from '../types/grid.types'
import type { HexagonLayerData, ClimateCardSalesData } from '../types'

interface UseGridInterpolationOptions {
  enabled?: boolean
  gridSize?: number
  distributionMethod?: DistributionMethod
  distributionRadius?: number
  enableSmoothing?: boolean
  smoothingSigma?: number
}

interface UseGridInterpolationResult {
  gridData: HexagonLayerGridData[] | null
  isProcessing: boolean
  error: string | null
  interpolator: SeoulGridInterpolator | null
  // Control methods
  setEnabled: (enabled: boolean) => void
  setDistributionMethod: (method: DistributionMethod) => void
  setDistributionRadius: (radius: number) => void
  setSmoothing: (enabled: boolean, sigma?: number) => void
  reprocessData: () => Promise<void>
}

export function useGridInterpolation(
  hexagonData: HexagonLayerData[] | null,
  climateData: ClimateCardSalesData[] | null,
  options: UseGridInterpolationOptions = {}
): UseGridInterpolationResult {
  // State
  const [enabled, setEnabled] = useState(options.enabled ?? true) // Default to true for Gaussian grid
  const [gridData, setGridData] = useState<HexagonLayerGridData[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Configuration state - grid_0811.py의 nearest_only 설정 사용 (라인 417-421)
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>(
    options.distributionMethod || 'nearest'  // 가장 가까운 셀에만 100% 할당
  )
  const [distributionRadius, setDistributionRadius] = useState(
    options.distributionRadius || 1000  // nearest에서는 의미없음 (grid_0811.py 라인 419)
  )
  const [enableSmoothing, setEnableSmoothing] = useState(
    options.enableSmoothing ?? true
  )
  const [smoothingSigma, setSmoothingSigma] = useState(
    options.smoothingSigma || 800  // 스무싱으로 경계 생성 (grid_0811.py 라인 420)
  )
  
  // Boundaries data (cached)
  const [seoulBoundary, setSeoulBoundary] = useState<FeatureCollection<Polygon> | null>(null)
  const [dongBoundaries, setDongBoundaries] = useState<DongBoundary[] | null>(null)
  
  // Create interpolator instance
  const interpolator = useMemo(() => {
    if (!enabled) return null
    
    const config: InterpolatorConfig = {
      gridSize: options.gridSize || 80,
      distributionMethod,
      distributionRadius,
      enableSmoothing,
      smoothingSigma
    }
    
    return new SeoulGridInterpolator(config)
  }, [enabled, options.gridSize, distributionMethod, distributionRadius, enableSmoothing, smoothingSigma])
  
  // Load boundary data
  useEffect(() => {
    if (!enabled) return
    
    const loadBoundaries = async () => {
      try {
        // Load dong boundaries
        const dongResponse = await fetch('/data/local_economy/local_economy_dong.geojson')
        
        // Check if response is OK
        if (!dongResponse.ok) {
          throw new Error(`Failed to load dong boundaries: ${dongResponse.status} ${dongResponse.statusText}`)
        }
        
        // Check content type (accept both application/json and application/geo+json)
        const contentType = dongResponse.headers.get('content-type')
        if (!contentType || (!contentType.includes('application/json') && !contentType.includes('application/geo+json'))) {
          console.error('Received non-JSON response:', contentType)
          throw new Error(`Expected JSON but received ${contentType}`)
        }
        
        const dongGeoJson = await dongResponse.json()
        
        // Convert to DongBoundary format - 행정동코드로 통일
        const dongBounds: DongBoundary[] = dongGeoJson.features.map((feature: any) => {
          // 행정동코드를 String으로 통일
          const adm_cd = String(feature.properties.행정동코드 || feature.properties.ADM_CD || '')
          const adm_nm = feature.properties.행정동 || feature.properties.ADM_NM || ''
          
          return {
            adm_cd: adm_cd,
            adm_nm: adm_nm,
            geometry: feature.geometry
          }
        })
        
        setDongBoundaries(dongBounds)
        setSeoulBoundary(dongGeoJson)
        
        console.log('📍 경계 데이터 로드 완료:', {
          dongs: dongBounds.length,
          features: dongGeoJson.features.length
        })
      } catch (err) {
        console.error('경계 데이터 로드 실패:', err)
        setError('경계 데이터를 로드할 수 없습니다')
      }
    }
    
    loadBoundaries()
  }, [enabled])
  
  // Process data with interpolation
  const processData = useCallback(async () => {
    if (!enabled || !interpolator || !hexagonData || !dongBoundaries || !seoulBoundary) {
      return
    }
    
    setIsProcessing(true)
    setError(null)
    
    try {
      console.log('🔄 격자 보간 시작...')
      
      // Prepare dong data map (aggregate by dong code)
      const dongDataMap = new Map<string, number>()
      
      // Aggregate sales data by dong using 행정동코드
      hexagonData.forEach(point => {
        if (point.originalData) {
          // Try to get dong code from various fields
          const dongCode = String(
            point.originalData.dongCode || 
            point.originalData.행정동코드 ||
            point.originalData.admCd || 
            point.originalData.adm_cd ||
            point.originalData.ADM_CD || ''
          )
          
          if (dongCode && dongCode !== '') {
            const currentValue = dongDataMap.get(dongCode) || 0
            dongDataMap.set(dongCode, currentValue + point.weight)
          }
        }
      })
      
      console.log('📊 행정동별 데이터 집계:', {
        총_행정동: dongDataMap.size,
        총_매출: Array.from(dongDataMap.values()).reduce((sum, v) => sum + v, 0)
      })
      
      // Process with interpolator
      const result = await interpolator.processData(
        dongDataMap,
        dongBoundaries,
        seoulBoundary,
        'current'
      )
      
      // Convert to HexagonLayer format
      const hexagonGridData = interpolator.toHexagonLayerData(result.gridData, 'current')
      
      console.log('✅ 격자 보간 완료:', {
        격자수: hexagonGridData.length,
        총_가중치: hexagonGridData.reduce((sum, d) => sum + d.weight, 0)
      })
      
      setGridData(hexagonGridData)
    } catch (err) {
      console.error('격자 보간 실패:', err)
      setError(err instanceof Error ? err.message : '격자 보간 처리 중 오류 발생')
    } finally {
      setIsProcessing(false)
    }
  }, [enabled, interpolator, hexagonData, dongBoundaries, seoulBoundary])
  
  // Auto-process when data changes
  useEffect(() => {
    if (enabled && hexagonData && dongBoundaries && seoulBoundary) {
      processData()
    }
  }, [enabled, hexagonData, dongBoundaries, seoulBoundary, processData])
  
  // Control methods
  const setSmoothing = useCallback((enabled: boolean, sigma?: number) => {
    setEnableSmoothing(enabled)
    if (sigma !== undefined) {
      setSmoothingSigma(sigma)
    }
  }, [])
  
  const reprocessData = useCallback(async () => {
    await processData()
  }, [processData])
  
  return {
    gridData: enabled ? gridData : null,
    isProcessing,
    error,
    interpolator,
    setEnabled,
    setDistributionMethod,
    setDistributionRadius,
    setSmoothing,
    reprocessData
  }
}
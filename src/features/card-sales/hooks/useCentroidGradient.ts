/**
 * Centroid Gradient Hook
 * grid_0811.py 방식을 적용한 메모리 효율적인 그라데이션 시스템
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FeatureCollection, Polygon } from 'geojson'
import { CentroidGradientInterpolator } from '../utils/centroidGradientInterpolator'
import type { CentroidGradientConfig } from '../utils/centroidGradientInterpolator'
import type { DongBoundary } from '../types/grid.types'
import type { ClimateCardSalesData } from '../types'
import type { HexagonLayerData } from '../components/LayerManager'

interface UseCentroidGradientOptions {
  enabled?: boolean
  gridSize?: number
  distributionRadius?: number
  boundaryHeight?: number
  interpolationType?: 'gaussian' | 'linear' | 'smooth' | 'exponential'
  enableSmoothing?: boolean
  smoothingSigma?: number
}

interface UseCentroidGradientResult {
  gradientData: HexagonLayerData[] | null
  isProcessing: boolean
  error: string | null
  interpolator: CentroidGradientInterpolator | null
  // Control methods
  setEnabled: (enabled: boolean) => void
  setBoundaryHeight: (height: number) => void
  setInterpolationType: (type: 'gaussian' | 'linear' | 'smooth' | 'exponential') => void
  setEnableSmoothing: (enabled: boolean) => void
  reprocessData: () => Promise<void>
}

export function useCentroidGradient(
  hexagonData: HexagonLayerData[] | null,
  climateData: ClimateCardSalesData[] | null,
  options: UseCentroidGradientOptions = {}
): UseCentroidGradientResult {
  // State
  const [enabled, setEnabled] = useState(options.enabled ?? false)
  const [gradientData, setGradientData] = useState<HexagonLayerData[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Configuration state
  const [boundaryHeight, setBoundaryHeight] = useState(options.boundaryHeight || 1000000)
  const [interpolationType, setInterpolationType] = useState<'gaussian' | 'linear' | 'smooth' | 'exponential'>(
    options.interpolationType || 'smooth'
  )
  const [enableSmoothing, setEnableSmoothing] = useState(options.enableSmoothing ?? false)
  const [smoothingSigma] = useState(options.smoothingSigma || 0.005)
  
  // Boundaries data
  const [dongBoundaries, setDongBoundaries] = useState<DongBoundary[] | null>(null)
  const [seoulBoundary, setSeoulBoundary] = useState<FeatureCollection<Polygon> | null>(null)
  
  // Create interpolator instance
  const interpolator = useMemo(() => {
    if (!enabled) return null
    
    const config: CentroidGradientConfig = {
      gridSize: options.gridSize || 80,
      distributionRadius: options.distributionRadius || 0.01,  // ~1km
      boundaryHeight,
      interpolationType,
      enableSmoothing,
      smoothingSigma
    }
    
    return new CentroidGradientInterpolator(config)
  }, [enabled, options.gridSize, options.distributionRadius, boundaryHeight, interpolationType, enableSmoothing, smoothingSigma])
  
  // Load boundary data
  useEffect(() => {
    if (!enabled) return
    
    const loadBoundaries = async () => {
      try {
        console.log('[CentroidGradient] Loading boundaries...')
        
        // Load dong boundaries
        const dongResponse = await fetch('/data/local_economy/local_economy_dong.geojson')
        
        if (!dongResponse.ok) {
          throw new Error(`Failed to load dong boundaries: ${dongResponse.status}`)
        }
        
        const dongGeoJson = await dongResponse.json()
        
        // Convert to DongBoundary array
        const dongBounds: DongBoundary[] = dongGeoJson.features.map((feature: any) => ({
          adm_cd: String(feature.properties.행정동코드 || feature.properties.ADM_CD || ''),
          adm_nm: feature.properties.행정동 || feature.properties.ADM_NM || '',
          geometry: feature.geometry
        }))
        
        setDongBoundaries(dongBounds)
        setSeoulBoundary(dongGeoJson)
        
        console.log('[CentroidGradient] Boundaries loaded:', {
          dongCount: dongBounds.length
        })
      } catch (err) {
        console.error('[CentroidGradient] Failed to load boundaries:', err)
        setError('경계 데이터 로드 실패')
      }
    }
    
    loadBoundaries()
  }, [enabled])
  
  // Process data with centroid-based gradient
  const processData = useCallback(async () => {
    if (!enabled || !interpolator || !dongBoundaries || !seoulBoundary) {
      return
    }
    
    setIsProcessing(true)
    setError(null)
    
    try {
      console.log('[CentroidGradient] Processing with centroid-based interpolation...')
      const startTime = performance.now()
      
      // Step 1: Initialize centroids from boundaries
      interpolator.initializeCentroids(dongBoundaries)
      
      // Step 2: Create grid cells
      interpolator.createGridCells(seoulBoundary)
      
      // Step 3: Pre-compute weights (KEY OPTIMIZATION)
      interpolator.precomputeWeights()
      
      // Step 4: Aggregate data by dong
      const dongDataMap = new Map<string, number>()
      
      if (climateData && climateData.length > 0) {
        climateData.forEach(item => {
          const dongCode = String(item.dongCode || '')
          const sales = item.totalSales || 0
          
          if (dongCode && sales > 0) {
            const currentValue = dongDataMap.get(dongCode) || 0
            dongDataMap.set(dongCode, currentValue + sales)
          }
        })
        console.log('[CentroidGradient] Aggregated data for', dongDataMap.size, 'dongs')
      } else if (hexagonData && hexagonData.length > 0) {
        // Fallback to hexagon data
        hexagonData.forEach(item => {
          if (item.originalData) {
            const dongCode = String(
              item.originalData.dongCode || 
              item.originalData.행정동코드 ||
              item.originalData.admCd || 
              item.originalData.adm_cd || ''
            )
            const sales = item.weight || 0
            
            if (dongCode && sales > 0) {
              const currentValue = dongDataMap.get(dongCode) || 0
              dongDataMap.set(dongCode, currentValue + sales)
            }
          }
        })
        console.log('[CentroidGradient] Aggregated hexagon data for', dongDataMap.size, 'dongs')
      }
      
      // If no data, create sample data
      if (dongDataMap.size === 0) {
        console.warn('[CentroidGradient] No data found, creating sample data...')
        dongBoundaries.forEach((boundary, index) => {
          const sampleValue = 5000000 + Math.random() * 95000000  // 5M-100M range
          dongDataMap.set(boundary.adm_cd, sampleValue)
        })
      }
      
      // Step 5: Apply gradient (FAST - just multiplication)
      const gridData = interpolator.applyGradient(dongDataMap, 'current')
      
      // Step 6: Convert to HexagonLayerData format
      const hexData = interpolator.convertToHexagonData(gridData, 'current')
      
      // Convert to expected format
      const finalData: HexagonLayerData[] = hexData.map(cell => ({
        coordinates: cell.coordinates,
        weight: cell.weight,
        originalData: {
          gridId: cell.gridId,
          row: cell.row,
          col: cell.col
        }
      }))
      
      const elapsedTime = performance.now() - startTime
      console.log('[CentroidGradient] ✅ Complete processing in', elapsedTime.toFixed(2), 'ms')
      console.log('[CentroidGradient] Generated', finalData.length, 'cells')
      
      setGradientData(finalData)
      
    } catch (err) {
      console.error('[CentroidGradient] Processing error:', err)
      setError('데이터 처리 중 오류 발생')
    } finally {
      setIsProcessing(false)
    }
  }, [enabled, interpolator, hexagonData, climateData, dongBoundaries, seoulBoundary])
  
  // Process data when inputs change
  useEffect(() => {
    if (enabled && !isProcessing && dongBoundaries && seoulBoundary && interpolator) {
      processData()
    }
  }, [enabled, isProcessing, dongBoundaries, seoulBoundary, interpolator, processData])
  
  // Reprocess method for manual trigger
  const reprocessData = useCallback(async () => {
    await processData()
  }, [processData])
  
  return {
    gradientData,
    isProcessing,
    error,
    interpolator,
    setEnabled,
    setBoundaryHeight,
    setInterpolationType,
    setEnableSmoothing,
    reprocessData
  }
}
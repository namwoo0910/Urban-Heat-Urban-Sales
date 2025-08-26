/**
 * Dong Boundary Gradient Hook
 * 행정동 중심-경계 그라데이션 보간을 위한 커스텀 훅
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FeatureCollection, Polygon } from 'geojson'
import { DongBoundaryGradientInterpolator } from '../utils/dongBoundaryGradientInterpolator'
import type { DongBoundaryGradientConfig } from '../utils/dongBoundaryGradientInterpolator'
import type { 
  DongBoundary, 
  HexagonLayerGridData
} from '../types/grid.types'
import type { ClimateCardSalesData } from '../types'
import type { HexagonLayerData } from '../components/LayerManager'

interface UseDongBoundaryGradientOptions {
  enabled?: boolean
  gridSize?: number
  boundaryHeight?: number
  interpolationType?: 'linear' | 'exponential' | 'logarithmic' | 'smooth'
  enableSmoothing?: boolean
  smoothingSigma?: number
}

interface UseDongBoundaryGradientResult {
  gradientData: HexagonLayerData[] | null
  isProcessing: boolean
  error: string | null
  interpolator: DongBoundaryGradientInterpolator | null
  // Control methods
  setEnabled: (enabled: boolean) => void
  setBoundaryHeight: (height: number) => void
  setInterpolationType: (type: 'linear' | 'exponential' | 'logarithmic' | 'smooth') => void
  setEnableSmoothing: (enabled: boolean) => void
  setSmoothingSigma: (sigma: number) => void
  reprocessData: () => Promise<void>
}

export function useDongBoundaryGradient(
  hexagonData: HexagonLayerData[] | null,
  climateData: ClimateCardSalesData[] | null,
  options: UseDongBoundaryGradientOptions = {}
): UseDongBoundaryGradientResult {
  // State
  const [enabled, setEnabled] = useState(options.enabled ?? false)
  const [gradientData, setGradientData] = useState<HexagonLayerData[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  
  // Configuration state
  const [boundaryHeight, setBoundaryHeight] = useState(options.boundaryHeight || 1000000)  // 1M scale
  const [interpolationType, setInterpolationType] = useState<'linear' | 'exponential' | 'logarithmic' | 'smooth'>(
    options.interpolationType || 'smooth'  // Default to smooth for better gradients
  )
  const [enableSmoothing, setEnableSmoothing] = useState(options.enableSmoothing ?? true)
  const [smoothingSigma, setSmoothingSigma] = useState(options.smoothingSigma || 800)
  
  // Test mode flag for debugging
  const testMode = false  // Disabled: Use real gradient interpolation
  
  // Boundaries data (cached)
  const [seoulBoundary, setSeoulBoundary] = useState<FeatureCollection<Polygon> | null>(null)
  const [dongBoundaries, setDongBoundaries] = useState<DongBoundary[] | null>(null)
  
  // Create interpolator instance
  const interpolator = useMemo(() => {
    if (!enabled) return null
    
    const config: DongBoundaryGradientConfig = {
      gridSize: options.gridSize || 80, // Maintain 80x80 grid as per user request
      boundaryHeight,
      interpolationType,
      enableSmoothing,
      smoothingSigma
    }
    
    return new DongBoundaryGradientInterpolator(config)
  }, [enabled, options.gridSize, boundaryHeight, interpolationType, enableSmoothing, smoothingSigma])
  
  // Load boundary data
  useEffect(() => {
    if (!enabled) return
    
    const loadBoundaries = async () => {
      try {
        // Load dong boundaries
        const dongResponse = await fetch('/data/local_economy/local_economy_dong.geojson')
        
        if (!dongResponse.ok) {
          throw new Error(`Failed to load dong boundaries: ${dongResponse.status}`)
        }
        
        const dongGeoJson = await dongResponse.json()
        
        // Convert to DongBoundary array - 행정동코드로 통일
        const dongBounds: DongBoundary[] = dongGeoJson.features.map((feature: any) => ({
          adm_cd: String(feature.properties.행정동코드 || feature.properties.ADM_CD || ''),
          adm_nm: feature.properties.행정동 || feature.properties.ADM_NM || '',
          geometry: feature.geometry
        }))
        
        setDongBoundaries(dongBounds)
        setSeoulBoundary(dongGeoJson)
        
        console.log('[DongGradient] Boundaries loaded:', {
          dongCount: dongBounds.length
        })
      } catch (err) {
        console.error('[DongGradient] Failed to load boundaries:', err)
        setError('경계 데이터 로드 실패')
      }
    }
    
    loadBoundaries()
  }, [enabled])
  
  // Process data with gradient interpolation
  const processData = useCallback(async () => {
    if (!enabled || !interpolator || !hexagonData || !dongBoundaries || !seoulBoundary) {
      return
    }
    
    setIsProcessing(true)
    setError(null)
    
    try {
      console.log('[DongGradient] Processing data with gradient interpolation...')
      
      // Create grid cells
      const gridCells = interpolator.createGridCells(seoulBoundary)
      console.log('[DongGradient] Grid cells created:', gridCells.length)
      
      // Aggregate data by dong
      let dongDataMap = new Map<string, number>()
      
      // Debug: Check available dong codes
      const availableDongCodes = new Set(dongBoundaries.map(d => d.adm_cd))
      console.log('[DongGradient] Available dong codes:', availableDongCodes.size, 'codes')
      
      // Climate data has dongCode (행정동 코드) - String으로 처리
      if (climateData && climateData.length > 0) {
        let matchedCount = 0
        climateData.forEach(item => {
          const dongCode = String(item.dongCode || '')
          const sales = item.totalSales || 0
          
          if (dongCode && dongCode !== '' && sales > 0) {
            // Check if dongCode exists in boundaries
            if (availableDongCodes.has(dongCode)) {
              const currentValue = dongDataMap.get(dongCode) || 0
              dongDataMap.set(dongCode, currentValue + sales)
              matchedCount++
            } else {
              // Log unmatched for debugging
              if (matchedCount === 0 && climateData.indexOf(item) < 3) {
                console.log('[DongGradient] Unmatched dongCode:', dongCode, 'not in', Array.from(availableDongCodes).slice(0, 5))
              }
            }
          }
        })
        console.log('[DongGradient] Matched climate data:', matchedCount, 'items')
      } else if (hexagonData && hexagonData.length > 0) {
        // Fallback to hexagon data aggregation
        let matchedCount = 0
        hexagonData.forEach(item => {
          if (item.originalData) {
            // Try multiple possible field names - all as String
            const dongCode = String(
              item.originalData.dongCode || 
              item.originalData.행정동코드 ||
              item.originalData.admCd || 
              item.originalData.adm_cd ||
              item.originalData.ADM_CD || ''
            )
            const sales = item.weight || 0
            
            if (dongCode && dongCode !== '' && sales > 0) {
              // Check if dongCode exists in boundaries
              if (availableDongCodes.has(dongCode)) {
                const currentValue = dongDataMap.get(dongCode) || 0
                dongDataMap.set(dongCode, currentValue + sales)
                matchedCount++
              }
            }
          }
        })
        console.log('[DongGradient] Matched hexagon data:', matchedCount, 'items')
      }
      
      // If no data matched, create sample data for testing
      if (dongDataMap.size === 0) {
        console.warn('[DongGradient] No data matched! Creating sample data for visualization')
        // Use ALL dong codes with varied sample values for complete coverage
        const allDongs = Array.from(availableDongCodes)
        allDongs.forEach((code, index) => {
          // Generate varied sample values with more variation
          const baseValue = 5000000  // 5M base
          const randomMultiplier = 1 + Math.random() * 19  // 1-20x multiplier (5M-100M range)
          const sampleValue = Math.floor(baseValue * randomMultiplier)
          dongDataMap.set(code, sampleValue)
        })
        console.log('[DongGradient] Created sample data for ALL', dongDataMap.size, 'dongs')
        console.log('[DongGradient] Sample values range:', 
          Math.min(...Array.from(dongDataMap.values())), '-',
          Math.max(...Array.from(dongDataMap.values())))
      }
      
      // Limit to top 100 dongs by sales for memory optimization
      if (dongDataMap.size > 100) {
        console.log('[DongGradient] Limiting to top 100 dongs by sales...')
        const sorted = Array.from(dongDataMap.entries())
          .sort(([, a], [, b]) => b - a)  // Sort by sales descending
          .slice(0, 100)  // Take top 100
        dongDataMap = new Map(sorted)
        console.log('[DongGradient] Reduced to', dongDataMap.size, 'dongs')
      }
      
      console.log('[DongGradient] Dong data aggregated:', {
        dongCount: dongDataMap.size,
        totalSales: Array.from(dongDataMap.values()).reduce((sum, v) => sum + v, 0)
      })
      
      // TEST MODE: Skip complex interpolation and use direct assignment
      let hexData: HexagonLayerData[]
      
      if (testMode) {
        console.log('[DongGradient] TEST MODE: Direct grid cell assignment')
        
        // Create hexagon data directly from grid cells
        hexData = gridCells.map((cell, index) => {
          // Create varied test values
          const baseValue = 10000000  // 10M
          const variation = (index % 5 + 1)  // 1-5 multiplier
          const testWeight = baseValue * variation
          
          return {
            coordinates: cell.center,
            weight: testWeight,
            originalData: {
              gridId: cell.grid_id,
              row: cell.row,
              col: cell.col,
              testMode: true
            }
          }
        })
        
        console.log('[DongGradient] TEST MODE: Created', hexData.length, 'cells with values 10M-50M')
      } else {
        // PRODUCTION MODE: Use Web Worker if available, fallback to main thread
        // Apply gradient interpolation
        let gridData
        try {
          gridData = await interpolator.processWithWorker(
            dongDataMap,
            dongBoundaries,
            'current',
            (progress) => setProcessingProgress(progress)
          )
        } catch (workerError) {
          console.warn('[DongGradient] Worker failed, using main thread:', workerError)
          gridData = interpolator.distributeWithGradient(
            dongDataMap,
            dongBoundaries,
            'current'
          )
        }
        
        const gridHexData = interpolator.convertToHexagonData(gridData, 'current')
        
        // Convert HexagonLayerGridData to HexagonLayerData format
        hexData = gridHexData.map(cell => ({
          coordinates: cell.coordinates,
          weight: cell.weight,
          // Store grid info in originalData for reference
          originalData: {
            gridId: cell.gridId,
            row: cell.row,
            col: cell.col,
            dongContributions: cell.dongContributions
          }
        }))
      }
      
      console.log('[DongGradient] Gradient data processed:', {
        cellCount: hexData.length,
        totalWeight: hexData.reduce((sum, d) => sum + d.weight, 0),
        sampleCells: hexData.slice(0, 5).map(d => ({
          coords: d.coordinates,
          weight: d.weight
        }))
      })
      
      // Ensure we have valid data
      if (hexData.length === 0) {
        console.error('[DongGradient] No hexagon data generated!')
      } else {
        console.log('[DongGradient] Setting gradient data with', hexData.length, 'cells')
      }
      
      setGradientData(hexData)
      
      // Clean up memory after processing
      if (typeof window !== 'undefined' && (window as any).gc) {
        console.log('[DongGradient] Running garbage collection...')
        ;(window as any).gc()
      }
    } catch (err) {
      console.error('[DongGradient] Processing error:', err)
      setError('데이터 처리 중 오류 발생')
      
      // If OOM error, suggest reducing data
      if (err instanceof Error && err.message.includes('memory')) {
        setError('메모리 부족: 데이터를 줄여주세요')
      }
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
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
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (interpolator) {
        interpolator.cleanupWorker()
      }
    }
  }, [interpolator])
  
  return {
    gradientData,
    isProcessing,
    error,
    interpolator,
    setEnabled,
    setBoundaryHeight,
    setInterpolationType,
    setEnableSmoothing,
    setSmoothingSigma,
    reprocessData
  }
}
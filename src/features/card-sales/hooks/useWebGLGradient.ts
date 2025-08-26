/**
 * WebGL Gradient Hook
 * Manages WebGL-based gradient rendering state and data transformation
 * Optimized for GPU rendering with minimal memory footprint
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { HexagonLayerData } from '../components/LayerManager'
import type { ClimateCardSalesData } from '../types'
import type { DongGradientData } from '../layers/WebGLGradientLayer'
import type { GPUGradientData } from '../layers/CustomWebGLGradientLayer'
import { GPUAggregator } from '../utils/gpuAggregator'

interface UseWebGLGradientOptions {
  enabled?: boolean
  radiusPixels?: number
  intensity?: number
  threshold?: number
  opacity?: number
  colorScheme?: 'heatmap' | 'gradient' | 'custom'
  customColors?: {
    center: [number, number, number, number]
    boundary: [number, number, number, number]
  }
  useCustomWebGL?: boolean // Use custom WebGL layer instead of HeatmapLayer
  useGPUAggregation?: boolean // Use GPU aggregation
}

interface UseWebGLGradientResult {
  gradientData: DongGradientData[] | null
  gpuGradientData: GPUGradientData[] | null
  isProcessing: boolean
  error: string | null
  // Control methods
  setEnabled: (enabled: boolean) => void
  setRadiusPixels: (radius: number) => void
  setIntensity: (intensity: number) => void
  setThreshold: (threshold: number) => void
  setOpacity: (opacity: number) => void
  setColorScheme: (scheme: 'heatmap' | 'gradient' | 'custom') => void
  setUseCustomWebGL: (use: boolean) => void
  setUseGPUAggregation: (use: boolean) => void
  reprocessData: () => Promise<void>
  // Performance metrics
  memoryUsage: number
  renderTime: number
  gpuMemoryEstimate: number
}

// Color schemes for different visualization modes
const COLOR_SCHEMES = {
  heatmap: {
    center: [255, 255, 0, 255] as [number, number, number, number],    // Yellow
    boundary: [0, 0, 255, 100] as [number, number, number, number]     // Blue
  },
  gradient: {
    center: [255, 0, 0, 255] as [number, number, number, number],      // Red
    boundary: [0, 255, 0, 100] as [number, number, number, number]     // Green
  },
  custom: {
    center: [255, 255, 255, 255] as [number, number, number, number],  // White
    boundary: [0, 0, 0, 100] as [number, number, number, number]       // Black
  }
}

export function useWebGLGradient(
  hexagonData: HexagonLayerData[] | null,
  climateData: ClimateCardSalesData[] | null,
  options: UseWebGLGradientOptions = {}
): UseWebGLGradientResult {
  // State management
  const [enabled, setEnabled] = useState(options.enabled ?? false)
  const [gradientData, setGradientData] = useState<DongGradientData[] | null>(null)
  const [gpuGradientData, setGpuGradientData] = useState<GPUGradientData[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useCustomWebGL, setUseCustomWebGL] = useState(options.useCustomWebGL ?? true)
  const [useGPUAggregation, setUseGPUAggregation] = useState(options.useGPUAggregation ?? true)
  
  // Visual parameters
  const [radiusPixels, setRadiusPixels] = useState(options.radiusPixels ?? 80)
  const [intensity, setIntensity] = useState(options.intensity ?? 1)
  const [threshold, setThreshold] = useState(options.threshold ?? 0.03)
  const [opacity, setOpacity] = useState(options.opacity ?? 0.7)
  const [colorScheme, setColorScheme] = useState<'heatmap' | 'gradient' | 'custom'>(
    options.colorScheme ?? 'heatmap'
  )
  
  // Performance metrics
  const [memoryUsage, setMemoryUsage] = useState(0)
  const [renderTime, setRenderTime] = useState(0)
  const [gpuMemoryEstimate, setGpuMemoryEstimate] = useState(0)
  
  // Dong boundary data cache
  const [dongBoundaries, setDongBoundaries] = useState<any[] | null>(null)
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false)
  
  // Load dong boundaries
  useEffect(() => {
    if (!enabled || dongBoundaries || isLoadingBoundaries) return
    
    const loadBoundaries = async () => {
      setIsLoadingBoundaries(true)
      try {
        console.log('[WebGLGradient] Loading dong boundaries...')
        const response = await fetch('/data/local_economy/local_economy_dong.geojson')
        
        if (!response.ok) {
          throw new Error(`Failed to load boundaries: ${response.status}`)
        }
        
        const geoJson = await response.json()
        
        // Extract simplified boundary data
        const boundaries = geoJson.features.map((feature: any) => ({
          dongCode: String(feature.properties.행정동코드 || feature.properties.ADM_CD || ''),
          dongName: feature.properties.행정동 || feature.properties.ADM_NM || '',
          geometry: feature.geometry,
          // Pre-calculate center for GPU efficiency
          center: calculateCenter(feature.geometry)
        }))
        
        setDongBoundaries(boundaries)
        console.log('[WebGLGradient] Loaded', boundaries.length, 'dong boundaries')
      } catch (err) {
        console.error('[WebGLGradient] Failed to load boundaries:', err)
        setError('경계 데이터 로드 실패')
      } finally {
        setIsLoadingBoundaries(false)
      }
    }
    
    loadBoundaries()
  }, [enabled, dongBoundaries, isLoadingBoundaries])
  
  // Calculate geometry center (simplified for performance)
  const calculateCenter = useCallback((geometry: any): [number, number] => {
    let coords: number[][] = []
    
    if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0]
    } else if (geometry.type === 'MultiPolygon') {
      // Use first polygon for MultiPolygon
      coords = geometry.coordinates[0][0]
    }
    
    if (coords.length === 0) return [0, 0]
    
    // Simple centroid calculation
    const sum = coords.reduce(
      (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
      [0, 0]
    )
    
    return [sum[0] / coords.length, sum[1] / coords.length]
  }, [])
  
  // Process data for WebGL rendering
  const processData = useCallback(async () => {
    if (!enabled || !dongBoundaries) return
    
    setIsProcessing(true)
    setError(null)
    
    const startTime = performance.now()
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    try {
      console.log('[WebGLGradient] Processing data for GPU rendering...')
      
      // Aggregate data by dong
      const dongDataMap = new Map<string, number>()
      
      // Process climate data
      if (climateData && climateData.length > 0) {
        climateData.forEach(item => {
          const dongCode = String(item.dongCode || '')
          const sales = item.totalSales || 0
          
          if (dongCode && sales > 0) {
            const current = dongDataMap.get(dongCode) || 0
            dongDataMap.set(dongCode, current + sales)
          }
        })
      }
      // Fallback to hexagon data
      else if (hexagonData && hexagonData.length > 0) {
        hexagonData.forEach(item => {
          if (item.originalData) {
            const dongCode = String(
              item.originalData.dongCode || 
              item.originalData.행정동코드 ||
              item.originalData.adm_cd || ''
            )
            const sales = item.weight || 0
            
            if (dongCode && sales > 0) {
              const current = dongDataMap.get(dongCode) || 0
              dongDataMap.set(dongCode, current + sales)
            }
          }
        })
      }
      
      // If no data, create sample data
      if (dongDataMap.size === 0) {
        console.log('[WebGLGradient] Creating sample data for visualization')
        dongBoundaries.forEach((boundary, index) => {
          const sampleValue = 5000000 * (1 + Math.random() * 10)
          dongDataMap.set(boundary.dongCode, sampleValue)
        })
      }
      
      // Limit to top N dongs for performance
      const MAX_DONGS = 150  // GPU can handle more than CPU
      if (dongDataMap.size > MAX_DONGS) {
        console.log(`[WebGLGradient] Limiting to top ${MAX_DONGS} dongs`)
        const sorted = Array.from(dongDataMap.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, MAX_DONGS)
        dongDataMap.clear()
        sorted.forEach(([k, v]) => dongDataMap.set(k, v))
      }
      
      // Create gradient data for WebGL layer
      const webglData: DongGradientData[] = []
      const gpuData: GPUGradientData[] = []
      
      dongDataMap.forEach((value, dongCode) => {
        const boundary = dongBoundaries.find(b => b.dongCode === dongCode)
        if (boundary) {
          webglData.push({
            dongCode: boundary.dongCode,
            dongName: boundary.dongName,
            geometry: boundary.geometry,
            center: boundary.center,
            value: value
          })
          
          // Also create GPU-optimized data
          gpuData.push({
            dongCode: boundary.dongCode,
            dongName: boundary.dongName,
            center: boundary.center,
            value: value
          })
        }
      })
      
      console.log('[WebGLGradient] Created', webglData.length, 'dong gradient points')
      
      // Calculate performance metrics
      const endTime = performance.now()
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      setRenderTime(endTime - startTime)
      setMemoryUsage((finalMemory - initialMemory) / 1024 / 1024) // Convert to MB
      
      // Estimate GPU memory usage
      const textureSize = useCustomWebGL ? 
        Math.ceil(Math.sqrt(gpuData.length)) * 4 * 4 : // RGBA float texture
        webglData.length * 32 // Vertex buffer estimate
      setGpuMemoryEstimate(textureSize / 1024 / 1024) // Convert to MB
      
      setGradientData(webglData)
      setGpuGradientData(gpuData)
      
      console.log('[WebGLGradient] Processing complete:', {
        dongs: webglData.length,
        renderTime: `${(endTime - startTime).toFixed(2)}ms`,
        memoryUsage: `${((finalMemory - initialMemory) / 1024 / 1024).toFixed(2)}MB`
      })
      
    } catch (err) {
      console.error('[WebGLGradient] Processing error:', err)
      setError('데이터 처리 중 오류 발생')
    } finally {
      setIsProcessing(false)
    }
  }, [enabled, dongBoundaries, hexagonData, climateData, useCustomWebGL])
  
  // Process data when inputs change
  useEffect(() => {
    if (enabled && !isProcessing && dongBoundaries) {
      processData()
    }
  }, [enabled, isProcessing, dongBoundaries, processData])
  
  // Reprocess method for manual trigger
  const reprocessData = useCallback(async () => {
    await processData()
  }, [processData])
  
  // Get current color configuration
  const currentColors = useMemo(() => {
    if (colorScheme === 'custom' && options.customColors) {
      return options.customColors
    }
    return COLOR_SCHEMES[colorScheme]
  }, [colorScheme, options.customColors])
  
  return {
    gradientData,
    gpuGradientData,
    isProcessing,
    error,
    setEnabled,
    setRadiusPixels,
    setIntensity,
    setThreshold,
    setOpacity,
    setColorScheme,
    setUseCustomWebGL,
    setUseGPUAggregation,
    reprocessData,
    memoryUsage,
    renderTime,
    gpuMemoryEstimate
  }
}
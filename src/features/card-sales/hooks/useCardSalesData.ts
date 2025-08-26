"use client"

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { LayerConfig, HexagonLayerData } from '../components/LayerManager'
import { DEFAULT_LAYER_CONFIG } from '../components/LayerManager'
import type { ColorScheme } from '@/src/features/card-sales/utils/premiumColors'
import useWaveAnimation from '@/src/features/card-sales/hooks/useWaveAnimation'
import { climateDataLoader } from '../utils/climateDataLoader'
import type { ClimateCardSalesData, ClimateFilterOptions, ColorMode } from '../types'
import { getCategoryOffset } from '../constants/categoryOffsets'
import { useGridInterpolation } from './useGridInterpolation'
import type { DistributionMethod } from '../types/grid.types'

interface UseLayerStateReturn {
  // 레이어 설정 상태
  layerConfig: LayerConfig
  
  // 데이터 상태
  hexagonData: HexagonLayerData[] | null
  climateData: ClimateCardSalesData[] | null
  isDataLoading: boolean
  dataError: string | null
  
  // Grid 보간 상태
  gridInterpolationEnabled: boolean
  setGridInterpolationEnabled: (enabled: boolean) => void
  gridDistributionMethod: DistributionMethod
  setGridDistributionMethod: (method: DistributionMethod) => void
  
  // 표시 모드 (simple: 행정동별 총합, detailed: 카테고리별 상세)
  displayMode: 'simple' | 'detailed'
  setDisplayMode: (mode: 'simple' | 'detailed') => void
  toggleDisplayMode: () => void
  
  // 필터 상태
  filterOptions: ClimateFilterOptions
  selectedDate: string
  selectedHour: number
  colorMode: ColorMode
  
  // Hierarchical filter states
  selectedGu: string | null
  selectedDong: string | null
  selectedMiddleCategory: string | null
  selectedSubCategory: string | null
  
  // 설정 업데이트 함수들
  setVisible: (visible: boolean) => void
  setRadius: (radius: number) => void
  setElevationScale: (scale: number) => void
  setCoverage: (coverage: number) => void
  setUpperPercentile: (percentile: number) => void
  setColorScheme: (scheme: ColorScheme) => void
  
  // 애니메이션 설정 함수들
  setAnimationEnabled: (enabled: boolean) => void
  setAnimationSpeed: (speed: number) => void
  setWaveAmplitude: (amplitude: number) => void
  
  // 전체 설정 업데이트
  updateConfig: (config: Partial<LayerConfig>) => void
  resetConfig: () => void
  
  // 데이터 로딩
  loadData: () => Promise<void>
  
  // 필터 업데이트 함수들
  setFilterOptions: (options: ClimateFilterOptions) => void
  setSelectedDate: (date: string) => void
  setSelectedHour: (hour: number) => void
  setColorMode: (mode: ColorMode) => void
  
  // Hierarchical filter functions
  setSelectedGu: (gu: string | null) => void
  setSelectedDong: (dong: string | null) => void
  setSelectedMiddleCategory: (category: string | null) => void
  setSelectedSubCategory: (category: string | null) => void
  
  // 상호작용 상태
  hoveredObject: any
  selectedObject: any
  setHoveredObject: (object: any) => void
  setSelectedObject: (object: any) => void
  
  // 애니메이션 상태
  currentAnimationScale: number
  isAnimating: boolean
  onAnimationInteractionStart: () => void
  onAnimationInteractionEnd: () => void
  toggleAnimation: () => void
  
  // 회전 애니메이션 상태
  rotationEnabled: boolean
  rotationSpeed: number
  rotationDirection: 'clockwise' | 'counterclockwise'
  currentBearing: number
  isRotating: boolean
  rotationBearingIncrement: number
  shouldRotate: boolean
  rotationDirectionText: string
  bearingDisplay: string
  
  // 회전 애니메이션 제어 함수들
  setRotationEnabled: (enabled: boolean) => void
  setRotationSpeed: (speed: number) => void
  setRotationDirection: (direction: 'clockwise' | 'counterclockwise') => void
  toggleRotation: () => void
  updateBearing: (bearing: number) => void
  onRotationInteractionStart: () => void
  onRotationInteractionEnd: () => void
}

export function useLayerState(): UseLayerStateReturn {
  // 레이어 설정 상태
  const [layerConfig, setLayerConfig] = useState<LayerConfig>(DEFAULT_LAYER_CONFIG)
  
  // 데이터 상태
  const [hexagonData, setHexagonData] = useState<HexagonLayerData[] | null>(null)
  const [climateData, setClimateData] = useState<ClimateCardSalesData[] | null>(null)
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  
  // 표시 모드 상태 (simple: 행정동별 총합, detailed: 카테고리별 상세)
  const [displayMode, setDisplayMode] = useState<'simple' | 'detailed'>('simple')
  
  // 필터 상태
  const [filterOptions, setFilterOptions] = useState<ClimateFilterOptions>({
    date: '2024-01-01' // 기본 날짜
  })
  const [selectedDate, setSelectedDateState] = useState('2024-01-01')
  const [selectedHour, setSelectedHourState] = useState(12) // 기본 12시
  const [colorMode, setColorModeState] = useState<ColorMode>('temperature')
  
  // Hierarchical filter states
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [selectedMiddleCategory, setSelectedMiddleCategory] = useState<string | null>(null)
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)
  
  // 상호작용 상태
  const [hoveredObject, setHoveredObject] = useState<any>(null)
  const [selectedObject, setSelectedObject] = useState<any>(null)
  
  // 회전 애니메이션 설정 상태 (simplified)
  const [rotationEnabled, setRotationEnabledState] = useState(false)
  const [rotationSpeed, setRotationSpeedState] = useState(1.0)
  const [rotationDirection, setRotationDirectionState] = useState<'clockwise' | 'counterclockwise'>('clockwise')
  const [currentBearing, setCurrentBearing] = useState(0)
  const [isRotating, setIsRotating] = useState(false)
  
  // 파도 애니메이션 설정 (memoized for performance)
  const waveAnimationConfig = useMemo(() => ({
    enabled: layerConfig.animationEnabled,
    speed: layerConfig.animationSpeed,
    amplitude: layerConfig.waveAmplitude,
    baseScale: layerConfig.elevationScale,
    minScale: layerConfig.elevationScale * 0.5,
    maxScale: layerConfig.elevationScale * layerConfig.waveAmplitude
  }), [
    layerConfig.animationEnabled,
    layerConfig.animationSpeed,
    layerConfig.waveAmplitude,
    layerConfig.elevationScale
  ])

  // 파도 애니메이션 훅 초기화
  const waveAnimation = useWaveAnimation(waveAnimationConfig)
  
  // 개별 설정 업데이트 함수들
  const setVisible = useCallback((visible: boolean) => {
    setLayerConfig(prev => ({ ...prev, visible }))
  }, [])
  
  const setRadius = useCallback((radius: number) => {
    setLayerConfig(prev => ({ ...prev, radius }))
  }, [])
  
  const setElevationScale = useCallback((elevationScale: number) => {
    setLayerConfig(prev => ({ ...prev, elevationScale }))
  }, [])
  
  const setCoverage = useCallback((coverage: number) => {
    setLayerConfig(prev => ({ ...prev, coverage }))
  }, [])
  
  const setUpperPercentile = useCallback((upperPercentile: number) => {
    setLayerConfig(prev => ({ ...prev, upperPercentile }))
  }, [])
  
  const setColorScheme = useCallback((colorScheme: ColorScheme) => {
    setLayerConfig(prev => ({ ...prev, colorScheme }))
  }, [])
  
  // 애니메이션 설정 업데이트 함수들
  const setAnimationEnabled = useCallback((animationEnabled: boolean) => {
    setLayerConfig(prev => ({ ...prev, animationEnabled }))
  }, [])
  
  const setAnimationSpeed = useCallback((animationSpeed: number) => {
    setLayerConfig(prev => ({ ...prev, animationSpeed }))
  }, [])
  
  const setWaveAmplitude = useCallback((waveAmplitude: number) => {
    setLayerConfig(prev => ({ ...prev, waveAmplitude }))
  }, [])
  
  // 회전 애니메이션 설정 업데이트 함수들 (simplified)
  const setRotationEnabled = useCallback((enabled: boolean) => {
    setRotationEnabledState(enabled)
    // 활성화 시 회전 시작, 비활성화 시 회전 중지
    setIsRotating(enabled)
  }, [])
  
  const setRotationSpeed = useCallback((speed: number) => {
    setRotationSpeedState(speed)
  }, [])
  
  const setRotationDirection = useCallback((direction: 'clockwise' | 'counterclockwise') => {
    setRotationDirectionState(direction)
  }, [])
  
  // 회전 토글 함수
  const toggleRotation = useCallback(() => {
    if (rotationEnabled) {
      setIsRotating(prev => !prev)
    }
  }, [rotationEnabled])
  
  // bearing 업데이트 함수
  const updateBearing = useCallback((bearing: number) => {
    setCurrentBearing(bearing)
  }, [])
  
  // 사용자 상호작용 핸들러 (단순화)
  const onRotationInteractionStart = useCallback(() => {
    // 상호작용 시작 시 회전 중지
    setIsRotating(false)
  }, [])
  
  const onRotationInteractionEnd = useCallback(() => {
    // 상호작용 종료 시 회전 재개 (활성화된 경우)
    if (rotationEnabled) {
      setIsRotating(true)
    }
  }, [rotationEnabled])
  
  // 계산된 값들 (memoized for performance)
  const rotationDirectionText = useMemo(() => 
    rotationDirection === 'clockwise' ? '시계방향' : '반시계방향', 
    [rotationDirection]
  )
  
  const bearingDisplay = useMemo(() => 
    `${Math.round(currentBearing)}°`, 
    [currentBearing]
  )
  
  const shouldRotate = useMemo(() => 
    rotationEnabled && isRotating, 
    [rotationEnabled, isRotating]
  )
  
  // 전체 설정 업데이트
  const updateConfig = useCallback((config: Partial<LayerConfig>) => {
    setLayerConfig(prev => ({ ...prev, ...config }))
  }, [])
  
  const resetConfig = useCallback(() => {
    setLayerConfig(DEFAULT_LAYER_CONFIG)
  }, [])
  
  // Apply hierarchical filters to data
  const applyHierarchicalFilters = useCallback((data: ClimateCardSalesData[]) => {
    let filteredData = [...data]
    
    // Filter by district (자치구)
    if (selectedGu) {
      filteredData = filteredData.filter(item => item.guName === selectedGu)
    }
    
    // Filter by dong (행정동)
    if (selectedDong) {
      filteredData = filteredData.filter(item => item.dongName === selectedDong)
    }
    
    // Note: Business category filtering would be applied at visualization level
    // since the raw data may not have category-specific location data
    
    return filteredData
  }, [selectedGu, selectedDong])

  // Create data points with middle category information - OPTIMIZED for memory and viewport
  const createCategoryDataPoints = useCallback((data: ClimateCardSalesData[], viewportBounds?: { 
    north?: number, 
    south?: number, 
    east?: number, 
    west?: number 
  }): HexagonLayerData[] => {
    const categoryPoints: HexagonLayerData[] = []
    
    // Dynamic limits based on data scope
    // If filtering by dong or gu, allow more points for detailed view
    const isFiltered = selectedGu || selectedDong
    const MAX_POINTS = isFiltered ? 5000 : 3000 // More points when zoomed to specific area
    const MAX_CATEGORIES_PER_DONG = isFiltered ? 10 : 5 // Show more categories when filtered
    
    data.forEach(item => {
      if (!item.salesByCategory) return
      if (categoryPoints.length >= MAX_POINTS) return // Stop if we have enough points
      
      // Viewport filtering - skip points outside current view
      if (viewportBounds) {
        const [lng, lat] = item.coordinates
        if (viewportBounds.north && lat > viewportBounds.north) return
        if (viewportBounds.south && lat < viewportBounds.south) return
        if (viewportBounds.east && lng > viewportBounds.east) return
        if (viewportBounds.west && lng < viewportBounds.west) return
      }
      
      // If a specific middle category is selected, create points only for that category
      if (selectedMiddleCategory) {
        const categorySales = item.salesByCategory[selectedMiddleCategory] || 0
        
        if (categorySales > 0) {
          const offset = getCategoryOffset(selectedMiddleCategory)
          
          categoryPoints.push({
            coordinates: [
              item.coordinates[0] + offset.dx,
              item.coordinates[1] + offset.dy
            ],
            weight: categorySales,
            middleCategory: selectedMiddleCategory,
            category: selectedMiddleCategory,
            // Minimize originalData to only essential fields
            originalData: {
              guName: item.guName,
              dongName: item.dongName,
              categorySales: categorySales,
              middleCategory: selectedMiddleCategory,
              coordinates: item.coordinates,
              temperature: item.temperature,
              discomfortIndex: item.discomfortIndex,
              humidity: item.humidity
            }
          })
        }
        return
      }
      
      // When no category selected, limit to top categories to reduce memory
      const sortedCategories = Object.entries(item.salesByCategory)
        .filter(([cat, sales]) => sales && sales > 0 && !cat.startsWith('sub_'))
        .sort(([, a], [, b]) => (b || 0) - (a || 0))
        .slice(0, MAX_CATEGORIES_PER_DONG) // Take only top N categories
      
      // Additional optimization: skip small sales in unfiltered view
      const minSalesThreshold = isFiltered ? 0 : 1000000 // 100만원 미만 제외 (전체 보기 시)
      
      sortedCategories.forEach(([category, sales]) => {
        if (categoryPoints.length >= MAX_POINTS) return
        if (sales < minSalesThreshold) return // Skip small sales in unfiltered view
        
        const offset = getCategoryOffset(category)
        
        categoryPoints.push({
          coordinates: [
            item.coordinates[0] + offset.dx,
            item.coordinates[1] + offset.dy
          ],
          weight: sales,
          middleCategory: category,
          category: category,
          // Minimize originalData
          originalData: {
            guName: item.guName,
            dongName: item.dongName,
            categorySales: sales,
            middleCategory: category,
            coordinates: item.coordinates,
            temperature: item.temperature,
            discomfortIndex: item.discomfortIndex,
            humidity: item.humidity
          }
        })
      })
    })
    
    return categoryPoints
  }, [selectedMiddleCategory, selectedGu, selectedDong])

  // Create simple data points with total sales per dong (행정동별 총 매출액) - OPTIMIZED
  const createSimpleDataPoints = useCallback((data: ClimateCardSalesData[]): HexagonLayerData[] => {
    const simplePoints: HexagonLayerData[] = []
    
    // Group data by dong (행정동)
    const dongGroups = new Map<string, { totalSales: number, item: ClimateCardSalesData }>()
    
    data.forEach(item => {
      if (!item.salesByCategory) return
      
      const dongKey = `${item.guName}_${item.dongName}`
      
      // Calculate total sales for this dong
      let totalSales = 0
      Object.entries(item.salesByCategory).forEach(([category, sales]) => {
        if (sales && sales > 0 && !category.startsWith('sub_')) {
          totalSales += sales
        }
      })
      
      if (totalSales > 0) {
        const existing = dongGroups.get(dongKey)
        if (existing) {
          existing.totalSales += totalSales
        } else {
          dongGroups.set(dongKey, { totalSales, item })
        }
      }
    })
    
    // Create one point per dong with total sales
    dongGroups.forEach(({ totalSales, item }) => {
      simplePoints.push({
        coordinates: item.coordinates,
        weight: totalSales,
        category: '전체',
        // Minimize originalData to only essential fields
        originalData: {
          guName: item.guName,
          dongName: item.dongName,
          categorySales: totalSales,
          displayMode: 'simple',
          coordinates: item.coordinates,
          temperature: item.temperature,
          discomfortIndex: item.discomfortIndex,
          humidity: item.humidity,
          salesByCategory: item.salesByCategory // Keep for detailed mode switching
        }
      })
    })
    
    return simplePoints
  }, [])
  
  // Toggle display mode function
  const toggleDisplayMode = useCallback(() => {
    setDisplayMode(prev => prev === 'simple' ? 'detailed' : 'simple')
  }, [])

  // 전체 데이터 로딩 함수
  const loadData = useCallback(async () => {
    console.log('[ClimateDataLoader] 기후-카드매출 데이터 로딩 시작...')
    setIsDataLoading(true)
    setDataError(null)
    
    try {
      // 기후-카드매출 데이터 로드
      const data = await climateDataLoader.loadAllData(filterOptions)
      
      console.log(`[ClimateDataLoader] 데이터 로딩 완료: ${data.length}개 포인트`)
      
      // Apply hierarchical filters
      const filteredData = applyHierarchicalFilters(data)
      
      // Create data points based on display mode
      const hexData = displayMode === 'simple' 
        ? createSimpleDataPoints(filteredData)
        : createCategoryDataPoints(filteredData)
      
      setClimateData(data) // Keep original data
      setHexagonData(hexData) // Set filtered hexagon data
      
      if (filteredData.length > 0) {
        console.log(`[ClimateDataLoader] 필터링 후 데이터: ${filteredData.length}개 포인트`)
      }
      
    } catch (error) {
      console.error('[ClimateDataLoader] 데이터 로드 실패:', error)
      
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      setDataError(`데이터 로드 실패: ${errorMessage}`)
    } finally {
      setIsDataLoading(false)
    }
  }, [filterOptions, applyHierarchicalFilters, displayMode, createSimpleDataPoints, createCategoryDataPoints])
  
  // 필터 업데이트 함수들
  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateState(date)
    setFilterOptions(prev => ({ ...prev, date }))
  }, [])
  
  const setSelectedHour = useCallback((hour: number) => {
    setSelectedHourState(hour)
    // 시간대 변경시 데이터를 재가공할 수 있음
  }, [])
  
  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode)
    // 색상 모드에 따라 colorScheme과 colorMode 업데이트
    const schemeMap: Record<ColorMode, ColorScheme> = {
      temperature: 'temperature' as ColorScheme,
      temperatureGroup: 'temperature' as ColorScheme,
      discomfort: 'discomfort' as ColorScheme,
      alert: 'alert' as ColorScheme,
      sales: 'oceanic' as ColorScheme,
      humidity: 'oceanic' as ColorScheme // 습도는 oceanic 색상 사용
    }
    setColorScheme(schemeMap[mode])
    // LayerConfig의 colorMode도 업데이트
    setLayerConfig(prev => ({ ...prev, colorMode: mode as any }))
  }, [setColorScheme])
  
  // Single useEffect for data loading and filtering - OPTIMIZED to prevent duplicate processing
  useEffect(() => {
    // Initial load only when filterOptions change
    if (!climateData) {
      loadData()
      return
    }
    
    // Re-filter existing data when filters or display mode change
    const filteredData = applyHierarchicalFilters(climateData)
    const hexData = displayMode === 'simple' 
      ? createSimpleDataPoints(filteredData)
      : createCategoryDataPoints(filteredData)
    setHexagonData(hexData)
  }, [selectedGu, selectedDong, selectedMiddleCategory, displayMode, filterOptions, climateData, applyHierarchicalFilters, createCategoryDataPoints, createSimpleDataPoints, loadData])
  
  // Grid Interpolation Hook
  const {
    gridData,
    isProcessing: isGridProcessing,
    error: gridError,
    setEnabled: setGridInterpolationEnabled,
    setDistributionMethod: setGridDistributionMethod,
    setDistributionRadius: setGridDistributionRadius,
    setSmoothing: setGridSmoothing,
    reprocessData: reprocessGridData
  } = useGridInterpolation(hexagonData, climateData, {
    enabled: true, // 기본값 활성화 - Gaussian grid as default
    gridSize: 80,
    distributionMethod: 'gaussian',
    distributionRadius: 1000,
    enableSmoothing: true,
    smoothingSigma: 500
  })
  
  // Grid 보간 상태
  const [gridInterpolationEnabled, setGridEnabled] = useState(true) // Default to true
  const [gridDistributionMethod, setGridMethod] = useState<DistributionMethod>('gaussian')
  
  // Grid 보간 활성화 시 gridData 사용
  const finalHexagonData = gridInterpolationEnabled && gridData ? gridData : hexagonData
  
  return {
    // 레이어 설정 상태
    layerConfig,
    
    // 데이터 상태
    hexagonData: finalHexagonData,
    climateData,
    isDataLoading: isDataLoading || isGridProcessing,
    dataError: dataError || gridError,
    
    // Grid 보간 상태
    gridInterpolationEnabled,
    setGridInterpolationEnabled: (enabled: boolean) => {
      setGridEnabled(enabled)
      setGridInterpolationEnabled(enabled)
    },
    gridDistributionMethod,
    setGridDistributionMethod: (method: DistributionMethod) => {
      setGridMethod(method)
      setGridDistributionMethod(method)
    },
    
    // 표시 모드
    displayMode,
    setDisplayMode,
    toggleDisplayMode,
    
    // 필터 상태
    filterOptions,
    selectedDate,
    selectedHour,
    colorMode,
    
    // Hierarchical filter states
    selectedGu,
    selectedDong,
    selectedMiddleCategory,
    selectedSubCategory,
    
    // 설정 업데이트 함수들
    setVisible,
    setRadius,
    setElevationScale,
    setCoverage,
    setUpperPercentile,
    setColorScheme,
    
    // 애니메이션 설정 함수들
    setAnimationEnabled,
    setAnimationSpeed,
    setWaveAmplitude,
    
    // 전체 설정 업데이트
    updateConfig,
    resetConfig,
    
    // 데이터 로딩
    loadData,
    
    // 필터 업데이트 함수들
    setFilterOptions,
    setSelectedDate,
    setSelectedHour,
    setColorMode,
    
    // Hierarchical filter functions
    setSelectedGu,
    setSelectedDong,
    setSelectedMiddleCategory,
    setSelectedSubCategory,
    
    // 상호작용 상태
    hoveredObject,
    selectedObject,
    setHoveredObject,
    setSelectedObject,
    
    // 애니메이션 상태
    currentAnimationScale: waveAnimation.currentScale,
    isAnimating: waveAnimation.isAnimating,
    onAnimationInteractionStart: waveAnimation.onInteractionStart,
    onAnimationInteractionEnd: waveAnimation.onInteractionEnd,
    toggleAnimation: waveAnimation.toggleAnimation,
    
    // 회전 애니메이션 상태 (simplified)
    rotationEnabled,
    rotationSpeed,
    rotationDirection,
    currentBearing,
    isRotating,
    rotationBearingIncrement: 2 * rotationSpeed, // 계산된 값
    shouldRotate,
    rotationDirectionText,
    bearingDisplay,
    
    // 회전 애니메이션 제어 함수들 (simplified)
    setRotationEnabled,
    setRotationSpeed,
    setRotationDirection,
    toggleRotation,
    updateBearing,
    onRotationInteractionStart,
    onRotationInteractionEnd
  }
}
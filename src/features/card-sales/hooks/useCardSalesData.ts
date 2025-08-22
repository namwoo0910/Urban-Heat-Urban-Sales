"use client"

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { LayerConfig, HexagonLayerData } from '../components/LayerManager'
import { DEFAULT_LAYER_CONFIG } from '../components/LayerManager'
import type { ColorScheme } from '@/src/features/card-sales/utils/premiumColors'
import useWaveAnimation from '@/src/features/card-sales/hooks/useWaveAnimation'
import { climateDataLoader } from '../utils/climateDataLoader'
import type { ClimateCardSalesData, ClimateFilterOptions, ColorMode } from '../types'

interface UseLayerStateReturn {
  // 레이어 설정 상태
  layerConfig: LayerConfig
  
  // 데이터 상태
  hexagonData: HexagonLayerData[] | null
  climateData: ClimateCardSalesData[] | null
  isDataLoading: boolean
  dataError: string | null
  
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

  // Create multiple data points for each business category
  const createCategoryDataPoints = useCallback((data: ClimateCardSalesData[]): HexagonLayerData[] => {
    const categoryPoints: HexagonLayerData[] = []
    
    // Define main business categories and their colors (all 10 categories)
    const mainCategories = [
      { name: '음식', color: '#FF6B6B' },
      { name: '쇼핑', color: '#4ECDC4' },
      { name: '교통', color: '#FFD93D' },
      { name: '문화/여가', color: '#A855F7' },
      { name: '의료/건강', color: '#6BCF7F' },
      { name: '교육', color: '#FF8C42' },
      { name: '숙박', color: '#4682B4' },
      { name: '금융', color: '#FD79A8' },
      { name: '생활서비스', color: '#9370DB' },
      { name: '공공/기관', color: '#A29BFE' }
    ]
    
    // Grid layout offsets for 10 categories (3x4 grid layout) - 간격 증가
    const gridOffsets = [
      { dx: -0.003, dy: 0.004 },     // Row 1, Col 1
      { dx: -0.001, dy: 0.004 },     // Row 1, Col 2
      { dx: 0.001, dy: 0.004 },      // Row 1, Col 3
      { dx: 0.003, dy: 0.004 },      // Row 1, Col 4
      { dx: -0.003, dy: 0 },         // Row 2, Col 1
      { dx: -0.001, dy: 0 },         // Row 2, Col 2
      { dx: 0.001, dy: 0 },          // Row 2, Col 3
      { dx: 0.003, dy: 0 },          // Row 2, Col 4
      { dx: -0.002, dy: -0.004 },    // Row 3, Col 1-2
      { dx: 0.002, dy: -0.004 }      // Row 3, Col 3-4
    ]
    
    data.forEach(item => {
      if (!item.salesByCategory) return
      
      // Aggregate sales by main categories
      const categorySales: Record<string, number> = {
        '음식': 0,
        '쇼핑': 0,
        '교통': 0,
        '문화/여가': 0,
        '의료/건강': 0,
        '교육': 0,
        '숙박': 0,
        '금융': 0,
        '생활서비스': 0,
        '공공/기관': 0
      }
      
      // Map detailed categories to main categories
      Object.entries(item.salesByCategory).forEach(([category, amount]) => {
        // Enhanced mapping based on actual category names
        if (category.includes('음식') || category.includes('식당') || category.includes('카페') || 
            category.includes('한식') || category.includes('중식') || category.includes('일식') || 
            category.includes('양식') || category.includes('패스트푸드')) {
          categorySales['음식'] += amount
        } else if (category.includes('쇼핑') || category.includes('마트') || category.includes('백화점') ||
                   category.includes('슈퍼') || category.includes('편의점') || category.includes('의류')) {
          categorySales['쇼핑'] += amount
        } else if (category.includes('교통') || category.includes('주유') || category.includes('주차') ||
                   category.includes('택시') || category.includes('대중교통')) {
          categorySales['교통'] += amount
        } else if (category.includes('문화') || category.includes('여가') || category.includes('영화') ||
                   category.includes('공연') || category.includes('스포츠') || category.includes('노래방')) {
          categorySales['문화/여가'] += amount
        } else if (category.includes('의료') || category.includes('병원') || category.includes('약국') ||
                   category.includes('건강') || category.includes('치과') || category.includes('한의원')) {
          categorySales['의료/건강'] += amount
        } else if (category.includes('교육') || category.includes('학원') || category.includes('학교') ||
                   category.includes('유치원') || category.includes('어린이집')) {
          categorySales['교육'] += amount
        } else if (category.includes('숙박') || category.includes('호텔') || category.includes('모텔') ||
                   category.includes('펜션') || category.includes('민박')) {
          categorySales['숙박'] += amount
        } else if (category.includes('금융') || category.includes('은행') || category.includes('보험') ||
                   category.includes('증권') || category.includes('카드')) {
          categorySales['금융'] += amount
        } else if (category.includes('생활') || category.includes('서비스') || category.includes('부동산') ||
                   category.includes('세탁') || category.includes('미용') || category.includes('이발')) {
          categorySales['생활서비스'] += amount
        } else if (category.includes('공공') || category.includes('기관') || category.includes('관공서') ||
                   category.includes('우체국')) {
          categorySales['공공/기관'] += amount
        }
      })
      
      // Create a data point for each category with sales > 0
      mainCategories.forEach((cat, index) => {
        const sales = categorySales[cat.name]
        if (sales > 0) {
          const offset = gridOffsets[index]
          categoryPoints.push({
            coordinates: [
              item.coordinates[0] + offset.dx,
              item.coordinates[1] + offset.dy
            ],
            weight: sales,
            category: cat.name,  // 카테고리 이름을 최상위 레벨에 저장
            originalData: item  // 원본 데이터 그대로 저장
          })
        }
      })
    })
    
    console.log(`[createCategoryDataPoints] Created ${categoryPoints.length} category data points`)
    if (categoryPoints.length > 0) {
      const samplePoint = categoryPoints[0]
      console.log('[createCategoryDataPoints] Sample point:', {
        category: samplePoint.category,
        weight: samplePoint.weight,
        coordinates: samplePoint.coordinates
      })
    }
    
    return categoryPoints
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
      
      // Create separate data points for each business category
      const hexData = createCategoryDataPoints(filteredData)
      
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
  }, [filterOptions, applyHierarchicalFilters])
  
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
  
  // 컴포넌트 마운트 시 데이터 자동 로딩
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Re-filter data when hierarchical filters change
  useEffect(() => {
    if (climateData && climateData.length > 0) {
      const filteredData = applyHierarchicalFilters(climateData)
      // Create separate data points for each business category
      const hexData = createCategoryDataPoints(filteredData)
      setHexagonData(hexData)
    }
  }, [selectedGu, selectedDong, climateData, applyHierarchicalFilters, createCategoryDataPoints])
  
  return {
    // 레이어 설정 상태
    layerConfig,
    
    // 데이터 상태
    hexagonData,
    climateData,
    isDataLoading,
    dataError,
    
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
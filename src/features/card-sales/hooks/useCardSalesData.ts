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
      
      // Map detailed categories to main categories (새로운 구조 대응)
      Object.entries(item.salesByCategory).forEach(([category, amount]) => {
        // 중분류 카테고리 매핑 (업데이트된 구조에 맞춤)
        const categoryName = category.replace('sub_', '') // Remove sub_ prefix if exists
        
        // 중분류 매핑
        if (categoryName === '한식' || categoryName === '일식/양식/중식' || 
            categoryName === '제과/커피/패스트푸드' || categoryName === '기타요식' ||
            categoryName === '일식' || categoryName === '양식' || categoryName === '중식' ||
            categoryName === '커피전문점' || categoryName === '제과점' || categoryName === '패스트푸드') {
          categorySales['음식'] += amount
        } else if (categoryName === '마트/생활잡화' || categoryName === '편의점' || 
                   categoryName === '백화점' || categoryName === '패션/잡화' || 
                   categoryName === '기타유통' || categoryName === '음/식료품' ||
                   categoryName === '대형마트' || categoryName === '슈퍼마켓 기업형' || 
                   categoryName === '슈퍼마켓 일반형') {
          categorySales['쇼핑'] += amount
        } else if (categoryName === '자동차서비스/용품' || categoryName === '자동차판매' || 
                   categoryName === '주유' || categoryName === '주차장' || 
                   categoryName === '자동차서비스' || categoryName === '자동차용품' ||
                   categoryName === '주유소' || categoryName === 'LPG가스') {
          categorySales['교통'] += amount
        } else if (categoryName === '스포츠/문화/레저' || categoryName === '스포츠/문화/레저용품' || 
                   categoryName === '유흥' || categoryName === '영화/공연' || 
                   categoryName === '노래방' || categoryName === '스포츠시설' ||
                   categoryName === '실내/실외골프장' || categoryName === '종합레저타운/놀이동산') {
          categorySales['문화/여가'] += amount
        } else if (categoryName === '병원' || categoryName === '약국' || 
                   categoryName === '미용서비스' || categoryName === '일반병원' || 
                   categoryName === '종합병원' || categoryName === '치과병원' || 
                   categoryName === '한의원' || categoryName === '동물병원' ||
                   categoryName === '미용실' || categoryName === '헬스장') {
          categorySales['의료/건강'] += amount
        } else if (categoryName === '학습' || categoryName === '학원/학습지' || 
                   categoryName === '독서실' || categoryName === '서점') {
          categorySales['교육'] += amount
        } else if (categoryName === '숙박' || categoryName === '호텔/콘도' || 
                   categoryName === '모텔,여관,기타숙박') {
          categorySales['숙박'] += amount
        } else if (categoryName === '상품권/복권') {
          categorySales['금융'] += amount
        } else if (categoryName === '생활서비스' || categoryName === '부동산중개' || 
                   categoryName === '세탁소' || categoryName === '안마/마사지' ||
                   categoryName === '싸우나/목욕탕' || categoryName === '예식장/결혼서비스') {
          categorySales['생활서비스'] += amount
        } else if (categoryName === '보건소') {
          categorySales['공공/기관'] += amount
        } else if (categoryName === '가전/가구' || categoryName === '화장품' || 
                   categoryName === '사무기기/컴퓨터' || categoryName === '여행') {
          // 기타 카테고리들을 적절한 메인 카테고리로 분류
          if (categoryName === '가전/가구' || categoryName === '사무기기/컴퓨터') {
            categorySales['쇼핑'] += amount
          } else if (categoryName === '화장품') {
            categorySales['의료/건강'] += amount
          } else if (categoryName === '여행') {
            categorySales['문화/여가'] += amount
          }
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
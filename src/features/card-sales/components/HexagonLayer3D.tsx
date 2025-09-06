"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { LinearInterpolator, FlyToInterpolator, LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core'
import { PolygonLayer } from '@deck.gl/layers'
import UnifiedControls from "./SalesDataControls"
import { LayerManager, formatTooltip, createScatterplotLayer, formatScatterplotTooltip, createMeshLayer } from "./LayerManager"
import { usePreGeneratedSeoulMeshLayer } from "./SeoulMeshLayer"
import { useLayerState } from "../hooks/useCardSalesData"
import { useHeightInterpolation } from "../hooks/useHeightInterpolation"
import { useOptimizedMonthlyData } from "../hooks/useOptimizedMonthlyData"
import { useBinaryOptimizedData } from "../hooks/useBinaryOptimizedData"
import { DefaultChartsPanel } from "./charts/DefaultChartsPanel"
import { climateDataLoader } from '../utils/climateDataLoader'
import { formatKoreanCurrency } from '@/src/shared/utils/salesFormatter'
import LocalEconomyFilterPanel from "./LocalEconomyFilterPanel"
import type { FilterState } from "./LocalEconomyFilterPanel"
import { getDistrictCode, getDongCode } from "../data/districtCodeMappings"
import { SelectedAreaSalesInfo } from "./SelectedAreaSalesInfo"
import { createDistrictLabelsTextLayer, createDongLabelsTextLayer } from "./DistrictLabelsTextLayer"
import { MAPBOX_TOKEN } from "@/src/shared/constants/mapConfig"
import { useDistrictSelection } from "@/src/shared/hooks/useDistrictSelection"
import { loadDistrictData, getDistrictLayerPaint, getDistrictColors, getCurrentTheme, getCurrentThemeKey } from "@/src/shared/utils/districtUtils"
import { getDistrictCenter } from "../data/districtCenters"
import { calculateBoundaryElevation } from "@/src/shared/constants/elevationConstants"
import { 
  createSplitPolygon, 
  getDistrictHeight,
  getDongHeight,
  getDongHeightBySales,
  get3DColorExpression,
  get3DColorExpressionDark,
  get3DColorExpressionBright,
  getDong3DColorExpression,
  getDong3DColorExpressionDark,
  getDong3DColorExpressionBright,
  CAMERA_3D_CONFIG, 
  CAMERA_2D_CONFIG,
  LIGHT_3D_CONFIG 
} from "@/src/shared/utils/district3DUtils"
import { RotateCcw } from "lucide-react"
import { getModernDistrictColor, getModernEdgeColor, getModernMaterial, getDimmedColor, getAccentColor, applyColorAdjustments, getSimpleSalesColor } from "../utils/modernColorPalette"
import { ResizablePanel } from "@/src/shared/components/ResizablePanel"
import * as turf from '@turf/turf'
import { useUnifiedDeckGLLayers } from "./DeckGLUnifiedLayers"
import type { FeatureCollection } from 'geojson'
import "../styles/HexagonLayer.css"
import "@/src/shared/styles/districtEffects.css"

// Common GPU optimization parameters for all layers
const COMMON_GPU_PARAMS = {
  depthTest: true,
  depthFunc: 0x0203, // GL.LEQUAL
  blend: true,
  blendFunc: [0x0302, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
  cullFace: 0x0405, // GL.BACK
  cullFaceMode: true,
  polygonOffsetFill: true // Prevent z-fighting
}

// Simple color function for sales-based visualization
const convertColorExpressionToRGB = (
  height: number, 
  themeKey: string, 
  guName?: string, 
  dongName?: string, 
  isSelected?: boolean, 
  isHovered?: boolean,
  totalSales?: number
): [number, number, number, number] => {
  // Use modern color palette if gu and dong names are provided
  if (guName && dongName && (themeKey.startsWith('modern') || themeKey === 'modern' || themeKey === 'adjacent')) {
    return getModernDistrictColor(guName, dongName, height, themeKey, isSelected, isHovered);
  }
  
  // Use simple sales-based color if sales data is available
  if (totalSales !== undefined && totalSales >= 0) {
    const color = getSimpleSalesColor(totalSales, themeKey);
    // Temporarily bypass applyColorAdjustments to test raw colors
    return color; // Direct return without adjustments
    // return applyColorAdjustments(...color);
  }
  
  // Fallback to simple height-based color
  const h = height || 0;
  const baseAlpha = 242;
  
  // Simple height-based colors for fallback
  if (h >= 600) return applyColorAdjustments(0, 0, 139, baseAlpha);      // Very high
  if (h >= 500) return applyColorAdjustments(0, 71, 171, baseAlpha);     // High
  if (h >= 400) return applyColorAdjustments(30, 144, 255, baseAlpha);   // Medium-high
  if (h >= 300) return applyColorAdjustments(100, 180, 255, baseAlpha);  // Medium
  if (h >= 200) return applyColorAdjustments(135, 206, 250, baseAlpha);  // Low-medium
  if (h >= 100) return applyColorAdjustments(173, 216, 230, baseAlpha);  // Low
  return applyColorAdjustments(200, 230, 255, baseAlpha);                // Very low
}

// 기본 서울 뷰 설정 상수 (3D 모드 기본)
const DEFAULT_SEOUL_VIEW = {
  longitude: 126.978,
  latitude: 37.5765,
  zoom: 10.8,
  pitch: 40,  // 옆에서 본 각도로 설정 (side view angle)
  bearing: 6,  // 3D 방향으로 설정
  minZoom: 5,
  maxZoom: 13
} as const

// 줌 설정 통합 관리
const ZOOM_SETTINGS = {
  DONG: 13,              // 동 선택시 줌 레벨
  GU: 13,                  // 구 선택시 줌 레벨
  PITCH_DONG: 40,          // 동 선택시 카메라 각도
  PITCH_GU: 30,            // 구 선택시 카메라 각도
  TRANSITION_DURATION: 1500,
  TRANSITION_SPEED: 1.2
} as const

export default function HexagonScene() {
  const mapRef = useRef<MapRef>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const [showChartPanel, setShowChartPanel] = useState(true)
  const [currentThemeState, setCurrentThemeState] = useState(getCurrentTheme)
  const [currentThemeKey, setCurrentThemeKey] = useState('blue') // Default to blue theme for districts
  const [is3DMode, setIs3DMode] = useState(false) // 3D 모드는 기본적으로 OFF (사용자가 토글해야 활성화)
  const [themeAdjustments, setThemeAdjustments] = useState({ opacity: 100, brightness: 0, saturation: 0, contrast: 0 })
  
  // Listen for theme adjustment changes
  useEffect(() => {
    const handleThemeAdjustments = (event: CustomEvent) => {
      setThemeAdjustments(event.detail)
    }
    
    window.addEventListener('themeAdjustmentsChanged', handleThemeAdjustments as EventListener)
    
    return () => {
      window.removeEventListener('themeAdjustmentsChanged', handleThemeAdjustments as EventListener)
    }
  }, [])
  
  // 레이어 상태 관리
  const {
    layerConfig,
    hexagonData,
    climateData,
    isDataLoading,
    dataError,
    colorMode,
    
    selectedHour,
    setVisible,
    setCoverage,
    setUpperPercentile,
    setColorMode,
    setSelectedHour,
    resetConfig,
    setHoveredObject,
    setSelectedObject,
    // 애니메이션 관련 상태 및 함수들
    setAnimationEnabled,
    setAnimationSpeed,
    setWaveAmplitude,
    isAnimating,
    toggleAnimation,
    onAnimationInteractionStart,
    onAnimationInteractionEnd,
    
    // 회전 애니메이션 관련 상태 및 함수들
    rotationEnabled,
    rotationSpeed,
    rotationDirection,
    isRotating,
    shouldRotate,
    rotationDirectionText,
    bearingDisplay,
    setRotationEnabled,
    setRotationSpeed,
    setRotationDirection,
    toggleRotation,
    updateBearing,
    onRotationInteractionStart,
    onRotationInteractionEnd,
    
    // Hierarchical filter states and functions
    selectedGu,
    selectedGuCode,
    selectedDong,
    selectedDongCode,
    selectedBusinessType,
    selectedSubCategory,
    setSelectedGu,
    setSelectedGuCode,
    setSelectedDong,
    setSelectedDongCode,
    setSelectedBusinessType,
    setSelectedSubCategory,
    
    // Date filter
    selectedDate,
    setSelectedDate,
    
    // Timeline animation states and functions
    timelineAnimationEnabled,
    isTimelinePlaying,
    timelineSpeed,
    currentMonthIndex,
    monthlyDates,
    setTimelineAnimationEnabled,
    setIsTimelinePlaying,
    setTimelineSpeed,
    toggleTimelineAnimation,
    
  } = useLayerState()
  
  // 기본 지도 상태
  const [currentLayer, setCurrentLayer] = useState("very-dark")
  const [currentTime, setCurrentTime] = useState(100)
  const [showHint, setShowHint] = useState(true)
  const [showBoundary, setShowBoundary] = useState(false)
  const [showSeoulBase, setShowSeoulBase] = useState(false)
  const [showDistrictLabels, setShowDistrictLabels] = useState(false) // 구 이름 표시 (기본값: 꺼짐)
  const [showDongLabels, setShowDongLabels] = useState(false) // 동 이름 표시
  const [chartPanelWidth, setChartPanelWidth] = useState<number | undefined>(undefined) // 차트 패널 너비
  
  // DeckGL 뷰 상태 - controlled component pattern for synchronization
  const [viewState, setViewState] = useState<MapViewState>({
    ...DEFAULT_SEOUL_VIEW,
    bearing: 0  // 초기 bearing은 0으로 설정
  })
  
  // 드래그 상태 추가 - 성능 최적화용
  const [isDragging, setIsDragging] = useState(false)
  
  // 회전 제어를 위한 ref
  const rotationEnabledRef = useRef(false)
  const userInteractingRef = useRef(false)
  const currentBearingRef = useRef(0)
  
  // Track programmatic vs user-initiated view changes to prevent infinite loops
  const isProgrammaticUpdateRef = useRef(false)

  // 서울 좌표
  const SEOUL_COORDINATES: [number, number] = [126.978, 37.5665]
  
  // 기본 뷰로 리셋하는 재사용 함수
  const resetToDefaultView = useCallback((transitionDuration = 800) => {
    isProgrammaticUpdateRef.current = true
    setViewState({
      ...DEFAULT_SEOUL_VIEW,
      transitionDuration,
      transitionInterpolator: new FlyToInterpolator(),
      transitionEasing: (t: number) => t * (2 - t)
    })
    
    // Reset programmatic flag after transition (immediate for better responsiveness)
    isProgrammaticUpdateRef.current = false
  }, [])
  
  // 통합 줌 처리 함수 - 3D 폴리곤 클릭과 필터 패널 선택 모두에서 사용
  const handleDistrictZoom = useCallback((guName: string, dongName?: string | null) => {
    // 동 중심점 우선 사용
    const dongCenter = dongName ? getDistrictCenter('동', dongName) : null
    const center = dongCenter || getDistrictCenter('구', guName)
    
    if (center) {
      isProgrammaticUpdateRef.current = true
      setViewState(prev => ({
        ...prev,
        longitude: center[0],
        latitude: center[1],
        zoom: dongCenter ? ZOOM_SETTINGS.DONG : ZOOM_SETTINGS.GU,
        pitch: dongCenter ? ZOOM_SETTINGS.PITCH_DONG : ZOOM_SETTINGS.PITCH_GU,
        bearing: prev.bearing || 0,
        transitionDuration: ZOOM_SETTINGS.TRANSITION_DURATION,
        transitionInterpolator: new FlyToInterpolator({ speed: ZOOM_SETTINGS.TRANSITION_SPEED }),
        transitionEasing: (t: number) => t * t * (3.0 - 2.0 * t)
      }))
      
      // Reset programmatic flag (immediate for better responsiveness)
      isProgrammaticUpdateRef.current = false
    }
  }, [setViewState])
  
  // Handle filter panel changes - simplified to prevent loops
  const handleFilterChange = useCallback((filters: FilterState) => {
    // Directly update states without checking current values
    // This prevents unnecessary re-renders and loops
    // Removed console.log for performance
    setSelectedGu(filters.selectedGu)
    setSelectedGuCode(filters.selectedGuCode)
    setSelectedDong(filters.selectedDong)
    setSelectedDongCode(filters.selectedDongCode)
    setSelectedBusinessType(filters.selectedBusinessType)
    setSelectedDate(filters.selectedDate || null)
    
    // 필터에서 행정동 선택시 통합 줌 함수 사용
    if (filters.selectedDong && filters.selectedGu) {
      handleDistrictZoom(filters.selectedGu, filters.selectedDong)
    } else if (filters.selectedGu && !filters.selectedDong) {
      // 구만 선택시: 서울 전체 뷰 유지, 하이라이트만 표시
      console.log('[GuSelection] Maintaining Seoul-wide view with district highlight')
      // 뷰포트 변경하지 않음 - 하이라이트만 표시됨
    }
  }, [setSelectedGu, setSelectedGuCode, setSelectedDong, setSelectedDongCode, setSelectedBusinessType, setSelectedDate, handleDistrictZoom])
  
  // Hover state for districts
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
  

  // District selection hook
  const districtSelection = useDistrictSelection({ 
    mapRef,
    onDistrictSelect: (districtName, feature) => {
      console.log('Selected district:', districtName)
      
      // Update filter panel when map is clicked
      if (feature?.layer?.id === 'sgg-fill') {
        setSelectedGu(districtName)
        setSelectedDong(null)  // Clear dong when gu is selected
      } else if (feature?.layer?.id === 'dong-fill') {
        setSelectedDong(districtName)
        // Don't change gu when dong is selected (dong belongs to current gu)
      }
    }
  })
  
  // District GeoJSON data
  const [sggData, setSggData] = useState<any>(null)
  const [dongData, setDongData] = useState<any>(null)
  const [jibData, setJibData] = useState<any>(null)
  
  // 3D용 분리된 폴리곤 데이터
  const [sggData3D, setSggData3D] = useState<any>(null)
  const [dongData3D, setDongData3D] = useState<any>(null)
  
  // 동별 매출 데이터 Map (dongCode -> totalSales)
  const [dongSalesMap, setDongSalesMap] = useState<Map<number, number>>(new Map())
  // 동별 업종별 매출 데이터 Map (dongCode -> (businessType -> sales))
  const [dongSalesByTypeMap, setDongSalesByTypeMap] = useState<Map<number, Map<string, number>>>(new Map())
  
  // 3D 높이 스케일 조정값 (기본값: 1억원 = 1 단위)
  const [heightScale, setHeightScale] = useState<number>(500000000) // 5억원 단위로 증가 (높이 감소)
  
  // Height interpolation for smooth timeline animations
  const heightInterpolation = useHeightInterpolation({
    duration: timelineAnimationEnabled ? 1200 : 800,  // Longer duration for timeline animation
    easing: 'smooth',  // Smooth easing for natural motion
    enabled: is3DMode,  // Only enable in 3D mode for performance
    fps: 60  // Target 60 FPS
  })
  
  // Mesh layer states
  const [showMeshLayer, setShowMeshLayer] = useState<boolean>(true)  // Default to showing mesh layer
  const [meshWireframe, setMeshWireframe] = useState<boolean>(true)  // Default to wireframe on
  const [meshResolution, setMeshResolution] = useState<number>(120)  // Ultra high resolution 120x120 grid for detailed visualization
  const [meshColor, setMeshColor] = useState<string>('#FFFFFF')  // Default white color
  
  // Progressive rendering states for performance
  const [deferredLayersLoaded, setDeferredLayersLoaded] = useState(false)
  const [criticalLayersLoaded, setCriticalLayersLoaded] = useState(false)
  
  // Helper function to handle dong click from text labels
  const handleDongClick = useCallback((dongName: string) => {
    if (!dongName || !selectedGu) return
    
    setSelectedDong(dongName)
    const dongCode = getDongCode(selectedGu, dongName)
    if (dongCode) {
      setSelectedDongCode(dongCode)
    }
  }, [selectedGu, setSelectedDong, setSelectedDongCode])

  // Helper function to calculate polygon centroid
  const calculatePolygonCentroid = useCallback((coordinates: number[][][]) => {
    if (!coordinates || coordinates.length === 0) return null
    
    // Get the outer ring of the polygon
    const ring = coordinates[0]
    if (!ring || ring.length === 0) return null
    
    let sumX = 0
    let sumY = 0
    let count = 0
    
    ring.forEach(coord => {
      if (coord && coord.length >= 2) {
        sumX += coord[0]
        sumY += coord[1]
        count++
      }
    })
    
    if (count === 0) return null
    return [sumX / count, sumY / count]
  }, [])


  const handleLayerChange = (layer: string) => {
    setCurrentLayer(layer)
  }

  const handleTimeChange = (time: number) => {
    setCurrentTime(time)
  }
  
  // 구 이름 클릭 핸들러
  const handleDistrictLabelClick = useCallback((districtName: string) => {
    console.log('District label clicked:', districtName)
    setSelectedGu(districtName)
    setSelectedDong(null)
    // 구 코드 설정
    const guCode = getDistrictCode(districtName)
    if (guCode) {
      setSelectedGuCode(guCode)
    }
    setSelectedDongCode(null)
    
    // 구 라벨 클릭시: 서울 전체 뷰 유지, 하이라이트만 표시
    // 줌인하지 않음
    console.log('[District Label Click] Selected gu:', districtName, ' - maintaining Seoul view')
  }, [setSelectedGu, setSelectedDong, setSelectedGuCode, setSelectedDongCode])
  
  // 전체 초기화 함수 - 필터, 레이어, 뷰 모두 리셋
  const handleFullReset = useCallback(() => {
    // 1. 레이어 설정 초기화
    resetConfig()
    
    // 2. 필터 상태 초기화
    setSelectedGu(null)
    setSelectedDong(null)
    setSelectedBusinessType(null)
    setSelectedSubCategory(null)
    
    // 3. 표시 모드를 simple로 리셋
    
    // 4. 뷰포트를 서울 전체로 리셋 (재사용 함수 사용)
    resetToDefaultView()
  }, [resetConfig, setSelectedGu, setSelectedDong, setSelectedSubCategory, resetToDefaultView])

  // 3D 모드 전환 핸들러
  const handle3DModeToggle = useCallback((enabled: boolean) => {
    setIs3DMode(enabled)
    
    // 카메라 각도 조정
    if (enabled) {
      // 3D 모드: pitch와 bearing 설정
      isProgrammaticUpdateRef.current = true
      setViewState(prev => ({
        ...prev,
        pitch: 60,
        bearing: -15,
        transitionDuration: 1200,
        transitionInterpolator: new FlyToInterpolator(),
        transitionEasing: (t: number) => t * (2 - t)
      }))
      setTimeout(() => {
        isProgrammaticUpdateRef.current = false
      }, 1300)
    } else {
      // 2D 모드로 복귀
      isProgrammaticUpdateRef.current = true
      setViewState(prev => ({
        ...prev,
        pitch: 0,
        bearing: 0,
        transitionDuration: 1000,
        transitionInterpolator: new FlyToInterpolator(),
        transitionEasing: (t: number) => t * (2 - t)
      }))
      setTimeout(() => {
        isProgrammaticUpdateRef.current = false
      }, 1100)
    }
  }, [])

  // Official deck.gl rotation pattern implementation (fixed with ref)
  const rotateCamera = useCallback(() => {
    if (!rotationEnabledRef.current || userInteractingRef.current) {
      return
    }
    
    // Use ref to get current bearing instead of closure value
    const currentBearing = currentBearingRef.current
    const increment = 30 * rotationSpeed * (rotationDirection === 'clockwise' ? 1 : -1)
    const nextBearing = currentBearing + increment
    const normalizedBearing = nextBearing >= 360 ? nextBearing - 360 : (nextBearing < 0 ? nextBearing + 360 : nextBearing)
    
    // Update ref immediately
    currentBearingRef.current = normalizedBearing
    
    // Calculate transition duration based on speed (slower speed = longer duration)
    const transitionDuration = Math.max(500, 2000 / rotationSpeed)
    
    // Update bearing state for UI display
    updateBearing(normalizedBearing)
    
    // Set programmatic flag for rotation animation
    isProgrammaticUpdateRef.current = true
    setViewState(prevViewState => {
      return {
        ...prevViewState,
        bearing: normalizedBearing,
        transitionDuration,
        transitionInterpolator: new LinearInterpolator(['bearing']),
        onTransitionEnd: () => {
          isProgrammaticUpdateRef.current = false
          if (rotationEnabledRef.current) {
            rotateCamera()
          }
        }
      }
    })
  }, [rotationSpeed, rotationDirection, rotationDirectionText, updateBearing])

  // Update rotation enabled ref when props change
  useEffect(() => {
    rotationEnabledRef.current = shouldRotate
    if (shouldRotate && !userInteractingRef.current) {
      // Start rotation with a small delay to ensure state is updated
      const timer = setTimeout(rotateCamera, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldRotate, rotateCamera])
  
  // Start/stop dash animation for selected district
  useEffect(() => {
    if (districtSelection.selectedFeature && districtSelection.selectionMode) {
      districtSelection.startDashAnimation()
    } else {
      districtSelection.stopDashAnimation()
    }
    
    return () => {
      districtSelection.stopDashAnimation()
    }
  }, [districtSelection.selectedFeature, districtSelection.selectionMode])
  
  // Selection updates now handled by Deck.gl unified layers through updateTriggers
  // No manual Mapbox layer manipulation needed
  useEffect(() => {
    if (districtSelection.selectedDistrict) {
      // Keep animation active
      const animationTimer = setTimeout(() => {
        // Animation continues indefinitely for selected district
      }, 800)
      
      return () => clearTimeout(animationTimer)
    } else {
      // Clear animation when no district is selected
    }
  }, [districtSelection.selectedDistrict])

  // Bearing sync handled by DeckGL viewState synchronization
  // No manual Mapbox bearing sync needed

  // Initialize bearing ref
  useEffect(() => {
    currentBearingRef.current = viewState.bearing || 0
  }, [])

  // Find which dong a coordinate belongs to
  const findDongAtCoordinate = useCallback((
    lng: number,
    lat: number,
    dongBoundaries: any[]
  ): { dongName: string; dongCode: number; sales?: number } | null => {
    if (!dongBoundaries || dongBoundaries.length === 0) {
      return null
    }
    
    const point = turf.point([lng, lat])
    
    for (const feature of dongBoundaries) {
      try {
        if (turf.booleanPointInPolygon(point, feature)) {
          const dongCode = feature.properties?.['행정동코드'] || 
                          feature.properties?.H_CODE || 
                          feature.properties?.ADM_DR_CD ||
                          feature.properties?.dongCode ||
                          feature.properties?.dong_code ||
                          0
          
          const dongName = feature.properties?.ADM_DR_NM || 
                          feature.properties?.DONG_NM || 
                          feature.properties?.['행정동'] ||
                          'Unknown'
          
          return {
            dongName,
            dongCode: Number(dongCode),
            sales: dongSalesMap?.get(Number(dongCode))
          }
        }
      } catch {
        // Skip invalid features
        continue
      }
    }
    
    return null
  }, [dongSalesMap])

  // Handle unified DeckGL hover for all layers
  const handleUnifiedHover = useCallback((info: PickingInfo) => {
    // Handle hexagon layer hover
    if (info.layer?.id?.includes('hexagon') && info.object && info.object.originalData) {
      const dongName = info.object.originalData.dongName
      setHoveredObject(info.object)
      
      // Set hovered district for district-wide highlighting
      if (dongName) {
        setHoveredDistrict(dongName)
      }
    } 
    // Handle district polygon hover (from unified layers)
    else if (info.layer?.id?.includes('unified-sgg') || info.layer?.id?.includes('unified-dong')) {
      const feature = info.object
      if (feature && feature.properties) {
        const districtName = feature.properties?.SIGUNGU_NM || 
                           feature.properties?.GU_NM || 
                           feature.properties?.ADM_DR_NM || 
                           feature.properties?.DONG_NM
        if (districtName) {
          setHoveredDistrict(districtName)
        }
      }
    }
    else {
      setHoveredObject(null)
      setHoveredDistrict(null)
    }
  }, [setHoveredObject])

  // Handle unified DeckGL click for all layers
  const handleUnifiedClick = useCallback((info: PickingInfo) => {
    // Handle hexagon layer click
    if (info.layer?.id?.includes('hexagon') && info.object && info.object.originalData) {
      const { guName, dongName, guCode, dongCode } = info.object.originalData
      
      // Set district selections with both names and codes
      if (dongName && guName) {
        // 동 클릭시: 구와 동 모두 설정
        setSelectedGu(guName)
        const calculatedGuCode = guCode || getDistrictCode(guName)
        const calculatedDongCode = dongCode || getDongCode(guName, dongName)
        
        setSelectedGuCode(calculatedGuCode)
        setSelectedDong(dongName)
        setSelectedDongCode(calculatedDongCode)
        
        // Removed console.log for performance
      } else if (guName) {
        // 구 클릭시: 구만 설정 (서울 전체 뷰 유지)
        setSelectedGu(guName)
        const calculatedGuCode = guCode || getDistrictCode(guName)
        setSelectedGuCode(calculatedGuCode)
        setSelectedDong(null)
        setSelectedDongCode(null)
        
        // Removed console.log for performance
      }
    }
    // Handle district polygon click (from unified layers)
    else if (info.layer?.id?.includes('unified-sgg') && info.object && info.object.properties) {
      const guName = info.object.properties?.SIGUNGU_NM || info.object.properties?.GU_NM
      if (guName) {
        setSelectedGu(guName)
        const calculatedGuCode = getDistrictCode(guName)
        setSelectedGuCode(calculatedGuCode)
        setSelectedDong(null)
        setSelectedDongCode(null)
        // Removed console.log for performance
      }
    }
    else if (info.layer?.id?.includes('unified-dong') && info.object && info.object.properties) {
      const dongName = info.object.properties?.ADM_DR_NM || info.object.properties?.DONG_NM
      const guName = info.object.properties?.guName || info.object.properties?.['자치구']
      if (dongName && guName) {
        setSelectedGu(guName)
        setSelectedDong(dongName)
        const calculatedGuCode = getDistrictCode(guName)
        const calculatedDongCode = getDongCode(guName, dongName)
        setSelectedGuCode(calculatedGuCode)
        setSelectedDongCode(calculatedDongCode)
        // Removed console.log for performance
      }
    }
    // Handle district labels click
    else if (info.layer?.id?.includes('district-labels') && info.object) {
      const guName = info.object.nameKr
      if (guName) {
        setSelectedGu(guName)
        const calculatedGuCode = getDistrictCode(guName)
        setSelectedGuCode(calculatedGuCode)
        setSelectedDong(null)
        setSelectedDongCode(null)
        // Removed console.log for performance
      }
    }
  }, [setSelectedGu, setSelectedGuCode, setSelectedDong, setSelectedDongCode])

  
  // Temporary placeholder - actual implementation will be defined after optimizedDongMap
  let createDong3DPolygonLayers: any = useCallback(() => {
    if (!dongData3D || !dongData3D.features) return []
    
    return [
      new PolygonLayer({
        id: 'dong-3d-polygon',
        data: dongData3D.features,
        pickable: true,
        extruded: true,
        wireframe: false,
        filled: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        
        // GPU Optimization Parameters
        parameters: COMMON_GPU_PARAMS,
        
        // Geometry
        getPolygon: (d: any) => {
          // Handle both Polygon and MultiPolygon
          if (d.geometry.type === 'MultiPolygon') {
            // Return the first polygon for MultiPolygon
            return d.geometry.coordinates[0][0]
          }
          return d.geometry.coordinates[0]
        },
        
        // Height - 사전 계산된 높이 사용
        getElevation: (d: any) => {
          const guName = d.properties.guName || d.properties['자치구']
          const dongCode = d.properties.ADM_DR_CD || 
                          d.properties.dongCode || 
                          d.properties.dong_code ||
                          d.properties['행정동코드'] ||
                          d.properties.DONG_CD
          
          // Use pre-calculated height from properties (will be updated after optimizedDongMap is available)
          const height = d.properties.height || 0
          
          // 동 선택 시: 선택된 구의 동만 원래 높이
          if (selectedDong) {
            if (guName === selectedGu) {
              return height
            }
            return 10 // 다른 구의 동들은 낮은 높이
          }
          
          // 구 선택 시: 선택된 구의 동만 표시
          if (selectedGu && guName !== selectedGu) {
            return 0 // 숨김
          }
          
          // Add elevation boost when gu is hovered for 3D pop-out effect
          if (hoveredDistrict === guName) {
            return height * 1.2  // 20% elevation boost for better visibility
          }
          
          return height
        },
        
        elevationScale: 1,
        
        // 사전 계산된 색상 사용
        getFillColor: (d: any) => {
          const dongName = d.properties.ADM_DR_NM || d.properties.DONG_NM || d.properties['행정동']
          const guName = d.properties.guName || d.properties['자치구']
          
          // Try multiple ways to get dongCode
          const dongCode = d.properties.ADM_DR_CD || 
                          d.properties.dongCode || 
                          d.properties.dong_code ||
                          d.properties['행정동코드'] ||
                          d.properties.DONG_CD;
          
          // Use existing calculation (will be replaced after optimizedDongMap is available)
          const height = d.properties.height || 0
          const totalSales = dongCode ? dongSalesMap.get(Number(dongCode)) || 0 : 0
          
          // Debug logging for 40-step gradient
          if (!(window as any)._firstLogDone || Math.random() < 0.005) {
            const step = 125000000; // 1.25억
            const colorIndex = Math.min(Math.floor(totalSales / step), 39);
            console.log('🎨 40-Step Gradient:', {
              dongName,
              totalSales: totalSales ? `${(totalSales / 100000000).toFixed(1)}억` : '0',
              colorIndex: `${colorIndex}/39`,
              theme: currentThemeKey
            })
            if (!(window as any)._firstLogDone) {
              (window as any)._firstLogDone = true;
            }
          }
          
          // Use modern color system for 'modern' and 'adjacent' themes
          if (currentThemeKey.startsWith('modern') || currentThemeKey === 'modern' || currentThemeKey === 'adjacent') {
            // Check if this dong is selected
            const isThisDongSelected = selectedDong && dongName === selectedDong
            // Check if this dong is in selected gu
            const isInSelectedGu = selectedGu && guName === selectedGu
            // Check if this dong is being hovered directly OR if its gu is being hovered
            const isHovered = hoveredDistrict === dongName || hoveredDistrict === guName
            
            // Special strong highlighting when gu is hovered
            if (hoveredDistrict === guName) {
              // Use bright yellow-gold highlight for entire gu
              return [255, 230, 100, 255]
            }
            
            // Dimmed color for non-selected areas when something is selected
            if ((selectedGu || selectedDong) && !isInSelectedGu) {
              return getDimmedColor()
            }
            
            return getModernDistrictColor(
              guName,
              dongName,
              height,
              currentThemeKey,
              isThisDongSelected,
              isHovered
            )
          }
          
          // Fallback to legacy color system with sales-based intensity
          if (selectedDong && dongName === selectedDong) {
            return convertColorExpressionToRGB(height, 'bright', guName, dongName, true, false, totalSales)
          }
          // Strong highlight if gu is hovered (show district boundary effect)
          if (hoveredDistrict === guName) {
            // Use bright golden highlight for entire gu
            return [255, 215, 0, 255]  // Gold color with full opacity
          }
          if (selectedGu && guName === selectedGu) {
            return convertColorExpressionToRGB(height, currentThemeKey, guName, dongName, false, false, totalSales)
          }
          if (selectedGu || selectedDong) {
            return [51, 51, 51, 200]
          }
          return convertColorExpressionToRGB(height, currentThemeKey, guName, dongName, false, false, totalSales)
        },
        
        // Modern edge rendering with district-based colors
        getLineColor: (d: any) => {
          const guName = d.properties.guName || d.properties['자치구']
          const dongName = d.properties.ADM_DR_NM || d.properties.DONG_NM || d.properties['행정동']
          
          if (currentThemeKey.startsWith('modern') || currentThemeKey === 'modern' || currentThemeKey === 'adjacent') {
            const isHighlighted = (selectedDong && dongName === selectedDong) || 
                                 hoveredDistrict === dongName ||
                                 hoveredDistrict === guName  // Highlight edges when gu is hovered
            return getModernEdgeColor(guName, isHighlighted, currentThemeKey)
          }
          
          // Strong highlight edges when gu is hovered
          if (hoveredDistrict === guName) {
            return [255, 255, 0, 255]  // Bright pure yellow edges with full opacity for hovered gu
          }
          
          // Fallback to simple white edges
          return [255, 255, 255, 30]
        },
        // Dynamic line width based on hover state
        getLineWidth: (d: any) => {
          const guName = d.properties.guName || d.properties['자치구']
          if (hoveredDistrict === guName) {
            return 3  // Thicker lines for hovered gu
          }
          return 1  // Default line width
        },
        lineWidthMinPixels: 1.5,
        lineWidthMaxPixels: 4,
        
        // Modern material properties for sophisticated 3D effect
        material: (currentThemeKey.startsWith('modern') || currentThemeKey === 'modern' || currentThemeKey === 'adjacent') 
          ? getModernMaterial(currentThemeKey)
          : {
              ambient: 0.35,
              diffuse: 0.6,
              shininess: 32,
              specularColor: [60, 64, 70]
            },
        
        // Events
        onHover: (info: any) => {
          if (info.object) {
            const properties = info.object.properties
            setHoveredDistrict(properties.ADM_DR_NM || properties.DONG_NM || properties['행정동'])
          } else {
            setHoveredDistrict(null)
          }
        },
        
        onClick: (info: any) => {
          if (info.object) {
            const props = info.object.properties
            const dongName = props.ADM_DR_NM || props.DONG_NM || props['행정동']
            const guName = props.guName || props['자치구']
            const dongCode = props.ADM_DR_CD || props.DONG_CD || props['행정동코드']
            const guCode = props.SIG_CD || props.SGG_CD || props.GU_CD
            
            // 선택 상태 업데이트
            if (dongName && guName) {
              setSelectedDong(dongName)
              setSelectedGu(guName)
              setSelectedDongCode(dongCode || getDongCode(guName, dongName))
              setSelectedGuCode(guCode || getDistrictCode(guName))
              
              // 통합 줌 함수 사용
              handleDistrictZoom(guName, dongName)
            }
          }
        },
        
        // Transitions for smooth animations
        transitions: {
          getElevation: timelineAnimationEnabled && isTimelinePlaying ? 0 : 300,  // Disable deck.gl transition during timeline animation (we use interpolation instead)
          getFillColor: 300,  // Faster color transition
          getLineWidth: 200   // Quick line width transition
        },
        
        // Update triggers for reactive updates
        updateTriggers: {
          getElevation: [selectedGu, selectedDong, dongSalesMap, heightScale, selectedDate],
          getFillColor: [selectedGu, selectedDong, currentThemeKey, dongSalesMap, themeAdjustments, selectedDate],
          getLineColor: [selectedGu, selectedDong, currentThemeKey, themeAdjustments, selectedDate]
        }
      })
    ]
  }, [
    dongData3D, 
    selectedGu, 
    selectedDong, 
    selectedBusinessType, 
    currentThemeKey, 
    dongSalesMap,
    heightScale,
    setSelectedDong,
    setSelectedGu,
    setSelectedDongCode,
    setSelectedGuCode,
    setHoveredDistrict,
    setViewState,
    hoveredDistrict,
    themeAdjustments
  ])
  
  // Create lighting configuration for 3D mesh rendering
  const lightingEffect = useMemo(() => {
    // Ambient light for base illumination
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 0.5
    })
    
    // Directional light for main illumination (simulating sunlight)
    const directionalLight = new DirectionalLight({
      direction: [-1, -3, -1],  // Light coming from upper right
      color: [255, 255, 255],
      intensity: 1.0
    })
    
    // Create lighting effect with both lights
    return new LightingEffect({
      ambientLight,
      directionalLight
    })
  }, [])  // Lighting configuration is constant
  
  // Use pre-generated mesh layer for better performance with real sales data
  const preGeneratedMeshLayer = usePreGeneratedSeoulMeshLayer({
    resolution: meshResolution,
    visible: showMeshLayer,
    wireframe: meshWireframe,
    opacity: meshWireframe ? 1 : (is3DMode ? 0.6 : 0.8),
    pickable: false,  // Disabled to prevent tooltips and highlighting
    useMask: true,  // Enable masking to clip wireframe at Seoul boundaries
    color: meshColor,  // Pass the mesh color
    dongBoundaries: dongData3D?.features,  // Pass dong boundaries for sales mapping
    dongSalesMap: dongSalesMap,  // Pass sales data map
    salesHeightScale: heightScale  // Use the same height scale as polygon layer
    // onHover and onClick removed - mesh layer is purely visual
  }, dongData3D?.features)
  
  // Load Seoul boundary data for unified layers
  const [seoulBoundaryData, setSeoulBoundaryData] = useState<FeatureCollection | null>(null)
  
  useEffect(() => {
    // Load Seoul boundary GeoJSON
    fetch('/seoul_boundary.geojson')
      .then(res => res.json())
      .then(data => setSeoulBoundaryData(data))
      .catch(err => console.warn('Failed to load Seoul boundary:', err))
  }, [])

  // Create unified Deck.gl layers to replace Mapbox native layers
  const unifiedLayers = useUnifiedDeckGLLayers({
    sggData,
    dongData,
    jibData,
    dongData3D,
    seoulBoundaryData,
    is3DMode,
    isDragging,
    viewState,
    selectedGu,
    selectedDong,
    hoveredDistrict,
    sggVisible: districtSelection.sggVisible,
    dongVisible: districtSelection.dongVisible,
    jibVisible: districtSelection.jibVisible,
    showBoundary,
    dongSalesMap,
    heightScale,
    currentThemeKey,
    onHover: (info: PickingInfo) => {
      if (info.object) {
        const feature = info.object
        const name = feature.properties?.SIGUNGU_NM || 
                    feature.properties?.ADM_DR_NM || 
                    feature.properties?.DONG_NM
        setHoveredDistrict(name)
      } else {
        setHoveredDistrict(null)
      }
    },
    onClick: (info: PickingInfo) => {
      if (info.object) {
        const feature = info.object
        const props = feature.properties
        
        // 동 클릭 처리
        if (props.ADM_DR_NM || props.DONG_NM) {
          const dongName = props.ADM_DR_NM || props.DONG_NM
          const guName = props.guName || props['자치구']
          const dongCode = props.ADM_DR_CD || props.DONG_CD
          const guCode = props.SIG_CD || props.SGG_CD || props.GU_CD
          
          if (dongName && guName) {
            setSelectedDong(dongName)
            setSelectedGu(guName)
            setSelectedDongCode(dongCode || getDongCode(guName, dongName))
            setSelectedGuCode(guCode || getDistrictCode(guName))
            handleDistrictZoom(guName, dongName)
          }
        }
        // 구 클릭 처리
        else if (props.SIGUNGU_NM || props.GU_NM) {
          const guName = props.SIGUNGU_NM || props.GU_NM
          setSelectedGu(guName)
          setSelectedGuCode(getDistrictCode(guName))
          setSelectedDong(null)
          setSelectedDongCode(null)
        }
      }
    }
  })
  
  // Progressive layer loading for better initial render performance
  useEffect(() => {
    // Load critical layers immediately
    setCriticalLayersLoaded(true)
    
    // Defer non-critical layers (immediate loading for better UX)
    setDeferredLayersLoaded(true)
  }, [])
  
  // Combine all deck.gl layers - Using conditional rendering for better performance (no cloning)
  const deckLayers = useMemo(() => {
    const layers = []
    
    // Critical layer: Mesh (conditional rendering instead of cloning)
    if (preGeneratedMeshLayer && criticalLayersLoaded && showMeshLayer) {
      layers.push(preGeneratedMeshLayer)
    }
    
    // Deferred layers: Load after initial render
    if (deferredLayersLoaded) {
      // Include unified 2D layers only in 2D mode (conditional rendering instead of cloning)
      if (unifiedLayers && unifiedLayers.length > 0 && !is3DMode) {
        layers.push(...unifiedLayers)
      }
      
      // Include 3D polygon layers only in 3D mode (conditional rendering instead of cloning)
      if (dongData3D && is3DMode) {
        const dong3DLayers = createDong3DPolygonLayers()
        layers.push(...dong3DLayers)
      }
    }
    
    
    // Add District Labels TextLayer (LAST - renders on top of everything)
    if (showDistrictLabels) {
      const districtTextLayers = createDistrictLabelsTextLayer({
        visible: showDistrictLabels && viewState.zoom >= 10,
        viewState,
        selectedGu,
        selectedDong,
        hoveredDistrict,
        onClick: handleDistrictLabelClick,
        onHover: (info) => {
          if (info.object) {
            setHoveredDistrict(info.object.nameKr)
          } else {
            setHoveredDistrict(null)
          }
        }
      })
      layers.push(...districtTextLayers)
      
      // Add dong labels when a gu is selected
      if (selectedGu && dongData3D) {
        const dongLabelData = dongData3D.features?.filter((feature: any) => {
          const guName = feature.properties?.guName || feature.properties?.['자치구']
          return guName === selectedGu
        }).map((feature: any) => ({
          properties: {
            dongName: feature.properties?.ADM_DR_NM || feature.properties?.DONG_NM || feature.properties?.['행정동'],
            centroid: calculatePolygonCentroid(feature.geometry?.coordinates),
            coordinates: calculatePolygonCentroid(feature.geometry?.coordinates)
          }
        }))
        
        // 동 라벨 레이어 (showDongLabels가 true일 때만 추가)
        if (showDongLabels) {
          const dongTextLayers = createDongLabelsTextLayer({
            dongData: dongLabelData,
            selectedGu,
            selectedDong,
            viewState,
            onClick: (dongName) => {
              handleDongClick(dongName)
            },
            onHover: (info) => {
              if (info.object) {
                setHoveredDistrict(info.object.name)
              }
            }
          })
          layers.push(...dongTextLayers)
        }
      }
    }
    
    return layers
  }, [is3DMode, dongData3D, showDistrictLabels, showDongLabels, viewState.zoom, 
      selectedGu, selectedDong, hoveredDistrict, showMeshLayer, preGeneratedMeshLayer, 
      unifiedLayers, criticalLayersLoaded, deferredLayersLoaded])  // Optimized: removed function dependencies
  
  // 기존 HexagonLayer 코드 (주석 처리)
  // const deckLayers = LayerManager({
  //   data: hexagonData,
  //   config: layerConfig,
  //   onHover: (info: PickingInfo) => {
  //     console.log('[HexagonLayer3D] onHover triggered:', {
  //       hasObject: !!info.object,
  //       object: info.object,
  //       x: info.x,
  //       y: info.y,
  //       picked: info.picked,
  //       layerId: info.layer?.id
  //     })
  //     setHoveredObject(info.object)
  //   },
  //   onClick: (info: PickingInfo) => {
  //     console.log('[HexagonLayer3D] onClick triggered:', info)
  //     setSelectedObject(info.object)
  //   },
  //   onAnimationInteractionStart,
  //   onAnimationInteractionEnd
  // })

  // 자치구 선택 디버깅


  // 툴팁 핸들러 (Context7 권장 패턴)
  const getTooltip = (info: PickingInfo) => {
    if (!info.object) {
      return null
    }
    
    try {
      // dong-3d-polygon 레이어 처리 (3D 행정동 폴리곤)
      if (info.layer?.id === 'dong-3d-polygon' && info.object) {
        const properties = info.object.properties
        
        // 한글과 영문 속성명 모두 체크
        const dongCode = properties['행정동코드'] || 
                        properties.ADM_DR_CD || 
                        properties.H_CODE || 
                        properties.DONG_CD ||
                        properties.dong_code ||
                        properties.dongCode
        
        const dongName = properties['행정동'] || 
                        properties.ADM_DR_NM || 
                        properties.H_DONG_NM || 
                        properties.DONG_NM || 
                        properties.EMD_NM ||
                        properties.EMD_KOR_NM ||
                        '행정동 정보 없음'
        
        const guName = properties.guName || 
                      properties['자치구'] || 
                      properties.SGG_NM || 
                      properties.SIGUNGU_NM ||
                      properties.SIG_KOR_NM ||
                      '구 정보 없음'
        
        // 업종별 매출 데이터로 총 매출 계산
        let totalSales = 0
        const businessTypeSales = dongCode ? dongSalesByTypeMap.get(Number(dongCode)) : null
        
        if (businessTypeSales && businessTypeSales.size > 0) {
          // 모든 업종의 매출을 합산하여 총 매출 계산
          totalSales = Array.from(businessTypeSales.values()).reduce((sum, sales) => sum + sales, 0)
        } else {
          // fallback으로 dongSalesMap 사용
          totalSales = dongCode ? dongSalesMap.get(Number(dongCode)) || 0 : 0
        }
        
        const salesInTenMillion = Math.round(totalSales / 10000000)
        
        // 날짜 정보 (selectedDate 사용)
        const date = selectedDate || '202401'
        
        // 선택된 업종이 있으면 해당 업종 매출, 없으면 전체 업종 표시
        let businessTypeHtml = ''
        if (selectedBusinessType && businessTypeSales) {
          const amount = businessTypeSales.get(selectedBusinessType) || 0
          businessTypeHtml = `
      <div style="margin-bottom: 8px;">
        <span style="opacity: 0.8;">💼</span> <strong>업종:</strong> ${selectedBusinessType}
      </div>
      <div style="margin-bottom: 8px;">
        <span style="opacity: 0.8;">💰</span> <strong>매출액:</strong> ${formatKoreanCurrency(amount)}
      </div>
    `
        } else if (businessTypeSales && businessTypeSales.size > 0) {
          // 상위 3개 업종 표시
          const topBusinessTypes = Array.from(businessTypeSales.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
          
          businessTypeHtml = `
      <div style="margin-bottom: 8px;">
        <span style="opacity: 0.8;">💼</span> <strong>주요 업종:</strong>
      </div>
      ${topBusinessTypes.map(([type, amount]) => `
        <div style="padding-left: 16px; font-size: 11px;">
          • ${type}: ${formatKoreanCurrency(amount)}
        </div>
      `).join('')}
    `
        }
        
        const tooltipHtml = `
<div style="font-family: 'Noto Sans KR', sans-serif;">
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">📍</span> <strong>지역:</strong> ${guName} ${dongName}
  </div>
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">💰</span> <strong>총 매출:</strong> ${formatKoreanCurrency(salesInTenMillion * 10000000)}
  </div>
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">📅</span> <strong>날짜:</strong> ${date}
  </div>
  ${businessTypeHtml}
</div>
        `.trim()
        
        return {
          html: tooltipHtml,
          style: {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            color: 'white',
            fontSize: '13px',
            padding: '14px',
            borderRadius: '8px',
            whiteSpace: 'normal',
            maxWidth: '320px',
            lineHeight: '1.6',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)'
          }
        }
      }
      
      
      // 기존 HexagonLayer의 경우 (폴백)
      const enhancedInfo = {
        ...info,
        layer: {
          ...info.layer,
          props: {
            ...info.layer?.props,
            colorMode: layerConfig.colorMode
          }
        }
      }
      
      const tooltipHtml = formatScatterplotTooltip(enhancedInfo)
      
      return {
        html: tooltipHtml,
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          color: 'white',
          fontSize: '13px',
          padding: '14px',
          borderRadius: '8px',
          whiteSpace: 'pre-line',
          maxWidth: '380px',
          lineHeight: '1.6',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)'
        }
      }
    } catch (error) {
      console.error('[Tooltip Debug] Error in getTooltip:', error)
      return {
        html: '⚠️ 툴팁 로드 중 오류 발생',
        style: {
          backgroundColor: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px'
        }
      }
    }
  }

  // [REMOVED] Mapbox native layer helper - now using Deck.gl unified layers only

  useEffect(() => {
    // 힌트 숨기기 타이머
    const hintTimer = setTimeout(() => {
      setShowHint(false)
    }, 3000)

    // 정리 함수
    return () => {
      clearTimeout(hintTimer)
    }
  }, [])
  
  // Load district data
  useEffect(() => {
    const loadData = async () => {
      const [sgg, dong, jib] = await Promise.all([
        loadDistrictData('sgg'),
        loadDistrictData('dong'),
        loadDistrictData('jib')
      ])
      
      if (sgg) {
        setSggData(sgg)
        if (sgg.features?.[0]) {
          console.log('[DataLoad] Sample sgg properties:', sgg.features[0].properties)
        }
      }
      if (dong) {
        setDongData(dong)
        if (dong.features?.[0]) {
          console.log('[DataLoad] Sample dong properties:', dong.features[0].properties)
          console.log('[DataLoad] Dong property keys:', Object.keys(dong.features[0].properties))
        }
      }
      if (jib) setJibData(jib)
    }
    
    loadData()
  }, [])
  
  // 최적화된 일별 데이터 사용 (selectedDate는 이미 YYYY-MM-DD 형식)
  const formatSelectedDate = selectedDate || '2024-01-01'
  
  // Binary 형식 사용 여부 (환경변수 또는 기본값 true)
  const USE_BINARY_FORMAT = process.env.NEXT_PUBLIC_USE_BINARY_FORMAT !== 'false'
  
  // 데이터 형식 로깅 (최초 1회만)
  useEffect(() => {
    console.log(`[Data Format] Using ${USE_BINARY_FORMAT ? 'BINARY' : 'JSON'} format for data loading`)
    if (USE_BINARY_FORMAT) {
      console.log('[Data Format] Binary format provides 97.6% size reduction and 10x faster loading')
    }
  }, [])
  
  // Binary 형식 데이터 로딩 (우선 사용)
  const binaryDataResult = useBinaryOptimizedData({ 
    selectedDate: formatSelectedDate,
    enabled: USE_BINARY_FORMAT,
    useBinary: true
  })
  
  // JSON 형식 데이터 로딩 (폴백)
  const jsonDataResult = useOptimizedMonthlyData({ 
    selectedDate: formatSelectedDate,
    enabled: !USE_BINARY_FORMAT
  })
  
  // Binary 우선, JSON 폴백
  const { 
    features: optimizedFeatures, 
    dongMap: optimizedDongMap,
    isLoading: isOptimizedLoading,
    error: optimizedError 
  } = USE_BINARY_FORMAT ? binaryDataResult : jsonDataResult
  
  // 성능 로깅 (Binary 모드에서만)
  useEffect(() => {
    if (USE_BINARY_FORMAT && binaryDataResult.loadingStats && !isOptimizedLoading) {
      console.log(`[Binary Performance] Total load time: ${binaryDataResult.loadingStats.totalTime?.toFixed(2)}ms`)
    }
  }, [USE_BINARY_FORMAT, binaryDataResult.loadingStats, isOptimizedLoading])

  // Load sales data from optimized data
  useEffect(() => {
    if (!optimizedFeatures || !optimizedDongMap) {
      console.log('[OptimizedData] Waiting for optimized data...')
      return
    }
    
    // 디버깅: optimizedDongMap 확인
    console.log(`[DEBUG] optimizedDongMap 크기: ${optimizedDongMap.size}`)
    const firstThree = Array.from(optimizedDongMap.entries()).slice(0, 3)
    firstThree.forEach(([dongCode, feature]) => {
      console.log(`[DEBUG dongMap] 동코드 ${dongCode}: height=${feature.height}, totalSales=${feature.totalSales}`)
    })

    // Removed console.log for performance
    
    // Convert optimized data to existing map format for compatibility
    const salesByDong = new Map<number, number>()
    const salesByDongAndType = new Map<number, Map<string, number>>()
    
    optimizedFeatures.forEach(feature => {
      salesByDong.set(feature.dongCode, feature.totalSales)
      
      if (feature.salesByType && Object.keys(feature.salesByType).length > 0) {
        const typeMap = new Map<string, number>()
        Object.entries(feature.salesByType).forEach(([type, amount]) => {
          typeMap.set(type, amount)
        })
        salesByDongAndType.set(feature.dongCode, typeMap)
      }
    })
    
    // Removed console.log for performance
    
    // Log min/max for reference
    const salesValues = optimizedFeatures.map(f => f.totalSales)
    if (salesValues.length > 0) {
      const minSales = Math.min(...salesValues)
      const maxSales = Math.max(...salesValues)
      console.log(`[OptimizedData] Sales range: ${minSales.toLocaleString()} - ${maxSales.toLocaleString()}`)
    }
    
    setDongSalesMap(salesByDong)
    setDongSalesByTypeMap(salesByDongAndType)
  }, [optimizedFeatures, optimizedDongMap])
  
  // Memoize dong colors for performance
  const dongColorMap = useMemo(() => {
    if (!dongData3D || !dongData3D.features) return new Map()
    
    const colorMap = new Map()
    dongData3D.features.forEach((feature: any) => {
      const dongCode = feature.properties.ADM_DR_CD || 
                      feature.properties.dongCode || 
                      feature.properties.dong_code ||
                      feature.properties['행정동코드'] ||
                      feature.properties.DONG_CD
      
      if (dongCode) {
        // Pre-calculate base color (without hover/selection state)
        const height = feature.properties.height || 0
        const guName = feature.properties.guName || feature.properties['자치구']
        const dongName = feature.properties.ADM_DR_NM || feature.properties.DONG_NM || feature.properties['행정동']
        const totalSales = dongSalesMap.get(Number(dongCode)) || 0
        
        // Use optimized data if available
        const optimizedFeature = optimizedDongMap?.get(Number(dongCode))
        let baseColor
        
        if (optimizedFeature?.fillColorRGB) {
          const themeKey = currentThemeKey === 'modern' || currentThemeKey === 'adjacent' ? 'blue' : 
                          currentThemeKey === 'bright' ? 'bright' :
                          currentThemeKey === 'green' ? 'green' :
                          currentThemeKey === 'purple' ? 'purple' :
                          currentThemeKey === 'orange' ? 'orange' : 'blue'
          baseColor = optimizedFeature.fillColorRGB[themeKey as keyof typeof optimizedFeature.fillColorRGB]
        } else {
          baseColor = convertColorExpressionToRGB(height, currentThemeKey, guName, dongName, false, false, totalSales)
        }
        
        colorMap.set(dongCode, {
          baseColor,
          guName,
          dongName
        })
      }
    })
    
    return colorMap
  }, [dongData3D, dongSalesMap, optimizedDongMap, currentThemeKey])

  // Now redefine createDong3DPolygonLayers with optimizedDongMap available
  createDong3DPolygonLayers = useCallback(() => {
    if (!dongData3D || !dongData3D.features) return []
    
    return [
      new PolygonLayer({
        id: 'dong-3d-polygon',
        data: dongData3D.features,
        pickable: true,
        extruded: true,
        wireframe: false,
        filled: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        
        // GPU Optimization Parameters
        parameters: COMMON_GPU_PARAMS,
        
        // Geometry
        getPolygon: (d: any) => {
          // Handle both Polygon and MultiPolygon
          if (d.geometry.type === 'MultiPolygon') {
            // Return the first polygon for MultiPolygon
            return d.geometry.coordinates[0][0]
          }
          return d.geometry.coordinates[0]
        },
        
        // Height - 사전 계산된 높이 사용
        getElevation: (d: any) => {
          const guName = d.properties.guName || d.properties['자치구']
          const dongCode = d.properties.ADM_DR_CD || 
                          d.properties.dongCode || 
                          d.properties.dong_code ||
                          d.properties['행정동코드'] ||
                          d.properties.DONG_CD
          
          // 최적화된 데이터에서 사전 계산된 높이 가져오기
          const optimizedFeature = dongCode && optimizedDongMap ? optimizedDongMap.get(Number(dongCode)) : null
          const height = optimizedFeature?.height || d.properties.height || 0
          
          // 디버깅: 높이 데이터 확인 (첫 3개만)
          if (dongCode && parseInt(dongCode) <= 11110115) {
            console.log(`[DEBUG getElevation] 동코드 ${dongCode}: optimizedHeight=${optimizedFeature?.height}, propertiesHeight=${d.properties.height}, finalHeight=${height}`)
          }
          
          // 동 선택 시: 선택된 구의 동만 원래 높이
          if (selectedDong) {
            if (guName === selectedGu) {
              return height
            }
            return 10 // 다른 구의 동들은 낮은 높이
          }
          
          // 구 선택 시: 선택된 구의 동만 표시
          if (selectedGu && guName !== selectedGu) {
            return 0 // 숨김
          }
          
          // Add elevation boost when gu is hovered for 3D pop-out effect
          if (hoveredDistrict === guName) {
            return height * 1.2  // 20% elevation boost for better visibility
          }
          
          return height
        },
        
        elevationScale: 1,
        
        // Use pre-calculated colors for better performance
        getFillColor: (d: any) => {
          const dongCode = d.properties.ADM_DR_CD || 
                          d.properties.dongCode || 
                          d.properties.dong_code ||
                          d.properties['행정동코드'] ||
                          d.properties.DONG_CD;
          
          // Get pre-calculated color data for performance
          const colorData = dongCode ? dongColorMap.get(dongCode) : null;
          const guName = colorData?.guName || d.properties.guName || d.properties['자치구']
          const dongName = colorData?.dongName || d.properties.ADM_DR_NM || d.properties.DONG_NM || d.properties['행정동']
          
          // Use pre-calculated base color and apply state changes
          if (colorData && colorData.baseColor) {
            // Apply hover/selection state to pre-calculated color
            if (hoveredDistrict === guName) {
              return [255, 230, 100, 255] // 호버시 하이라이트
            }
            if ((selectedGu || selectedDong) && guName !== selectedGu) {
              return getDimmedColor() // 선택되지 않은 영역 dimmed
            }
            if (selectedDong && dongName === selectedDong) {
              return [255, 200, 0, 255] // Selected dong highlight
            }
            return colorData.baseColor // Use pre-calculated color
          }
          
          // Fallback to old calculation if color map not available
          const optimizedFeature = dongCode && optimizedDongMap ? optimizedDongMap.get(Number(dongCode)) : null
          if (optimizedFeature && optimizedFeature.fillColorRGB) {
            // 현재 테마에 맞는 사전 계산된 색상 사용
            const themeKey = currentThemeKey === 'modern' || currentThemeKey === 'adjacent' ? 'blue' : 
                            currentThemeKey === 'bright' ? 'bright' :
                            currentThemeKey === 'green' ? 'green' :
                            currentThemeKey === 'purple' ? 'purple' :
                            currentThemeKey === 'orange' ? 'orange' : 'blue'
            
            const precomputedColor = optimizedFeature.fillColorRGB[themeKey as keyof typeof optimizedFeature.fillColorRGB]
            if (precomputedColor) {
              // 선택/호버 상태에 따른 색상 조정
              if (hoveredDistrict === guName) {
                return [255, 230, 100, 255] // 호버시 하이라이트
              }
              if ((selectedGu || selectedDong) && guName !== selectedGu) {
                return getDimmedColor() // 선택되지 않은 영역 dimmed
              }
              return precomputedColor
            }
          }
          
          // Fallback to existing calculation if optimized data not available
          const height = d.properties.height || 0
          const totalSales = dongCode ? dongSalesMap.get(Number(dongCode)) || 0 : 0
          
          // Use modern color system for 'modern' and 'adjacent' themes
          if (currentThemeKey.startsWith('modern') || currentThemeKey === 'modern' || currentThemeKey === 'adjacent') {
            // Check if this dong is selected
            const isThisDongSelected = selectedDong && dongName === selectedDong
            // Check if this dong is in selected gu
            const isInSelectedGu = selectedGu && guName === selectedGu
            // Check if this dong is being hovered directly OR if its gu is being hovered
            const isHovered = hoveredDistrict === dongName || hoveredDistrict === guName
            
            // Special strong highlighting when gu is hovered
            if (hoveredDistrict === guName) {
              // Use bright yellow-gold highlight for entire gu
              return [255, 230, 100, 255]
            }
            
            // Dimmed color for non-selected areas when something is selected
            if ((selectedGu || selectedDong) && !isInSelectedGu) {
              return getDimmedColor()
            }
            
            return getModernDistrictColor(
              guName,
              dongName,
              height,
              currentThemeKey,
              isThisDongSelected,
              isHovered
            )
          }
          
          // Fallback to legacy color system with sales-based intensity
          if (selectedDong && dongName === selectedDong) {
            return convertColorExpressionToRGB(height, 'bright', guName, dongName, true, false, totalSales)
          }
          // Strong highlight if gu is hovered (show district boundary effect)
          if (hoveredDistrict === guName) {
            // Use bright golden highlight for entire gu
            return [255, 215, 0, 255]  // Gold color with full opacity
          }
          if (selectedGu && guName === selectedGu) {
            return convertColorExpressionToRGB(height, currentThemeKey, guName, dongName, false, false, totalSales)
          }
          // Dimmed color for non-selected areas when something is selected
          if ((selectedGu || selectedDong) && guName !== selectedGu) {
            return getDimmedColor()
          }
          
          return convertColorExpressionToRGB(height, currentThemeKey, guName, dongName, false, false, totalSales)
        },
        
        // Line color for borders - ensure visibility
        getLineColor: (d: any) => {
          const dongName = d.properties.ADM_DR_NM || d.properties.DONG_NM || d.properties['행정동']
          const guName = d.properties.guName || d.properties['자치구']
          
          // Highlight selected/hovered dong with bright edge
          if (selectedDong === dongName || hoveredDistrict === dongName || hoveredDistrict === guName) {
            return [255, 255, 255, 200]  // Bright white edge for selected/hovered
          }
          
          // Subtle edges for non-selected areas
          if ((selectedGu || selectedDong) && guName !== selectedGu) {
            return [100, 100, 100, 80]  // Very subtle for non-focused areas
          }
          
          // Standard edge color - visible but not distracting
          return [150, 150, 150, 120]
        },
        
        lineWidthMinPixels: 0.5,
        lineWidthMaxPixels: 2,
        getLineWidth: 1,
        
        // Material properties for better 3D appearance
        material: {
          ambient: 0.35,
          diffuse: 0.6,
          shininess: 20,
          specularColor: [255, 255, 255]
        },
        
        onHover: (info: any) => {
          if (info.object) {
            const properties = info.object.properties
            setHoveredDistrict(properties.ADM_DR_NM || properties.DONG_NM || properties['행정동'])
          } else {
            setHoveredDistrict(null)
          }
        },
        
        onClick: (info: any) => {
          if (info.object) {
            const props = info.object.properties
            const dongName = props.ADM_DR_NM || props.DONG_NM || props['행정동']
            const guName = props.guName || props['자치구']
            const dongCode = props.ADM_DR_CD || props.DONG_CD || props['행정동코드']
            const guCode = props.SIG_CD || props.SGG_CD || props.GU_CD
            
            // 선택 상태 업데이트
            if (dongName && guName) {
              setSelectedDong(dongName)
              setSelectedGu(guName)
              setSelectedDongCode(dongCode || getDongCode(guName, dongName))
              setSelectedGuCode(guCode || getDistrictCode(guName))
              
              // 통합 줌 함수 사용
              handleDistrictZoom(guName, dongName)
            }
          }
        },
        
        // Transitions for smooth animations
        transitions: {
          getElevation: timelineAnimationEnabled && isTimelinePlaying ? 0 : 300,  // Disable deck.gl transition during timeline animation (we use interpolation instead)
          getFillColor: 300,  // Faster color transition
          getLineWidth: 200   // Quick line width transition
        },
        
        // Update triggers for reactive updates (optimized - removed hover state)
        updateTriggers: {
          getElevation: [selectedGu, selectedDong, dongSalesMap, heightScale, selectedDate],
          getFillColor: [selectedGu, selectedDong, dongColorMap, selectedDate], // Use pre-calculated color map
          getLineColor: [selectedGu, selectedDong, selectedDate]
        }
      })
    ]
  }, [
    dongData3D, 
    optimizedDongMap,
    dongColorMap,  // Add pre-calculated color map
    selectedGu, 
    selectedDong, 
    selectedBusinessType, 
    dongSalesMap,
    dongSalesByTypeMap,
    currentThemeKey,
    themeAdjustments,
    hoveredDistrict,
    heightScale,
    setSelectedGu,
    setSelectedGuCode,
    setSelectedDong,
    setSelectedDongCode,
    handleDistrictZoom,
    timelineAnimationEnabled,
    isTimelinePlaying
  ])
  
  // Update interpolation targets when sales data changes
  useEffect(() => {
    if (dongSalesMap.size === 0) return
    
    // Calculate target heights for all dongs
    const targetHeights = new Map<number, number>()
    
    dongSalesMap.forEach((sales, dongCode) => {
      // Get sales for current filter
      let dongSales = sales
      if (selectedBusinessType && dongSalesByTypeMap?.has(dongCode)) {
        const typeMap = dongSalesByTypeMap.get(dongCode)
        dongSales = typeMap?.get(selectedBusinessType) || 0
      }
      
      // Calculate height based on sales
      const height = getDongHeightBySales(dongSales, heightScale)
      targetHeights.set(dongCode, height)
    })
    
    // Update interpolation targets
    heightInterpolation.updateTargetHeights(targetHeights)
  }, [dongSalesMap, dongSalesByTypeMap, selectedBusinessType, heightScale])
  
  // 3D 모드용 데이터 전처리
  useEffect(() => {
    if (!sggData || !dongData || dongSalesMap.size === 0 || !dongSalesByTypeMap) return
    
    // 3D 효과를 위한 데이터 처리 (갈라짐 없이)
    const process3DData = () => {
      // Log sales statistics for debugging
      const salesValues = Array.from(dongSalesMap.values())
      const minSales = Math.min(...salesValues)
      const maxSales = Math.max(...salesValues)
      const avgSales = salesValues.reduce((a, b) => a + b, 0) / salesValues.length
      console.log(`[3D Processing] Sales stats - Min: ${minSales.toLocaleString()}, Max: ${maxSales.toLocaleString()}, Avg: ${avgSales.toLocaleString()}`)
      
      // 구 데이터 3D 처리
      const sgg3D = {
        ...sggData,
        features: sggData.features.map((feature: any) => {
          const guName = feature.properties.SIGUNGU_NM || feature.properties.SGG_NM || 
                        feature.properties.SIG_KOR_NM || feature.properties.GU_NM || 
                        feature.properties.nm || '자치구'
          return {
            ...feature,
            properties: {
              ...feature.properties,
              height: getDistrictHeight(guName),
              guName: guName  // 구 이름 명시적으로 추가
            }
          }
        })
      }
      setSggData3D(sgg3D)
      
      // 동 데이터 3D 처리  
      const dong3D = {
        ...dongData,
        features: dongData.features.map((feature: any, index: number) => {
          // Use Korean property names from the actual GeoJSON data
          const guName = feature.properties['자치구'] || feature.properties.SGG_NM || feature.properties.SIGUNGU_NM || feature.properties.SIG_KOR_NM
          const dongName = feature.properties['행정동'] || feature.properties.H_DONG_NM || feature.properties.ADM_DR_NM || feature.properties.EMD_NM || feature.properties.EMD_KOR_NM
          const dongCode = feature.properties['행정동코드'] || feature.properties.H_CODE || feature.properties.ADM_DR_CD || 0
          
          // Debug first few dong codes
          if (index < 3) {
            console.log(`[Dong3D] Feature ${index}:`, {
              guName,
              dongName,
              dongCode,
              allProperties: Object.keys(feature.properties)
            })
          }
          
          // Get interpolated height for smooth animation
          const height = heightInterpolation.getInterpolatedHeight(Number(dongCode))
          
          // Log first and last dong for debugging
          if (index === 0 || index === dongData.features.length - 1) {
            console.log(`[Dong 3D] Index ${index}:`, { 
              guName, 
              dongName, 
              dongCode,
              height: Math.round(height),
              dongIndex: index 
            })
          }
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              height: height, // Use sales-based height
              dongIndex: index, // 인덱스 추가 (색상 구분용)
              guName: guName // 자치구 이름 명시적으로 추가
            }
          }
        })
      }
      setDongData3D(dong3D)
    }
    
    process3DData()
  }, [sggData, dongData, dongSalesMap, dongSalesByTypeMap, selectedBusinessType, heightScale])
  
  // Update dong3D continuously during height animation
  useEffect(() => {
    if (!heightInterpolation.isAnimating || !dongData) return
    
    let animationFrame: number
    
    const updateHeights = () => {
      // Update dong3D with current interpolated heights
      const dong3D = {
        ...dongData,
        features: dongData.features.map((feature: any) => {
          const dongCode = feature.properties['행정동코드'] || 
                          feature.properties.H_CODE || 
                          feature.properties.ADM_DR_CD || 0
          
          const interpolatedHeight = heightInterpolation.getInterpolatedHeight(Number(dongCode))
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              height: interpolatedHeight
            }
          }
        })
      }
      
      setDongData3D(dong3D)
      
      if (heightInterpolation.isAnimating) {
        animationFrame = requestAnimationFrame(updateHeights)
      }
    }
    
    animationFrame = requestAnimationFrame(updateHeights)
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [heightInterpolation.isAnimating, dongData])
  
  // Lighting for 3D mode handled by DeckGL lighting effects
  // No Mapbox-specific lighting setup needed
  
  // Layer styling handled by DeckGL unified layers
  // No manual Mapbox layer style updates needed

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      console.log('[HexagonLayer3D] Theme change event received', event)
      
      // Force React re-render by updating state
      const newTheme = getCurrentTheme()
      const newThemeKey = getCurrentThemeKey()
      console.log('[HexagonLayer3D] Updating theme state to:', newTheme?.name, 'Key:', newThemeKey)
      setCurrentThemeState(newTheme)
      setCurrentThemeKey(newThemeKey)
      
      // Theme updates now handled by Deck.gl unified layers
      // Colors update automatically through props and updateTriggers
      console.log('[HexagonLayer3D] Theme updated - Deck.gl layers will re-render')
    }
    
    // Listen for theme change events
    window.addEventListener('themeChanged', handleThemeChange)
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
    }
  }, [])

  // Map initialization now handled purely by DeckGL
  // No manual Mapbox layer setup needed

  // District selection data for separate layers
  const [selectedDistrictData, setSelectedDistrictData] = useState<any>(null)

  // Create fast lookup indices for districts
  const sggIndex = useMemo(() => {
    if (!sggData?.features) {
      console.log('[SggIndex] No sgg data available')
      return new Map()
    }
    
    const index = new Map()
    
    sggData.features.forEach((f: any) => {
      const props = f.properties || {}
      // 구 코드로 인덱싱 - 다양한 속성명 지원 (한글 속성명 포함)
      const guCode = props.SIG_CD || props.SGG_CD || props.GU_CD || props.SIGUNGU_CD || props['시군구코드'] || props['구코드']
      const guName = props.SIGUNGU_NM || props.SIG_KOR_NM || props.GU_NM || props['구명']
      
      if (guCode) {
        // 코드를 숫자로 변환하여 저장
        const codeNumber = Number(guCode)
        index.set(codeNumber, f)
        // 디버깅용 - 첫 5개 항목 로깅
        if (index.size <= 5) {
          console.log('[SggIndex] Added by code:', { code: codeNumber, name: guName })
        }
      }
      
      // 이름으로도 인덱싱 (폴백용)
      if (guName) {
        index.set(guName, f)
        if (index.size <= 10) {
          console.log('[SggIndex] Added by name:', guName)
        }
      }
    })
    
    console.log('[SggIndex] Created index with', index.size, 'entries (codes and names)')
    console.log('[SggIndex] Sample keys:', Array.from(index.keys()).slice(0, 10))
    return index
  }, [sggData])

  const dongIndex = useMemo(() => {
    if (!dongData?.features) {
      console.log('[DongIndex] No dong data available')
      return new Map()
    }
    
    const index = new Map()
    
    dongData.features.forEach((f: any) => {
      const props = f.properties || {}
      // 행정동 코드로 인덱싱 - 다양한 속성명 지원 (한글 속성명 포함)
      const dongCode = props.ADM_CD || props.H_CD || props.DONG_CD || props.ADM_DR_CD || props.EMD_CD || props['행정동코드']
      
      if (dongCode) {
        // 코드를 숫자로 변환하여 저장
        const codeNumber = Number(dongCode)
        index.set(codeNumber, f)
        // 디버깅용 - 첫 5개 항목 로깅
        if (index.size <= 5) {
          console.log('[DongIndex] Added:', { code: codeNumber, name: props.ADM_NM || props.H_DONG_NM || props.DONG_NM })
        }
      }
    })
    
    console.log('[DongIndex] Created code-based index with', index.size, 'entries')
    return index
  }, [dongData])

  // Simple district selection logic using separate layers (from map click)
  useEffect(() => {
    if (districtSelection.selectedDistrict && districtSelection.selectedDistrict !== '없음' && districtSelection.selectedFeature) {
      // Create a simple FeatureCollection with just the selected feature
      const selectedFeatureData = {
        type: 'FeatureCollection',
        features: [districtSelection.selectedFeature]
      }
      
      console.log('[Setting Selected District from Map Click]', {
        districtName: districtSelection.selectedDistrict,
        layerType: districtSelection.selectedFeature?.layer?.id,
        hasFeature: !!districtSelection.selectedFeature
      })
      
      setSelectedDistrictData(selectedFeatureData)
    } else if (!selectedGu && !selectedDong) {
      // Only clear if no filter is selected
      console.log('[Clearing Selected District]')
      setSelectedDistrictData(null)
    }
  }, [districtSelection.selectedDistrict, districtSelection.selectedFeature, selectedGu, selectedDong])

  // Filter-based district selection (from filter panel) - OPTIMIZED with FlyTo animation
  useEffect(() => {
    // Skip if there's a map-clicked selection that's different from filter selection
    if (districtSelection.selectedDistrict && 
        districtSelection.selectedDistrict !== '없음' &&
        districtSelection.selectedDistrict !== selectedDong &&
        districtSelection.selectedDistrict !== selectedGu) {
      return
    }

    if (selectedGuCode || selectedDongCode || selectedGu || selectedDong) {
      console.log('[District Selection] Selected:', { 
        guCode: selectedGuCode, 
        guName: selectedGu,
        dongCode: selectedDongCode,
        dongName: selectedDong 
      })
      
      let foundFeature = null
      let foundGuFeature = null // 동 선택시 구 경계도 필요
      
      // Fast lookup using Map index with codes - O(1) instead of O(n)
      // 동이 선택된 경우 동 경계를 하이라이트
      if (selectedDongCode) {
        console.log('[DongSelection] Looking for dong code:', selectedDongCode, 'Type:', typeof selectedDongCode)
        const dongFeature = dongIndex.get(selectedDongCode)
        if (dongFeature) {
          console.log('[DongSelection] Found dong feature:', dongFeature.properties)
          console.log('[DongSelection] Dong properties keys:', Object.keys(dongFeature.properties))
          foundFeature = dongFeature
          
          // 동 선택시 해당 구 경계도 찾기
          if (selectedGuCode || selectedGu) {
            let sggFeature = selectedGuCode ? sggIndex.get(selectedGuCode) : null
            if (!sggFeature && selectedGu) {
              sggFeature = sggIndex.get(selectedGu)
            }
            if (sggFeature) {
              console.log('[DongSelection] Also found gu feature for context:', sggFeature.properties)
              foundGuFeature = sggFeature
            }
          }
        } else {
          console.log('[DongSelection] Dong code not found in index!')
          console.log('[DongSelection] Available keys types:', Array.from(dongIndex.keys()).slice(0, 5).map(k => typeof k))
          console.log('[DongSelection] Available codes:', Array.from(dongIndex.keys()).slice(0, 10))
        }
      }
      // 구만 선택된 경우 구 경계를 하이라이트  
      else if (selectedGuCode || selectedGu) {
        console.log('[GuSelection] Looking for gu:', { code: selectedGuCode, name: selectedGu })
        console.log('[GuSelection] sggIndex size:', sggIndex.size)
        
        // Try code first
        let sggFeature = selectedGuCode ? sggIndex.get(selectedGuCode) : null
        
        // If code doesn't work, try name as fallback
        if (!sggFeature && selectedGu) {
          console.log('[GuSelection] Code not found, trying name:', selectedGu)
          sggFeature = sggIndex.get(selectedGu)
        }
        
        if (sggFeature) {
          console.log('[GuSelection] Found gu feature:', sggFeature.properties)
          foundFeature = sggFeature
        } else {
          console.log('[GuSelection] Gu not found in index!')
          console.log('[GuSelection] Available keys (first 20):', Array.from(sggIndex.keys()).slice(0, 20))
        }
      }
      
      if (foundFeature) {
        // 동 선택시 구 경계도 함께 표시하기 위해 features 배열 구성
        const features = foundGuFeature 
          ? [foundGuFeature, foundFeature] // 구를 먼저, 동을 나중에 (레이어 순서)
          : [foundFeature] // 구만
        
        const selectedFeatureData = {
          type: 'FeatureCollection',
          features: features
        }
        
        console.log('[SelectedFeatures] Created FeatureCollection with', features.length, 'features')
        features.forEach((f, idx) => {
          console.log(`[Feature ${idx}]:`, Object.keys(f.properties).slice(0, 5), '...')
        })
        
        setSelectedDistrictData(selectedFeatureData)
      } else {
        setSelectedDistrictData(null)
        console.log('[District Selection] No feature found for codes:', { guCode: selectedGuCode, dongCode: selectedDongCode })
      }
    } else {
      // Reset to Seoul overview when no filter is selected
      setSelectedDistrictData(null)
      console.log('[District Selection] No district selected, resetting to Seoul overview')
      
      
      // Return to default Seoul view (재사용 함수 사용)
      resetToDefaultView()
    }
  }, [selectedGuCode, selectedDongCode, selectedGu, selectedDong, districtSelection.selectedDistrict, sggIndex, dongIndex, resetToDefaultView]) // Use both codes and names

  // Memory cleanup effect
  useEffect(() => {
    return () => {
      // Clean up any remaining resources
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
      
      // Force cleanup of heavy data structures
      if (window.gc) {
        setTimeout(() => window.gc?.(), 100)
      }
    }
  }, [])

  // Layer filter for performance optimization during interaction
  const layerFilter = useCallback(({ layer, viewport }) => {
    // During drag, only render essential layers
    if (isDragging) {
      // Always render mesh and essential 3D layers
      if (layer.id.includes('mesh') || layer.id.includes('3d-polygon')) {
        return true
      }
      // Skip text layers and other overlays during drag
      if (layer.id.includes('text') || layer.id.includes('label')) {
        return false
      }
    }
    // Default: render all layers
    return true
  }, [isDragging])

  return (
    <div className="relative w-full h-screen flex">
      {/* Map Section - Flexible Width */}
      <div className={`relative flex-1 transition-all duration-300`}>
        {/* DeckGL + Mapbox 통합 (Official deck.gl pattern) */}
        <DeckGL
        viewState={viewState}
        controller={true}
        layers={deckLayers} // PolygonLayer for 3D visualization
        effects={[lightingEffect]} // Add lighting for solid mesh rendering
        getTooltip={isDragging ? undefined : getTooltip} // 드래그 중 툴팁 비활성화로 성능 최적화
        layerFilter={layerFilter} // Performance optimization during interaction
        useDevicePixels={!isDragging && window.innerWidth > 768} // Combined: lower resolution during drag AND disable high DPI on mobile
        getCursor={({isDragging: dragging, isHovering}) => {
          if (dragging) return 'grabbing'
          if (isHovering) return 'pointer'
          return 'grab'
        }}
        // GPU Optimization Parameters  
        parameters={{
          ...COMMON_GPU_PARAMS,
          blendFunc: [0x0302, 0x0303, 0x0001, 0x0303], // Extended blend for DeckGL main canvas
          blendEquation: 0x8006, // GL.FUNC_ADD
        }}
        _typedArrayManagerProps={{
          overAlloc: 1.2,  // Reduce over-allocation (default 2.0)
          poolSize: 100    // Limit pool size for memory efficiency
        }}
        onClick={handleUnifiedClick}
        onHover={handleUnifiedHover}
        onLoad={rotateCamera} // Start rotation when deck.gl loads
        onDragStart={() => {
          setIsDragging(true) // 드래그 상태 설정
          userInteractingRef.current = true
          onAnimationInteractionStart()
          onRotationInteractionStart()
        }}
        onDragEnd={() => {
          setIsDragging(false) // 드래그 상태 해제
          userInteractingRef.current = false
          onAnimationInteractionEnd()
          onRotationInteractionEnd()
          // Resume rotation after user interaction ends
          if (rotationEnabledRef.current) {
            setTimeout(rotateCamera, 1000) // 1 second delay before resuming
          }
        }}
        onViewStateChange={({ viewState: newViewState }) => {
          // Skip if this is a programmatic update to prevent infinite loops
          if (isProgrammaticUpdateRef.current) {
            return
          }
          
          // Update the viewState - DeckGL and MapGL sync automatically
          setViewState(newViewState as MapViewState)
          
          // Update bearing ref for rotation animation
          if ('bearing' in newViewState && newViewState.bearing !== undefined) {
            currentBearingRef.current = newViewState.bearing
            updateBearing(newViewState.bearing)
          }
        }}
      >
        <MapGL
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={currentLayer === 'black' ? {
            version: 8,
            sources: {},
            layers: [{
              id: 'background',
              type: 'background',
              paint: {
                'background-color': '#000000'
              }
            }],
            ...(is3DMode ? { light: LIGHT_3D_CONFIG } : {})
          } : currentLayer === 'very-dark' ? 'mapbox://styles/mapbox/dark-v11' : currentLayer}
          {...viewState}
          onDblClick={districtSelection.handleMapReset}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        >
          {/* All layers are now rendered by Deck.gl for better performance */}
          
          {/* District Labels Layer - Now handled by Deck.gl TextLayer in deckLayers */}
          {/* Old Mapbox implementation commented out - replaced with Deck.gl TextLayer for proper 3D rendering
          {showDistrictLabels && (
            <DistrictLabelsLayer 
              visible={viewState.zoom >= 10}
              onClick={handleDistrictLabelClick}
              minZoom={10}
            />
          )}
          */}
          
          {/* 동 레이블은 이제 Deck.gl TextLayer로 처리됨 - 중복 제거 */}
          
          
        </MapGL>
      </DeckGL>
      

      {/* LocalEconomy Filter Panel - Positioned properly above map */}
      <LocalEconomyFilterPanel
        onFilterChange={handleFilterChange}
        // External sync props for bidirectional updates
        externalSelectedGu={selectedGu}
        externalSelectedDong={selectedDong}
        externalSelectedBusinessType={selectedBusinessType}
        externalSelectedDate={selectedDate}
        // Timeline animation state
        isTimelineAnimating={timelineAnimationEnabled && isTimelinePlaying}
      />

      {/* 선택된 지역 매출액 정보 */}
      <SelectedAreaSalesInfo
        selectedGu={selectedGu}
        selectedDong={selectedDong}
        hexagonData={hexagonData}
        climateData={climateData}
        visible={true}
        selectedDate={selectedDate}
      />


      {/* 통합 컨트롤 패널 */}
      <UnifiedControls
        // 지도 컨트롤 props
        onLayerChange={handleLayerChange}
        onTimeChange={handleTimeChange}
        currentLayer={currentLayer}
        currentTime={currentTime}
        showBoundary={showBoundary}
        showSeoulBase={showSeoulBase}
        // District visibility props
        dongVisible={districtSelection.dongVisible}
        onDongVisibleChange={(visible) => districtSelection.setDongVisible(visible)}
        // Additional display options
        showDistrictLabels={showDistrictLabels}
        showDongLabels={showDongLabels}
        onDistrictLabelsToggle={(visible: boolean) => setShowDistrictLabels(visible)}
        onDongLabelsToggle={(visible: boolean) => setShowDongLabels(visible)}
        onBoundaryToggle={(show) => {
          setShowBoundary(show)
          // Boundary visibility now controlled through Deck.gl layer props
          console.log('[HexagonLayer3D] Boundary visibility:', show)
        }}
        onSeoulBaseToggle={(show) => {
          setShowSeoulBase(show)
          // Seoul base is now removed, this toggle can be deprecated or repurposed
          console.log('Seoul base toggle is deprecated - boundary only mode active')
        }}
        // 3D 모드 props
        is3DMode={is3DMode}
        onIs3DModeChange={handle3DModeToggle}
        // 높이 스케일 props
        heightScale={heightScale}
        onHeightScaleChange={setHeightScale}
        // 레이어 컨트롤 props
        visible={layerConfig.visible}
        coverage={layerConfig.coverage}
        upperPercentile={layerConfig.upperPercentile}
        isDataLoading={isDataLoading}
        dataError={dataError}
        onVisibleChange={setVisible}
        onCoverageChange={setCoverage}
        onUpperPercentileChange={setUpperPercentile}
        onReset={resetConfig}
        // 색상 모드 props
        colorMode={colorMode === 'alert' ? 'sales' : colorMode}
        onColorModeChange={setColorMode}
        selectedHour={selectedHour}
        onSelectedHourChange={setSelectedHour}
        // 애니메이션 props
        animationEnabled={layerConfig.animationEnabled}
        animationSpeed={layerConfig.animationSpeed}
        waveAmplitude={layerConfig.waveAmplitude}
        isAnimating={isAnimating}
        onAnimationEnabledChange={setAnimationEnabled}
        onAnimationSpeedChange={setAnimationSpeed}
        onWaveAmplitudeChange={setWaveAmplitude}
        onToggleAnimation={toggleAnimation}
        
        // 시계열 애니메이션 props
        timelineAnimationEnabled={timelineAnimationEnabled}
        isTimelinePlaying={isTimelinePlaying}
        timelineSpeed={timelineSpeed}
        currentMonthIndex={currentMonthIndex}
        monthlyDates={monthlyDates}
        onTimelineAnimationEnabledChange={setTimelineAnimationEnabled}
        onIsTimelinePlayingChange={setIsTimelinePlaying}
        onTimelineSpeedChange={setTimelineSpeed}
        onToggleTimelineAnimation={toggleTimelineAnimation}
        
        // 회전 애니메이션 props
        rotationEnabled={rotationEnabled}
        rotationSpeed={rotationSpeed}
        rotationDirection={rotationDirection}
        isRotating={isRotating}
        rotationDirectionText={rotationDirectionText}
        bearingDisplay={bearingDisplay}
        onRotationEnabledChange={setRotationEnabled}
        onRotationSpeedChange={setRotationSpeed}
        onRotationDirectionChange={setRotationDirection}
        onToggleRotation={toggleRotation}
        
        // Mesh layer props
        showMeshLayer={showMeshLayer}
        onShowMeshLayerChange={setShowMeshLayer}
        meshWireframe={meshWireframe}
        onMeshWireframeChange={setMeshWireframe}
        meshResolution={meshResolution}
        onMeshResolutionChange={setMeshResolution}
        meshColor={meshColor}
        onMeshColorChange={setMeshColor}
        />

      {/* 지도 초기화 버튼 */}
      <button
        onClick={handleFullReset}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-black/90 hover:bg-gray-900/50 backdrop-blur-md text-gray-200 text-sm font-medium px-4 py-2 rounded-lg border border-gray-800/50 transition-all duration-200 flex items-center gap-2 shadow-2xl"
      >
        <RotateCcw className="w-4 h-4" />
        지도 초기화
      </button>

      {showHint && (
        <div className="absolute bottom-4 right-4 info-panel glow-effect transition-all duration-1000 opacity-90 hover:opacity-100 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <div className="font-semibold text-white mb-1">지도 탐색 가이드</div>
              <div className="text-sm text-white/80">드래그하여 지도를 탐색하고, 클릭하여 자치구를 선택하세요</div>
            </div>
          </div>
        </div>
      )}


      {/* 오류 표시 */}
      {dataError && (
        <div className="absolute top-4 right-4 bg-red-500/90 text-white p-3 rounded-lg shadow-lg z-20">
          <div className="font-bold">데이터 로딩 오류</div>
          <div className="text-sm">{dataError}</div>
        </div>
      )}

      </div>
      
      {/* Chart Panel - Resizable Right Side */}
      {showChartPanel && (
        <ResizablePanel
          initialWidth={chartPanelWidth || (typeof window !== 'undefined' ? window.innerWidth * 0.4 : 600)}
          minWidth={300}
          maxWidth={typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800}
          onResize={(width) => setChartPanelWidth(width)}
          className="h-full bg-black/80"
        >
          <div className="h-full p-4">
            <DefaultChartsPanel />
          </div>
        </ResizablePanel>
      )}
      
      {/* Chart Panel Toggle Button */}
      <button
        onClick={() => setShowChartPanel(!showChartPanel)}
        className="absolute top-[66px] right-4 z-20 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d={showChartPanel 
              ? "M6 18L18 6M6 6l12 12" 
              : "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            } 
          />
        </svg>
        <span>{showChartPanel ? 'Close' : 'Charts'}</span>
      </button>
    </div>
  )
}
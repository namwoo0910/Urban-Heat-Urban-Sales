"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL, Source, Layer } from 'react-map-gl'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { LinearInterpolator, FlyToInterpolator, LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core'
import { PolygonLayer } from '@deck.gl/layers'
import mapboxgl from "mapbox-gl"
import 'mapbox-gl/dist/mapbox-gl.css'
import UnifiedControls from "./SalesDataControls"
import { LayerManager, formatTooltip, createScatterplotLayer, formatScatterplotTooltip, createMeshLayer } from "./LayerManager"
import { usePreGeneratedSeoulMeshLayer } from "./SeoulMeshLayer"
import { useLayerState } from "../hooks/useCardSalesData"
import { DefaultChartsPanel } from "./charts/DefaultChartsPanel"
import { climateDataLoader } from '../utils/climateDataLoader'
import { formatKoreanCurrency } from '@/src/shared/utils/salesFormatter'
import LocalEconomyFilterPanel from "./LocalEconomyFilterPanel"
import type { FilterState } from "./LocalEconomyFilterPanel"
import { getDistrictCode, getDongCode } from "../data/districtCodeMappings"
import { SelectedAreaSalesInfo } from "./SelectedAreaSalesInfo"
import { DistrictLabelsLayer } from "./DistrictLabelsLayer"
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
import "../styles/HexagonLayer.css"
import "@/src/shared/styles/districtEffects.css"

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
  zoom: 10.5,
  pitch: 20,  // 3D 각도로 설정
  bearing: 4,  // 3D 방향으로 설정
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
  
  // DeckGL 뷰 상태 - controlled component pattern for synchronization
  const [viewState, setViewState] = useState<MapViewState>({
    ...DEFAULT_SEOUL_VIEW,
    bearing: 0  // 초기 bearing은 0으로 설정
  })
  
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
    
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false
    }, transitionDuration + 100)
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
      
      setTimeout(() => {
        isProgrammaticUpdateRef.current = false
      }, ZOOM_SETTINGS.TRANSITION_DURATION + 100)
    }
  }, [setViewState])
  
  // Handle filter panel changes - simplified to prevent loops
  const handleFilterChange = useCallback((filters: FilterState) => {
    // Directly update states without checking current values
    // This prevents unnecessary re-renders and loops
    console.log('[HexagonLayer3D] Filter change received:', filters)
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
  
  // Mesh layer states
  const [showMeshLayer, setShowMeshLayer] = useState<boolean>(true)  // Default to showing mesh layer
  const [meshWireframe, setMeshWireframe] = useState<boolean>(true)  // Default to wireframe on
  const [meshResolution, setMeshResolution] = useState<number>(60)  // Balanced resolution for good performance
  const [meshColor, setMeshColor] = useState<string>('#00FFE1')  // Default cyan color
  
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
  
  // Manage animation state for selected districts
  useEffect(() => {
    if (districtSelection.selectedDistrict) {
      // Force re-render of layers to apply color changes
      const map = mapRef.current?.getMap()
      if (map) {
        // Ensure layers are visible with proper opacity
        const fillLayer = map.getLayer('sgg-select-fill')
        const animatedLayer = map.getLayer('sgg-select-fill-animated')
        
        if (fillLayer) {
          // Force the layer to update
          map.setPaintProperty('sgg-select-fill', 'fill-opacity', 
            map.getPaintProperty('sgg-select-fill', 'fill-opacity'))
        }
        
        if (animatedLayer) {
          // Force the animated layer to update
          map.setPaintProperty('sgg-select-fill-animated', 'fill-opacity',
            map.getPaintProperty('sgg-select-fill-animated', 'fill-opacity'))
        }
      }
      
      // Keep animation active
      const animationTimer = setTimeout(() => {
        // Animation continues indefinitely for selected district
      }, 800)
      
      return () => clearTimeout(animationTimer)
    } else {
      // Clear animation when no district is selected
    }
  }, [districtSelection.selectedDistrict])

  // Sync bearing with MapBox when it changes
  useEffect(() => {
    if (mapRef.current && viewState.bearing !== undefined) {
      mapRef.current.setBearing(viewState.bearing)
    }
  }, [viewState.bearing])

  // Initialize bearing ref
  useEffect(() => {
    currentBearingRef.current = viewState.bearing || 0
  }, [])

  // Handle hexagon hover for district-wide highlighting
  const handleHexagonHover = useCallback((info: PickingInfo) => {
    const canvas = mapRef.current?.getCanvas()
    
    if (info.object && info.object.originalData) {
      const dongName = info.object.originalData.dongName
      setHoveredObject(info.object)
      
      // Set hovered district for district-wide highlighting
      if (dongName) {
        setHoveredDistrict(dongName)
      }
      
      // Change cursor to pointer for better UX
      if (canvas) {
        canvas.style.cursor = 'pointer'
      }
    } else {
      setHoveredObject(null)
      setHoveredDistrict(null)
      
      // Reset cursor
      if (canvas) {
        canvas.style.cursor = 'grab'
      }
    }
  }, [setHoveredObject])

  // Handle hexagon click - matches new viewport logic
  const handleHexagonClick = useCallback((info: PickingInfo) => {
    if (info.object && info.object.originalData) {
      const { guName, dongName, guCode, dongCode } = info.object.originalData
      
      // Add visual feedback for click
      const canvas = mapRef.current?.getCanvas()
      if (canvas) {
        canvas.style.cursor = 'grabbing'
        setTimeout(() => {
          canvas.style.cursor = 'grab'
        }, 200)
      }
      
      // Set district selections with both names and codes
      if (dongName && guName) {
        // 동 클릭시: 구와 동 모두 설정
        setSelectedGu(guName)
        const calculatedGuCode = guCode || getDistrictCode(guName)
        const calculatedDongCode = dongCode || getDongCode(guName, dongName)
        
        setSelectedGuCode(calculatedGuCode)
        setSelectedDong(dongName)
        setSelectedDongCode(calculatedDongCode)
        
        console.log('[HexagonClick] Selected dong:', { guName, guCode: calculatedGuCode, dongName, dongCode: calculatedDongCode })
      } else if (guName) {
        // 구 클릭시: 구만 설정 (서울 전체 뷰 유지)
        setSelectedGu(guName)
        const calculatedGuCode = guCode || getDistrictCode(guName)
        setSelectedGuCode(calculatedGuCode)
        setSelectedDong(null)
        setSelectedDongCode(null)
        
        console.log('[HexagonClick] Selected gu:', { guName, guCode: calculatedGuCode })
      }
      
      // 뷰포트 변경은 useEffect에서 자동 처리됨
    }
  }, [setSelectedGu, setSelectedGuCode, setSelectedDong, setSelectedDongCode])

  
  // Create Deck.gl PolygonLayer for 3D dong visualization
  const createDong3DPolygonLayers = useCallback(() => {
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
        parameters: {
          depthTest: true,
          depthFunc: 0x0203, // GL.LEQUAL
          blend: true,
          blendFunc: [0x0302, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
          cullFace: 0x0405, // GL.BACK - cull back faces
          cullFaceMode: true,
          polygonOffsetFill: true // Prevent z-fighting
        },
        
        // Geometry
        getPolygon: (d: any) => {
          // Handle both Polygon and MultiPolygon
          if (d.geometry.type === 'MultiPolygon') {
            // Return the first polygon for MultiPolygon
            return d.geometry.coordinates[0][0]
          }
          return d.geometry.coordinates[0]
        },
        
        // Height - 선택 상태에 따른 차별화
        getElevation: (d: any) => {
          const guName = d.properties.guName || d.properties['자치구']
          const dongName = d.properties.ADM_DR_NM || d.properties.DONG_NM || d.properties['행정동']
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
        
        // Modern color system with district-based variations
        getFillColor: (d: any) => {
          const dongName = d.properties.ADM_DR_NM || d.properties.DONG_NM || d.properties['행정동']
          const guName = d.properties.guName || d.properties['자치구']
          const height = d.properties.height || 0
          
          // Try multiple ways to get dongCode
          const dongCode = d.properties.ADM_DR_CD || 
                          d.properties.dongCode || 
                          d.properties.dong_code ||
                          d.properties['행정동코드'] ||
                          d.properties.DONG_CD;
          
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
          getElevation: 300,  // Faster transition for more responsive hover
          getFillColor: 300,  // Faster color transition
          getLineWidth: 200   // Quick line width transition
        },
        
        // Update triggers for reactive updates
        updateTriggers: {
          getElevation: [selectedGu, selectedDong, selectedBusinessType, dongSalesMap, heightScale, hoveredDistrict],
          getFillColor: [selectedGu, selectedDong, currentThemeKey, hoveredDistrict, themeAdjustments],
          getLineColor: [selectedGu, selectedDong, currentThemeKey, hoveredDistrict, themeAdjustments],
          getLineWidth: [hoveredDistrict]
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
    pickable: true,
    color: meshColor,  // Pass the mesh color
    dongBoundaries: dongData3D?.features,  // Pass dong boundaries for sales mapping
    dongSalesMap: dongSalesMap,  // Pass sales data map
    salesHeightScale: heightScale,  // Use the same height scale as polygon layer
    onHover: (info: any) => {
      // Handle mesh hover if needed
    },
    onClick: (info: any) => {
      // Handle mesh click if needed
    }
  }, dongData3D?.features)
  
  // Combine all deck.gl layers
  const deckLayers = useMemo(() => {
    const layers = []
    
    // Add PolygonLayer for 3D dong visualization (FIRST - renders at bottom)
    if (is3DMode && dongData3D) {  // Removed !showMeshLayer to allow both layers
      layers.push(...createDong3DPolygonLayers())
    }
    
    // Add pre-generated mesh layer for Seoul surface visualization
    if (preGeneratedMeshLayer && showMeshLayer) {
      layers.push(preGeneratedMeshLayer)
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
  }, [is3DMode, dongData3D, createDong3DPolygonLayers, 
      showDistrictLabels, showDongLabels, viewState, selectedGu, selectedDong, hoveredDistrict,
      handleDistrictLabelClick, setHoveredDistrict, calculatePolygonCentroid, handleDongClick,
      setSelectedGu, setSelectedGuCode, setSelectedDong, setSelectedDongCode,
      showMeshLayer, preGeneratedMeshLayer])
  
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

  // 안전한 레이어 관리 헬퍼 함수 (Context7 패턴)
  const addLayerSafely = (layerId: string, layerConfig: any, beforeId?: string) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    
    try {
      // 기존 레이어가 있다면 제거
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
      
      // 새 레이어 추가
      map.addLayer(layerConfig, beforeId)
    } catch (error) {
      console.warn(`Failed to add layer ${layerId}:`, error)
    }
  }

  useEffect(() => {
    // Mapbox access token 설정
    mapboxgl.accessToken = MAPBOX_TOKEN

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
  
  // Load sales data and aggregate by dong
  useEffect(() => {
    const loadSalesData = async () => {
      try {
        console.log('[SalesData] Loading dong sales data...', selectedDate ? `for date: ${selectedDate}` : 'for all dates')
        
        // Apply date filter if selected
        const options = selectedDate ? { date: selectedDate } : undefined
        const allData = await climateDataLoader.loadAllData(options)
        
        // Aggregate sales by dongCode
        const salesByDong = new Map<number, number>()
        const salesByDongAndType = new Map<number, Map<string, number>>()
        
        allData.forEach(item => {
          if (item.dongCode) {
            // 총 매출 저장 (기존)
            if (item.totalSales) {
              const currentTotal = salesByDong.get(item.dongCode) || 0
              salesByDong.set(item.dongCode, currentTotal + item.totalSales)
            }
            
            // 업종별 매출 저장 (추가)
            if (item.salesByCategory && Object.keys(item.salesByCategory).length > 0) {
              let dongTypeMap = salesByDongAndType.get(item.dongCode)
              if (!dongTypeMap) {
                dongTypeMap = new Map<string, number>()
                salesByDongAndType.set(item.dongCode, dongTypeMap)
              }
              
              Object.entries(item.salesByCategory).forEach(([category, amount]) => {
                const current = dongTypeMap.get(category) || 0
                dongTypeMap.set(category, current + amount)
              })
            }
          }
        })
        
        console.log(`[SalesData] Loaded sales for ${salesByDong.size} dongs`)
        console.log(`[SalesData] Loaded business type sales for ${salesByDongAndType.size} dongs`)
        
        // Debug: Check if there are any dongCodes with 0 in them
        const dongCodesWithZero = Array.from(salesByDong.keys()).filter(code => code === 0 || code < 10000000)
        if (dongCodesWithZero.length > 0) {
          console.warn(`[SalesData] Found ${dongCodesWithZero.length} invalid dong codes (0 or too small):`, dongCodesWithZero)
        }
        
        // Log min/max sales for normalization reference
        const salesValues = Array.from(salesByDong.values())
        if (salesValues.length > 0) {
          const minSales = Math.min(...salesValues)
          const maxSales = Math.max(...salesValues)
          console.log(`[SalesData] Sales range: ${minSales.toLocaleString()} - ${maxSales.toLocaleString()}`)
          
          // Log sample dongCode keys for debugging
          const sampleKeys = Array.from(salesByDong.keys()).slice(0, 5)
          console.log(`[SalesData] Sample dongCode keys:`, sampleKeys)
        } else {
          console.warn(`[SalesData] No sales data found!`)
        }
        
        setDongSalesMap(salesByDong)
        setDongSalesByTypeMap(salesByDongAndType)
      } catch (error) {
        console.error('[SalesData] Failed to load sales data:', error)
      }
    }
    
    loadSalesData()
  }, [selectedDate])  // Reload when date changes
  
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
          
          // Get sales data for this dong
          // 업종 선택시 해당 업종 매출, 아니면 총 매출
          let dongSales = 0
          if (selectedBusinessType && dongSalesByTypeMap.has(Number(dongCode))) {
            const typeMap = dongSalesByTypeMap.get(Number(dongCode))
            dongSales = typeMap?.get(selectedBusinessType) || 0
          } else {
            dongSales = dongSalesMap.get(Number(dongCode)) || 0
          }
          
          // Calculate height based on absolute sales value with adjustable scale
          const height = getDongHeightBySales(dongSales, heightScale)
          
          // Log first and last dong for debugging
          if (index === 0 || index === dongData.features.length - 1) {
            console.log(`[Dong 3D] Index ${index}:`, { 
              guName, 
              dongName, 
              dongCode,
              dongSales: dongSales.toLocaleString(),
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
  
  // 3D 모드 변경 시 조명 설정
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    
    // 맵이 로드되었는지 확인
    if (!map.loaded()) {
      map.once('load', () => {
        if (is3DMode) {
          map.setLight(LIGHT_3D_CONFIG as any)
        }
      })
    } else {
      if (is3DMode) {
        map.setLight(LIGHT_3D_CONFIG as any)
      }
    }
  }, [is3DMode])

  // currentLayer 변경시 오버레이 업데이트
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // very-dark 스타일일 때 검정 오버레이 추가
    if (currentLayer === 'very-dark') {
      // 맵 스타일 로드 완료 후 오버레이 추가
      const addOverlay = () => {
        if (!map.getLayer("dark-overlay")) {
          addLayerSafely("dark-overlay", {
            id: "dark-overlay",
            type: "background",
            paint: {
              'background-color': 'rgba(0, 0, 0, 0.3)'  // 40% 검정 오버레이
            }
          })
        }
      }
      
      // 스타일 로드 완료 확인
      if (map.isStyleLoaded()) {
        addOverlay()
      } else {
        map.once('styledata', addOverlay)
      }
    } else {
      // 다른 스타일로 변경시 오버레이 제거
      if (map.getLayer("dark-overlay")) {
        map.removeLayer("dark-overlay")
      }
    }
  }, [currentLayer])

  // Update district colors when data changes
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    
    // Get fresh paint properties with current theme
    const paint = getDistrictLayerPaint()
    
    // Update colors when sgg or dong data loads
    if (sggData && map.getLayer('sgg-fill')) {
      map.setPaintProperty('sgg-fill', 'fill-color', paint.sggFill['fill-color'])
      map.setPaintProperty('sgg-fill', 'fill-opacity', paint.sggFill['fill-opacity'])
    }
    
    if (sggData && map.getLayer('sgg-line')) {
      map.setPaintProperty('sgg-line', 'line-color', paint.sggLine['line-color'])
      map.setPaintProperty('sgg-line', 'line-width', paint.sggLine['line-width'])
    }
    
    if (dongData && map.getLayer('dong-fill')) {
      map.setPaintProperty('dong-fill', 'fill-color', paint.dongFill['fill-color'])
      map.setPaintProperty('dong-fill', 'fill-opacity', paint.dongFill['fill-opacity'])
    }
    
    if (dongData && map.getLayer('dong-line')) {
      map.setPaintProperty('dong-line', 'line-color', paint.dongLine['line-color'])
      map.setPaintProperty('dong-line', 'line-width', paint.dongLine['line-width'])
    }
  }, [sggData, dongData])

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
      
      const map = mapRef.current?.getMap()
      if (!map) {
        console.log('[HexagonLayer3D] Map not ready')
        return
      }
      
      // Get fresh paint properties with new theme
      const paint = getDistrictLayerPaint()
      console.log('[HexagonLayer3D] New paint colors:', {
        sggFill: paint.sggFill['fill-color'],
        sggLine: paint.sggLine['line-color']
      })
      
      // Removed dong-extrusion layer update - now using Deck.gl PolygonLayer
      
      // Update all layer colors
      if (map.getLayer('sgg-fill')) {
        map.setPaintProperty('sgg-fill', 'fill-color', paint.sggFill['fill-color'])
        map.setPaintProperty('sgg-fill', 'fill-opacity', paint.sggFill['fill-opacity'])
        console.log('[HexagonLayer3D] Updated sgg-fill')
      }
      
      if (map.getLayer('sgg-line')) {
        map.setPaintProperty('sgg-line', 'line-color', paint.sggLine['line-color'])
        map.setPaintProperty('sgg-line', 'line-width', paint.sggLine['line-width'])
        if (paint.sggLine['line-blur']) {
          map.setPaintProperty('sgg-line', 'line-blur', paint.sggLine['line-blur'])
        }
        if (paint.sggLine['line-opacity']) {
          map.setPaintProperty('sgg-line', 'line-opacity', paint.sggLine['line-opacity'])
        }
        console.log('[HexagonLayer3D] Updated sgg-line')
      }
      
      if (map.getLayer('dong-fill')) {
        map.setPaintProperty('dong-fill', 'fill-color', paint.dongFill['fill-color'])
        map.setPaintProperty('dong-fill', 'fill-opacity', paint.dongFill['fill-opacity'])
        console.log('[HexagonLayer3D] Updated dong-fill')
      }
      
      if (map.getLayer('dong-line')) {
        map.setPaintProperty('dong-line', 'line-color', paint.dongLine['line-color'])
        map.setPaintProperty('dong-line', 'line-width', paint.dongLine['line-width'])
        if (paint.dongLine['line-blur']) {
          map.setPaintProperty('dong-line', 'line-blur', paint.dongLine['line-blur'])
        }
        if (paint.dongLine['line-opacity']) {
          map.setPaintProperty('dong-line', 'line-opacity', paint.dongLine['line-opacity'])
        }
        console.log('[HexagonLayer3D] Updated dong-line')
      }
      
      // Also update seoul boundary if it exists
      if (map.getLayer('seoul-boundary')) {
        const seoulPaint = getDistrictLayerPaint().seoulBoundaryLine
        if (seoulPaint) {
          map.setPaintProperty('seoul-boundary', 'line-color', seoulPaint['line-color'])
          map.setPaintProperty('seoul-boundary', 'line-width', seoulPaint['line-width'])
          console.log('[HexagonLayer3D] Updated seoul-boundary')
        }
      }
    }
    
    // Listen for theme change events
    window.addEventListener('themeChanged', handleThemeChange)
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
    }
  }, [])

  // 지도 로드 완료 후 Mapbox 레이어 추가
  const handleMapLoad = () => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // Apply dynamic district colors after map loads
    setTimeout(() => {
      const paint = getDistrictLayerPaint()
      
      // Ensure district fill layer has proper paint properties
      if (map.getLayer('sgg-fill')) {
        // Apply the district-specific colors dynamically
        map.setPaintProperty('sgg-fill', 'fill-color', paint.sggFill['fill-color'])
        map.setPaintProperty('sgg-fill', 'fill-opacity', paint.sggFill['fill-opacity'])
      }
      
      // Ensure district line layer has proper paint properties
      if (map.getLayer('sgg-line')) {
        map.setPaintProperty('sgg-line', 'line-color', paint.sggLine['line-color'])
        map.setPaintProperty('sgg-line', 'line-width', paint.sggLine['line-width'])
        map.setPaintProperty('sgg-line', 'line-blur', paint.sggLine['line-blur'])
        map.setPaintProperty('sgg-line', 'line-opacity', paint.sggLine['line-opacity'])
      }
      
      // Ensure dong fill layer has proper paint properties
      if (map.getLayer('dong-fill')) {
        map.setPaintProperty('dong-fill', 'fill-color', paint.dongFill['fill-color'])
        map.setPaintProperty('dong-fill', 'fill-opacity', paint.dongFill['fill-opacity'])
      }
      
      // Ensure dong line layer has proper paint properties
      if (map.getLayer('dong-line')) {
        map.setPaintProperty('dong-line', 'line-color', paint.dongLine['line-color'])
        map.setPaintProperty('dong-line', 'line-width', paint.dongLine['line-width'])
        map.setPaintProperty('dong-line', 'line-blur', paint.dongLine['line-blur'])
        map.setPaintProperty('dong-line', 'line-opacity', paint.dongLine['line-opacity'])
      }
    }, 100) // Small delay to ensure layers are ready

    // 서울 정확한 행정구역 GeoJSON 데이터 로드 (안전한 소스 추가)
    if (!map.getSource("seoul-boundary")) {
      try {
        map.addSource("seoul-boundary", {
          type: "geojson",
          data: "/seoul_boundary.geojson"
        })
      } catch (error) {
        console.warn("Failed to add seoul-boundary source:", error)
      }
    }

    // 서울 경계선 레이어 - 경계만 표시, 내부 색칠 없음
    if (map.getSource("seoul-boundary")) {
      // 서울 경계 그림자 효과 (선택적)
      addLayerSafely("seoul-boundary-shadow", {
        id: "seoul-boundary-shadow",
        type: "line",
        source: "seoul-boundary",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: showBoundary ? "visible" : "none"
        },
        paint: {
          "line-color": "rgba(0, 0, 0, 0.2)",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 3,
            12, 5,
            16, 7
          ],
          "line-blur": 2,
          "line-opacity": 0.5,
          "line-translate": [2, 2]
        },
      })

      // 메인 서울 경계선 - 깔끔한 아웃라인만
      addLayerSafely("seoul-boundary-line", {
        id: "seoul-boundary-line",
        type: "line",
        source: "seoul-boundary",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: showBoundary ? "visible" : "none"
        },
        paint: getDistrictLayerPaint().seoulBoundaryLine,
      })

      // 서울 경계 하이라이트 효과 (선택적)
      addLayerSafely("seoul-boundary-highlight", {
        id: "seoul-boundary-highlight",
        type: "line",
        source: "seoul-boundary",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: showBoundary ? "visible" : "none"
        },
        paint: {
          "line-color": "rgba(255, 255, 255, 0.3)",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 0.5,
            12, 1,
            16, 1.5
          ],
          "line-blur": 0.5,
          "line-opacity": 0.6,
          "line-translate": [-1, -1]
        },
      })
    }
  }

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

  console.log('[DeckGL Config]', {
    selectionMode: districtSelection.selectionMode,
    layersCount: deckLayers.length,
    hasGetTooltip: !!getTooltip,
    layersPassedCount: districtSelection.selectionMode ? 0 : deckLayers.length
  })


  return (
    <div className="relative w-full h-screen flex">
      {/* Map Section - Left Side */}
      <div className={`relative transition-all duration-500 ${showChartPanel ? 'w-3/5' : 'w-full'}`}>
        {/* DeckGL + Mapbox 통합 (Official deck.gl pattern) */}
        <DeckGL
        viewState={viewState}
        controller={true}
        layers={deckLayers} // PolygonLayer for 3D visualization
        effects={[lightingEffect]} // Add lighting for solid mesh rendering
        getTooltip={false ? undefined : getTooltip} // 임시로 selectionMode 무시하고 항상 툴팁 활성화
        getCursor={({isDragging, isHovering}) => {
          if (isDragging) return 'grabbing'
          if (isHovering) return 'pointer'
          return 'grab'
        }}
        // GPU Optimization Parameters
        parameters={{
          depthTest: true,
          depthFunc: 0x0203, // GL.LEQUAL
          blend: true,
          blendFunc: [0x0302, 0x0303, 0x0001, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA]
          blendEquation: 0x8006, // GL.FUNC_ADD
          polygonOffsetFill: true,
          cullFace: 0x0405, // GL.BACK
          cullFaceMode: true
        }}
        // Performance optimizations
        useDevicePixels={window.innerWidth <= 768 ? false : true} // Disable high DPI on mobile
        _typedArrayManagerProps={{
          overAlloc: 1.2,  // Reduce over-allocation (default 2.0)
          poolSize: 100    // Limit pool size for memory efficiency
        }}
        onClick={() => {
          // 이벤트가 레이어로 전파되도록 함
          return true
        }}
        onLoad={rotateCamera} // Start rotation when deck.gl loads
        onDragStart={() => {
          userInteractingRef.current = true
          onAnimationInteractionStart()
          onRotationInteractionStart()
        }}
        onDragEnd={() => {
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
          
          // Update the viewState to keep DeckGL and MapGL synchronized
          const mapViewState = newViewState as MapViewState
          setViewState(mapViewState)
          
          // Sync bearing ref when view state changes (e.g., during user interaction)
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
          onLoad={handleMapLoad}
          onClick={(e: MapLayerMouseEvent) => {
            if (!districtSelection.handleDistrictClick(e)) {
              // Handle other click events if not in selection mode
            }
          }}
          onDblClick={districtSelection.handleMapReset}
          onMouseMove={(e: MapLayerMouseEvent) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0]
              
              if (feature.properties?.SIGUNGU_NM) {
                // Hover logic for district names
                setHoveredDistrict(feature.properties.SIGUNGU_NM)
                mapRef.current!.getCanvas().style.cursor = 'pointer'
              }
            } else {
              setHoveredDistrict(null)
              mapRef.current!.getCanvas().style.cursor = ''
            }
          }}
          onMouseLeave={() => {
            setHoveredDistrict(null)
            mapRef.current!.getCanvas().style.cursor = ''
          }}
          interactiveLayerIds={['sgg-fill', 'sgg-line', 'sgg-select-fill', 'sgg-hover-fill', 'dong-fill', 'dong-line']}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        >
          {/* District layers with enhanced 3D visualization */}
          {sggData && (
            <Source id="sgg-source" type="geojson" data={is3DMode && sggData3D ? sggData3D : sggData}>
              
              {/* 3D Extrusion layer removed - now using Deck.gl PolygonLayer */}
              
              {/* District fill - 2D 배경 with district-specific colors - DISABLED IN 3D MODE */}
              {!is3DMode && (
                <Layer
                  id="sgg-fill"
                  type="fill"
                  paint={getDistrictLayerPaint().sggFill as any}
                  layout={{ 
                    visibility: districtSelection.sggVisible ? 'visible' : 'none' 
                  }}
                />
              )}
              
              {/* 네온 글로우 효과 - 외곽 글로우 (2D 모드에서만 표시) */}
              {!is3DMode && (
                <Layer
                  id="sgg-glow-outer"
                  type="line"
                  paint={{
                    'line-color': 'rgba(0, 255, 255, 0.2)',
                    'line-width': 8,
                    'line-blur': 6,
                    'line-opacity': 0.5
                  }}
                  layout={{ 
                    visibility: districtSelection.sggVisible ? 'visible' : 'none' 
                  }}
                />
              )}
              
              {/* 네온 글로우 효과 - 중간 글로우 (2D 모드에서만) */}
              {!is3DMode && (
                <Layer
                  id="sgg-glow-mid"
                  type="line"
                  paint={{
                    'line-color': 'rgba(100, 200, 255, 0.4)',
                    'line-width': 4,
                    'line-blur': 3,
                    'line-opacity': 0.7
                  }}
                  layout={{ 
                    visibility: districtSelection.sggVisible ? 'visible' : 'none' 
                  }}
                />
              )}
              
              {/* 메인 경계선 - 네온 코어 (3D 모드에서도 표시) */}
              <Layer
                id="sgg-line"
                type="line"
                paint={getDistrictLayerPaint().sggLine as any}
                layout={{ 
                  visibility: districtSelection.sggVisible ? 'visible' : 'none' 
                }}
              />
              
              {/* Modern hover effect with neon glow and 3D */}
              {hoveredDistrict && hoveredDistrict !== districtSelection.selectedDistrict && [
                /* Hover glow effect */
                <Layer
                  key="sgg-hover-glow"
                  id="sgg-hover-glow"
                  type="line"
                  source="sgg-source"
                  paint={{
                    'line-color': 'rgba(0, 255, 255, 0.3)',
                    'line-width': 8,
                    'line-blur': 4
                  }}
                  filter={['==', ['get', 'SIGUNGU_NM'], hoveredDistrict]}
                />,
                
                /* Hover line with bright neon */
                <Layer
                  key="sgg-hover-line"
                  id="sgg-hover-line"
                  type="line"
                  source="sgg-source"
                  paint={{
                    'line-color': 'rgba(0, 255, 255, 0.9)',
                    'line-width': 2.5,
                    'line-opacity': 1
                  }}
                  filter={['==', ['get', 'SIGUNGU_NM'], hoveredDistrict]}
                />
              ]}
              
              {/* Removed - using setPaintProperty instead */}
            </Source>
          )}
          
          {/* Dong layers with 3D effects */}
          {dongData && (
            <Source id="dong-source" type="geojson" data={is3DMode && dongData3D ? dongData3D : dongData}>
              
              {/* 3D Dong Extrusion layer removed - now using Deck.gl PolygonLayer */}
              
              {/* Dong fill with district-aware colors - ONLY IN 2D MODE */}
              {!is3DMode && (
                <Layer
                  id="dong-fill"
                  type="fill"
                  paint={getDistrictLayerPaint().dongFill as any}
                  layout={{ visibility: districtSelection.dongVisible ? 'visible' : 'none' }}
                />
              )}
              
              {/* Dong neon glow lines (2D 모드에서만) */}
              {!is3DMode && (
                <Layer
                  id="dong-glow"
                  type="line"
                  paint={{
                    'line-color': 'rgba(200, 100, 255, 0.15)',
                    'line-width': 4,
                    'line-blur': 3,
                    'line-opacity': 0.6
                  }}
                  layout={{ 
                    visibility: districtSelection.dongVisible ? 'visible' : 'none' 
                  }}
                />
              )}
              
              {/* Dong main lines with modern style (3D 모드에서도 표시) */}
              <Layer
                id="dong-line"
                type="line"
                paint={getDistrictLayerPaint().dongLine as any}
                layout={{ visibility: districtSelection.dongVisible ? 'visible' : 'none' }}
              />
            </Source>
          )}
          
          {/* Jib layers */}
          {jibData && !districtSelection.selectionMode && viewState.zoom > 10 && (
            <Source id="jib-source" type="geojson" data={jibData}>
              <Layer
                id="jib-line"
                type="line"
                paint={getDistrictLayerPaint().jibLine as any}
                layout={{ visibility: districtSelection.jibVisible ? 'visible' : 'none' }}
                minzoom={10}
              />
            </Source>
          )}

          {/* Selected District Layer with enhanced visibility - ONLY IN 2D MODE */}
          {!is3DMode && selectedDistrictData && (
            <Source id="selected-district-source" type="geojson" data={selectedDistrictData}>
              
              {/* Fill layer for selected area - subtle background */}
              <Layer
                id="selected-fill"
                type="fill"
                paint={{
                  'fill-color': [
                    'case',
                    // 동 선택시 - 다양한 속성명 지원 및 타입 변환
                    ['any',
                      ['==', ['to-string', ['get', 'ADM_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'H_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'DONG_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'ADM_DR_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'EMD_CD']], String(selectedDongCode)]
                    ], 'rgba(255, 100, 150, 0.2)', // 동 - 핑크색
                    // 구 선택시 - 다양한 속성명 지원
                    ['any',
                      ['==', ['to-string', ['get', 'SIG_CD']], String(selectedGuCode)],
                      ['==', ['to-string', ['get', 'SGG_CD']], String(selectedGuCode)],
                      ['==', ['to-string', ['get', 'GU_CD']], String(selectedGuCode)],
                      ['==', ['to-string', ['get', 'SIGUNGU_CD']], String(selectedGuCode)],
                      ['==', ['get', 'SIGUNGU_NM'], selectedGu]
                    ], 'rgba(102, 126, 234, 0.15)', // 구 - 파란색
                    'rgba(102, 126, 234, 0.1)' // 기본값
                  ],
                  'fill-opacity': 0.6
                }}
              />
              
              {/* Selected shadow for depth */}
              <Layer
                id="selected-shadow"
                type="line"
                paint={{
                  'line-color': 'rgba(0, 0, 0, 0.5)',
                  'line-width': 10,
                  'line-blur': 6,
                  'line-translate': [4, 4],
                  'line-translate-anchor': 'viewport'
                }}
              />
              
              {/* Selected glow effect - outer (더 밝고 넓게) */}
              <Layer
                id="selected-glow-outer"
                type="line"
                paint={{
                  'line-color': [
                    'case',
                    // 동 선택시 - 다양한 속성명 지원
                    ['any',
                      ['==', ['to-string', ['get', 'ADM_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'H_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'DONG_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'ADM_DR_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'EMD_CD']], String(selectedDongCode)]
                    ], 'rgba(255, 100, 150, 0.4)', // 동
                    'rgba(102, 126, 234, 0.4)' // 구
                  ],
                  'line-width': selectedDong ? 20 : 18,
                  'line-blur': 8
                }}
              />
              
              {/* Selected glow effect - mid */}
              <Layer
                id="selected-glow-mid"
                type="line"
                paint={{
                  'line-color': [
                    'case',
                    // 동 선택시 - 다양한 속성명 지원
                    ['any',
                      ['==', ['to-string', ['get', 'ADM_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'H_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'DONG_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'ADM_DR_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'EMD_CD']], String(selectedDongCode)]
                    ], 'rgba(255, 100, 150, 0.6)', // 동
                    'rgba(102, 126, 234, 0.6)' // 구
                  ],
                  'line-width': selectedDong ? 12 : 10,
                  'line-blur': 4
                }}
              />
              
              {/* Selected district outline with bright neon (더 두껍게) */}
              <Layer
                id="selected-district-line"
                type="line"
                paint={{
                  'line-color': [
                    'case',
                    // 동 선택시 - 다양한 속성명 지원
                    ['any',
                      ['==', ['to-string', ['get', 'ADM_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'H_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'DONG_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'ADM_DR_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'EMD_CD']], String(selectedDongCode)]
                    ], '#ff00aa', // 동 - 핑크
                    '#00ff88' // 구 - 민트그린
                  ],
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, selectedDong ? 4 : 5,
                    12, selectedDong ? 6 : 8,
                    16, selectedDong ? 8 : 10
                  ],
                  'line-opacity': 1
                }}
              />
              
              {/* Inner bright line for emphasis */}
              <Layer
                id="selected-district-inner"
                type="line"
                paint={{
                  'line-color': '#ffffff',
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, 1.5,
                    12, 2.5,
                    16, 3.5
                  ],
                  'line-opacity': 0.9
                }}
              />
              
              {/* 구 경계 보조선 (동 선택시) - 연한 표시 */}
              {selectedDong && (
                <Layer
                  id="selected-gu-boundary"
                  type="line"
                  paint={{
                    'line-color': 'rgba(102, 126, 234, 0.5)',
                    'line-width': 3,
                    'line-opacity': 0.6,
                    'line-dasharray': [2, 2]
                  }}
                  filter={['==', ['get', 'SIGUNGU_NM'], selectedGu]}
                />
              )}
            </Source>
          )}
          
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
          const map = mapRef.current?.getMap()
          if (map) {
            // Toggle all Seoul boundary layers
            const boundaryLayers = ['seoul-boundary-shadow', 'seoul-boundary-line', 'seoul-boundary-highlight']
            boundaryLayers.forEach(layerId => {
              const layer = map.getLayer(layerId)
              if (layer) {
                try {
                  map.setLayoutProperty(layerId, 'visibility', show ? 'visible' : 'none')
                } catch (error) {
                  console.warn(`Failed to toggle ${layerId} visibility:`, error)
                }
              }
            })
          }
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

      <style jsx global>{`
        .mapboxgl-popup-content {
          background: rgba(0, 0, 0, 0.85);
          color: white;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        
        .mapboxgl-popup-tip {
          border-top-color: rgba(0, 0, 0, 0.85) !important;
        }
        
        .mapbox-tooltip .mapboxgl-popup-content {
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(20, 20, 20, 0.9));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        
        .mapbox-tooltip .mapboxgl-popup-content > div {
          padding: 12px 14px;
        }
        
        .mapboxgl-ctrl-group {
          background: rgba(0, 0, 0, 0.8) !important;
          border-radius: 8px !important;
        }
        
        .mapboxgl-ctrl-group button {
          background: transparent !important;
          color: white !important;
        }
        
        .mapboxgl-ctrl-group button:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
      </div>
      
      {/* Chart Panel - Right Side */}
      {showChartPanel && (
        <div className="w-2/5 h-full p-4 bg-black/80">
          <DefaultChartsPanel />
        </div>
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
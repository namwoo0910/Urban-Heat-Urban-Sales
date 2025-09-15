"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { throttle, debounce } from 'lodash-es'
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { FlyToInterpolator, LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core'
import UnifiedControls from "./SalesDataControls"
import { formatTooltip, formatScatterplotTooltip } from "./LayerManager"
import { usePreGeneratedSeoulMeshLayer } from "./SeoulMeshLayer"
import { useLayerState } from "../hooks/useCardSalesData"
// import { useOptimizedMonthlyData } from "../hooks/useOptimizedMonthlyData" // Removed - optimized data deleted
// import { useBinaryOptimizedData } from "../hooks/useBinaryOptimizedData" // Moved to del
import { DefaultChartsPanel } from "./charts/DefaultChartsPanel"
import { formatKoreanCurrency } from '@/src/shared/utils/salesFormatter'
import LocalEconomyFilterPanel from "./LocalEconomyFilterPanel"
import type { FilterState } from "./LocalEconomyFilterPanel"
import { getDistrictCode as getDistrictCodeFromMapping, getDongCode as getDongCodeFromMapping } from "../data/districtCodeMappings"
import { createDistrictLabelsTextLayer, createDongLabelsTextLayer } from "./DistrictLabelsTextLayer"
// Removed MeshLoadingOverlay import
import { MAPBOX_TOKEN } from "@/src/shared/constants/mapConfig"
import { useDistrictSelection } from "@/src/shared/hooks/useDistrictSelection"
import { loadDistrictData, getCurrentTheme, getCurrentThemeKey } from "@/src/shared/utils/districtUtils"
import { getDistrictCenter } from "../data/districtCenters"
import { DEFAULT_SEOUL_VIEW } from "@/src/shared/utils/district3DUtils"
// RotateCcw removed - replay button removed for performance
import { getModernDistrictColor, getModernEdgeColor, getModernMaterial, getDimmedColor, getSimpleSalesColor, applyColorAdjustments } from "../utils/modernColorPalette"
import { ResizablePanel } from "@/src/shared/components/ResizablePanel"
import * as turf from '@turf/turf'
import { useUnifiedDeckGLLayers } from "./DeckGLUnifiedLayers"
import { InlineMeshMonthToggle } from "./MeshMonthToggle"
import { getSeasonalMeshHexColor } from "../utils/seasonalMeshColors"
import { getTemperatureMeshHexColor } from "../utils/temperaturePalette"
import { getAvailableDailyDates } from "../utils/loadStaticMesh"
import type { FeatureCollection } from 'geojson'
import "../styles/CardSalesDistrictMap.css"
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
    // Color adjustments are now applied inside getSimpleSalesColor
    return color;
  }
  
  // Fallback to simple height-based color
  const h = height || 0;
  const baseAlpha = 242;
  
  // Simple height-based colors for fallback with adjustments
  let [r, g, b] = [200, 230, 255]; // Default very low
  if (h >= 600) [r, g, b] = [0, 0, 139];       // Very high
  else if (h >= 500) [r, g, b] = [0, 71, 171];      // High
  else if (h >= 400) [r, g, b] = [30, 144, 255];    // Medium-high
  else if (h >= 300) [r, g, b] = [100, 180, 255];   // Medium
  else if (h >= 200) [r, g, b] = [135, 206, 250];   // Low-medium
  else if (h >= 100) [r, g, b] = [173, 216, 230];   // Low
  
  // Apply theme adjustments to fallback colors
  return applyColorAdjustments(r, g, b, baseAlpha);
}

// 줌 설정 제거됨 - 행정동 클릭시 카메라 이동 없음

export default function CardSalesDistrictMap() {
  const mapRef = useRef<MapRef>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const [showChartPanel, setShowChartPanel] = useState(false)
  const [currentThemeState, setCurrentThemeState] = useState(getCurrentTheme)
  const [currentThemeKey, setCurrentThemeKey] = useState('blue') // Default to blue theme for districts
  // REMOVED: is3DMode state - 3D polygon layers not used
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
    
    
  } = useLayerState()
  
  // 기본 지도 상태
  const [currentLayer, setCurrentLayer] = useState("very-dark")
  const [currentTime, setCurrentTime] = useState(100)
  const [showBoundary, setShowBoundary] = useState(true)  // Always show Seoul boundary
  const [showDistrictLabels, setShowDistrictLabels] = useState(false) // 구 이름 표시 (기본값: 꺼짐)
  const [showDongLabels, setShowDongLabels] = useState(false) // 동 이름 표시
  
  // DeckGL 뷰 상태 - controlled component pattern for synchronization
  const [viewState, setViewState] = useState<MapViewState>({
    ...DEFAULT_SEOUL_VIEW,
    bearing: 0  // 초기 bearing은 0으로 설정
  })
  
  // 드래그 상태 추가 - 성능 최적화용
  const [isDragging, setIsDragging] = useState(false)
  
  // Removed initial camera animation states
  
  

  // 서울 좌표
  const SEOUL_COORDINATES: [number, number] = [126.978, 37.5665]
  
  // 기본 뷰로 리셋하는 재사용 함수
  const resetToDefaultView = useCallback(() => {
    setViewState({
      ...DEFAULT_SEOUL_VIEW,
      transitionInterpolator: new FlyToInterpolator({speed: 2}),
      transitionDuration: 1000
    } as MapViewState)
    
  }, [])
  
  // 통합 줌 처리 함수 - 필터 패널 선택에서 사용
  const handleDistrictZoom = useCallback((guName: string, dongName?: string | null) => {
    // 동 중심점 우선 사용
    const dongCenter = dongName ? getDistrictCenter('동', dongName) : null
    const center = dongCenter || getDistrictCenter('구', guName)
    
    if (center) {
        // 줌 기능 제거 - 카메라 이동 없이 선택만 유지
        // setViewState(prev => ({
        //   ...prev,
        //   longitude: center[0],
        //   latitude: center[1],
        //   zoom: dongCenter ? ZOOM_SETTINGS.DONG : ZOOM_SETTINGS.GU,
        //   pitch: dongCenter ? ZOOM_SETTINGS.PITCH_DONG : ZOOM_SETTINGS.PITCH_GU,
        //   bearing: prev.bearing || 0,
        //   transitionInterpolator: new FlyToInterpolator({speed: 1.5}),
        //   transitionDuration: 'auto'
        // } as MapViewState))
      
    }
  }, [setViewState])
  
  // Handle filter panel changes - simplified to prevent loops
  const handleFilterChange = useCallback((filters: FilterState) => {
    // Directly update states without checking current values
    // This prevents unnecessary re-renders and loops
    setSelectedGu(filters.selectedGu)
    setSelectedGuCode(filters.selectedGuCode)
    setSelectedDong(filters.selectedDong)
    setSelectedDongCode(filters.selectedDongCode)
    setSelectedBusinessType(filters.selectedBusinessType)
    
    // 필터에서 행정동 선택시 줌 제거 - 선택만 하고 카메라 이동 없음
    // if (filters.selectedDong && filters.selectedGu) {
    //   handleDistrictZoom(filters.selectedGu, filters.selectedDong)
    // } else if (filters.selectedGu && !filters.selectedDong) {
    //   // 구만 선택시: 서울 전체 뷰 유지, 하이라이트만 표시
    //   // 뷰포트 변경하지 않음 - 하이라이트만 표시됨
    // }
  }, [setSelectedGu, setSelectedGuCode, setSelectedDong, setSelectedDongCode, setSelectedBusinessType, handleDistrictZoom])
  
  // Hover state for districts
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
  

  // District selection hook
  const districtSelection = useDistrictSelection({ 
    mapRef,
    onDistrictSelect: (districtName, feature) => {
      
      // Update filter panel when map is clicked
      // REMOVED: sgg-fill layer handling - sgg data not needed
      if (feature?.layer?.id === 'dong-fill') {
        setSelectedDong(districtName)
        // Don't change gu when dong is selected (dong belongs to current gu)
      }
    }
  })
  
  // District GeoJSON data - REMOVED: sggData not needed
  const [dongData, setDongData] = useState<any>(null)
  
  // REMOVED: 3D polygon data states - 3D polygon layers not used
  
  // 동별 매출 데이터 Map (dongCode -> totalSales)
  const [dongSalesMap, setDongSalesMap] = useState<Map<number, number>>(new Map())
  // 동별 업종별 매출 데이터 Map (dongCode -> (businessType -> sales))
  const [dongSalesByTypeMap, setDongSalesByTypeMap] = useState<Map<number, Map<string, number>>>(new Map())
  
  // 높이 스케일 조정값 (기본값: 1억원 = 1 단위)
  const [heightScale, setHeightScale] = useState<number>(500000000) // 5억원 단위로 증가 (높이 감소)
  
  
  // Mesh layer states
  const [showMeshLayer, setShowMeshLayer] = useState<boolean>(true)  // Default to showing mesh layer
  
  // Layer configuration
  const handlePolygonLayerToggle = useCallback((visible: boolean) => {
    setVisible(visible)
    if (visible) {
      setShowMeshLayer(false) // Turn off mesh layer when polygon layer is turned on
    }
  }, [setVisible])
  
  const handleMeshLayerToggle = useCallback((visible: boolean) => {
    setShowMeshLayer(visible)
    if (visible) {
      setVisible(false) // Turn off polygon layer when mesh layer is turned on
    }
  }, [setVisible])
  // Wireframe always true - removed state
  const [meshResolution, setMeshResolution] = useState<number>(120)  // Ultra high resolution 120x120 grid for detailed visualization
  const [meshColor, setMeshColor] = useState<string>('#FFFFFF')  // Default white color
  const [useSeasonalMeshColor, setUseSeasonalMeshColor] = useState<boolean>(false)
  const [timelineMode, setTimelineMode] = useState<'monthly'|'daily'>('monthly')
  const [availableDailyDates, setAvailableDailyDates] = useState<string[]>([])
  const [selectedDailyIndex, setSelectedDailyIndex] = useState<number>(0)
  const [dailyAutoPlay, setDailyAutoPlay] = useState<boolean>(false)
  const [dailyPlaySpeed, setDailyPlaySpeed] = useState<number>(0.8)
  const [transitionMs, setTransitionMs] = useState<number>(400)
  const [selectedMeshMonth, setSelectedMeshMonth] = useState<number>(1)  // Default to January (1-12)

  // Top-center overlay: date + average temperature
  const [overlayDateLabel, setOverlayDateLabel] = useState<string>('')
  const [overlayAvgTemp, setOverlayAvgTemp] = useState<number | null>(null)
  const [overlayLoading, setOverlayLoading] = useState<boolean>(false)
  const [overlayHeight, setOverlayHeight] = useState<number>(80)
  const tempBarPercent = useMemo(() => {
    if (overlayAvgTemp === null || isNaN(overlayAvgTemp)) return 0
    const min = -15, max = 35
    const p = Math.max(0, Math.min(1, (overlayAvgTemp - min) / (max - min)))
    return Math.round(p * 100)
  }, [overlayAvgTemp])
  const tempBarColor = useMemo(() => {
    const t = overlayAvgTemp ?? 0
    if (t <= 0) return '#60a5fa' // blue
    if (t <= 15) return '#34d399' // green
    if (t <= 25) return '#f59e0b' // amber
    return '#ef4444' // red
  }, [overlayAvgTemp])

  // Match overlay height to info panel height
  useEffect(() => {
    const measure = () => {
      const el = document.getElementById('selected-area-info-panel')
      if (el) {
        setOverlayHeight(el.clientHeight)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    // Observe mutations to adjust on content changes (e.g., chart toggle)
    const el = document.getElementById('selected-area-info-panel')
    let observer: MutationObserver | null = null
    if (el && 'MutationObserver' in window) {
      observer = new MutationObserver(() => {
        setOverlayHeight(el.clientHeight)
      })
      observer.observe(el, { childList: true, subtree: true, attributes: true })
    }
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Re-measure when content likely changes
  useEffect(() => {
    const el = document.getElementById('selected-area-info-panel')
    if (el) setOverlayHeight(el.clientHeight)
  }, [timelineMode, selectedMeshMonth, availableDailyDates, selectedDailyIndex])

  // Load daily dates index
  useEffect(() => {
    getAvailableDailyDates()
      .then(list => {
        const sorted = (list || []).sort()
        setAvailableDailyDates(sorted)
        setSelectedDailyIndex(0)
      })
      .catch(() => {})
  }, [])

  // Load temperature index (daily + monthly) once
  const [tempIndex, setTempIndex] = useState<{ daily: Record<string, number>; monthly: Record<string, number> } | null>(null)
  useEffect(() => {
    fetch('/data/indices/daily-avg-temp-2024.json')
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json && json.daily && json.monthly) {
          setTempIndex({ daily: json.daily, monthly: json.monthly })
        }
      })
      .catch(() => {})
  }, [])

  // Fallback temperature loaders (when index is missing)
  const fetchMonthlyAverageTemp = useCallback(async (yearMonth: string) => {
    try {
      setOverlayLoading(true)
      const res = await fetch(`/data/local_economy/monthly/${yearMonth}.json`)
      if (!res.ok) throw new Error(`Failed to load ${yearMonth}`)
      const arr = await res.json()
      let sum = 0, cnt = 0
      for (const item of arr) {
        const t = item['일평균기온']
        if (typeof t === 'number' && !isNaN(t)) { sum += t; cnt++ }
      }
      setOverlayAvgTemp(cnt > 0 ? sum / cnt : null)
    } catch (e) {
      console.warn('Monthly avg temp load failed', e)
      setOverlayAvgTemp(null)
    } finally {
      setOverlayLoading(false)
    }
  }, [])

  const fetchDailyAverageTemp = useCallback(async (dateStr: string) => {
    try {
      setOverlayLoading(true)
      const ym = dateStr.slice(0,7)
      const res = await fetch(`/data/local_economy/monthly/${ym}.json`)
      if (!res.ok) throw new Error(`Failed to load ${ym}`)
      const arr = await res.json()
      let sum = 0, cnt = 0
      for (const item of arr) {
        if (item['기준일자'] === dateStr) {
          const t = item['일평균기온']
          if (typeof t === 'number' && !isNaN(t)) { sum += t; cnt++ }
        }
      }
      setOverlayAvgTemp(cnt > 0 ? sum / cnt : null)
    } catch (e) {
      console.warn('Daily avg temp load failed', e)
      setOverlayAvgTemp(null)
    } finally {
      setOverlayLoading(false)
    }
  }, [])

  // Auto-apply seasonal mesh color
  useEffect(() => {
    if (!useSeasonalMeshColor) return
    if (timelineMode === 'monthly') {
      setMeshColor(getSeasonalMeshHexColor(selectedMeshMonth))
    } else if (timelineMode === 'daily' && availableDailyDates.length > 0) {
      const dd = availableDailyDates[selectedDailyIndex]
      const mm = dd?.slice(0,6)
      if (mm) setMeshColor(getSeasonalMeshHexColor(mm))
    }
  }, [useSeasonalMeshColor, selectedMeshMonth, timelineMode, availableDailyDates, selectedDailyIndex])

  // Chain scheduling for daily autoplay (align transition to tick)
  const dailyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearDailyTimer = useCallback(() => {
    if (dailyTimeoutRef.current) {
      clearTimeout(dailyTimeoutRef.current)
      dailyTimeoutRef.current = null
    }
  }, [])

  const scheduleNextDailyTick = useCallback(() => {
    clearDailyTimer()
    if (timelineMode !== 'daily' || !dailyAutoPlay || availableDailyDates.length === 0) return
    const budget = Math.floor(dailyPlaySpeed * 1000 - transitionMs)
    if (budget <= 0) {
      // No idle gap: wait one frame to avoid back-to-back frame contention
      dailyTimeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          setSelectedDailyIndex(prev => (prev + 1) % availableDailyDates.length)
        })
      }, 0)
    } else {
      const restDelay = Math.max(16, budget) // at least one frame of breathing room
      dailyTimeoutRef.current = setTimeout(() => {
        setSelectedDailyIndex(prev => (prev + 1) % availableDailyDates.length)
      }, restDelay)
    }
  }, [timelineMode, dailyAutoPlay, availableDailyDates.length, dailyPlaySpeed, transitionMs, clearDailyTimer])

  // When toggling autoplay or changing params, restart schedule
  useEffect(() => {
    scheduleNextDailyTick()
    return clearDailyTimer
  }, [timelineMode, dailyAutoPlay, dailyPlaySpeed, transitionMs, availableDailyDates.length, scheduleNextDailyTick, clearDailyTimer])

  // After each index change during autoplay, schedule the next tick
  useEffect(() => {
    if (dailyAutoPlay && timelineMode === 'daily') {
      scheduleNextDailyTick()
    }
  }, [selectedDailyIndex, dailyAutoPlay, timelineMode, scheduleNextDailyTick])

  // Update overlay (date label + avg temp) using prebuilt index (fast, no fetch per step)

  // Update overlay (date label + avg temp) when timeline changes (index first, fallback to fetch)
  useEffect(() => {
    if (timelineMode === 'monthly') {
      const mm = selectedMeshMonth.toString().padStart(2, '0')
      const yearMonth = `2024-${mm}`
      setOverlayDateLabel(yearMonth)
      const key = `2024${mm}`
      const v = tempIndex?.monthly ? tempIndex.monthly[key] : undefined
      if (typeof v === 'number') {
        setOverlayAvgTemp(v)
        setOverlayLoading(false)
      } else {
        fetchMonthlyAverageTemp(yearMonth)
      }
    } else if (timelineMode === 'daily' && availableDailyDates.length > 0) {
      const code = availableDailyDates[selectedDailyIndex]
      if (code && code.length === 8) {
        const label = `${code.slice(0,4)}-${code.slice(4,6)}-${code.slice(6,8)}`
        setOverlayDateLabel(label)
        const v = tempIndex?.daily ? tempIndex.daily[code] : undefined
        if (typeof v === 'number') {
          setOverlayAvgTemp(v)
          setOverlayLoading(false)
        } else {
          fetchDailyAverageTemp(label)
        }
      }
    } else {
      setOverlayDateLabel('')
      setOverlayAvgTemp(null)
    }
  }, [timelineMode, selectedMeshMonth, availableDailyDates, selectedDailyIndex, tempIndex, fetchMonthlyAverageTemp, fetchDailyAverageTemp])
  
  // Remove progressive rendering states - not needed with optimized loading
  // All layers now load on demand based on visibility settings
  
  // Helper function to handle dong click from text labels
  const handleDongClick = useCallback((dongName: string) => {
    if (!dongName || !selectedGu) return
    
    setSelectedDong(dongName)
    const dongCode = getDongCodeFromMapping(selectedGu, dongName)
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


  const handleLayerChange = useCallback((layer: string) => {
    setCurrentLayer(layer)
  }, [])

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])
  
  // 구 이름 클릭 핸들러
  const handleDistrictLabelClick = useCallback((districtName: string) => {
    setSelectedGu(districtName)
    setSelectedDong(null)
    // 구 코드 설정
    const guCode = getDistrictCodeFromMapping(districtName)
    if (guCode) {
      setSelectedGuCode(guCode)
    }
    setSelectedDongCode(null)
    
    // 구 라벨 클릭시: 서울 전체 뷰 유지, 하이라이트만 표시
    // 줌인하지 않음
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

  // 3D 모드 전환 핸들러 - REMOVED: 3D polygon layers not used

  
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


  // Helper function to extract district code from various property names
  const getDistrictCode = useCallback((properties: any): string | null => {
    return properties?.ADM_DR_CD || 
           properties?.dongCode || 
           properties?.dong_code ||
           properties?.['행정동코드'] ||
           properties?.DONG_CD ||
           properties?.H_CODE ||
           null
  }, [])
  
  // Helper function to extract district name from various property names
  const getDistrictName = useCallback((properties: any): string | null => {
    return properties?.ADM_DR_NM || 
           properties?.dongName || 
           properties?.dong_name ||
           properties?.['행정동'] ||
           properties?.DONG_NM ||
           properties?.H_DONG_NM ||
           properties?.EMD_NM ||
           properties?.EMD_KOR_NM ||
           null
  }, [])
  
  // Helper function to extract gu name from various property names
  const getGuName = useCallback((properties: any): string | null => {
    return properties?.guName || 
           properties?.['자치구'] ||
           properties?.SGG_NM ||
           properties?.SIGUNGU_NM ||
           properties?.SIG_KOR_NM ||
           null
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
          const dongCode = getDistrictCode(feature.properties) || 0
          const dongName = getDistrictName(feature.properties) ||
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

  // Handle unified DeckGL hover for all layers - debounced for performance
  const handleUnifiedHover = useMemo(() => 
    debounce((info: PickingInfo) => {
      // Skip during drag for performance
      if (isDragging) return
      
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
      else if (info.layer?.id?.includes('unified-dong')) {
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
    }, 50), // 50ms debounce
  [setHoveredObject, isDragging])

  // Handle unified DeckGL click for all layers
  const handleUnifiedClick = useCallback((info: PickingInfo) => {
    // Handle hexagon layer click
    if (info.layer?.id?.includes('hexagon') && info.object && info.object.originalData) {
      const { guName, dongName, guCode, dongCode } = info.object.originalData
      
      // Set district selections with both names and codes
      if (dongName && guName) {
        // 동 클릭시: 구와 동 모두 설정
        setSelectedGu(guName)
        const calculatedGuCode = guCode || getDistrictCodeFromMapping(guName)
        const calculatedDongCode = dongCode || getDongCodeFromMapping(guName, dongName)
        
        setSelectedGuCode(calculatedGuCode ?? null)
        setSelectedDong(dongName)
        setSelectedDongCode(calculatedDongCode ?? null)
        
          } else if (guName) {
        // 구 클릭시: 구만 설정 (서울 전체 뷰 유지)
        setSelectedGu(guName)
        const calculatedGuCode = guCode || getDistrictCodeFromMapping(guName)
        setSelectedGuCode(calculatedGuCode ?? null)
        setSelectedDong(null)
        setSelectedDongCode(null)
        
          }
    }
    // REMOVED: sgg district click handling - sgg data not needed
    else if (info.layer?.id?.includes('unified-dong') && info.object && info.object.properties) {
      const dongName = getDistrictName(info.object.properties)
      const guName = getGuName(info.object.properties)
      if (dongName && guName) {
        setSelectedGu(guName)
        setSelectedDong(dongName)
        const calculatedGuCode = getDistrictCodeFromMapping(guName)
        const calculatedDongCode = getDongCodeFromMapping(guName, dongName)
        setSelectedGuCode(calculatedGuCode ?? null)
        setSelectedDongCode(calculatedDongCode ?? null)
          }
    }
    // Handle district labels click
    else if (info.layer?.id?.includes('district-labels') && info.object) {
      const guName = info.object.nameKr
      if (guName) {
        setSelectedGu(guName)
        const calculatedGuCode = getDistrictCodeFromMapping(guName)
        setSelectedGuCode(calculatedGuCode ?? null)
        setSelectedDong(null)
        setSelectedDongCode(null)
          }
    }
  }, [setSelectedGu, setSelectedGuCode, setSelectedDong, setSelectedDongCode])

  
  // REMOVED: createDong3DPolygonLayersOptimized function - 3D polygon layers not used
  
  // Create lighting configuration for 3D mesh rendering
  const lightingEffect = useMemo(() => {
    // Ambient light for base illumination - increased for brighter scene
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 0.8  // Increased from 0.5
    })
    
    // Directional light for main illumination (simulating sunlight) - increased intensity
    const directionalLight = new DirectionalLight({
      direction: [-1, -3, -1],  // Light coming from upper right
      color: [255, 255, 255],
      intensity: 1.5  // Increased from 1.0
    })
    
    // Create lighting effect with both lights
    return new LightingEffect({
      ambientLight,
      directionalLight
    })
  }, [])  // Lighting configuration is constant
  
  // Use pre-generated mesh layer for better performance with real sales data
  const dynamicMeshColor = useMemo(() => {
    // Temperature-based dynamic color (fallback to existing meshColor if temp unknown)
    return overlayAvgTemp !== null ? getTemperatureMeshHexColor(overlayAvgTemp) : meshColor
  }, [overlayAvgTemp, meshColor])

  const { layer: preGeneratedMeshLayer, isLoading: isMeshLoading } = usePreGeneratedSeoulMeshLayer({
    resolution: meshResolution,
    visible: showMeshLayer,
    wireframe: true,  // Always wireframe
    opacity: 1,  // Wireframe opacity
    animatedOpacity: 0.8,  // Fixed opacity
    month: timelineMode === 'monthly' ? (selectedMeshMonth < 10 ? `20240${selectedMeshMonth}` : `2024${selectedMeshMonth}`) : undefined,
    date: timelineMode === 'daily' ? availableDailyDates[selectedDailyIndex] : undefined,
    pickable: false,  // Disabled to prevent tooltips and highlighting
    useMask: true,  // Enable masking to clip wireframe at Seoul boundaries
    color: dynamicMeshColor,  // Temperature-based sleek color
    transitionMs: transitionMs,
    // REMOVED: dongBoundaries parameter - no 3D polygon data needed
    dongSalesMap: dongSalesMap,  // Pass sales data map
    salesHeightScale: heightScale  // Use the same height scale as polygon layer
    // onHover and onClick removed - mesh layer is purely visual
  }, null)  // REMOVED: dongData3D dependency
  
  // Removed initial camera animation
  
  // 자동 회전 기능 제거 - 성능 최적화를 위해 비활성화
  
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
    seoulBoundaryData,
    isDragging,
    viewState: {
      ...viewState,
      pitch: viewState.pitch ?? 0,
      bearing: viewState.bearing ?? 0
    },
    showBoundary
  })
  
  // Remove unnecessary progressive loading - all layers load immediately now
  // Layer loading state is managed directly in the render logic
  
  // Combine all deck.gl layers - Using conditional rendering for better performance (no cloning)
  const deckLayers = useMemo(() => {
    // Early return if all layers are off
    if (!showMeshLayer && !layerConfig.visible && !showDistrictLabels && !showDongLabels) {
      return []
    }
    const layers = []
    
    // Critical layer: Mesh (conditional rendering instead of cloning)
    if (preGeneratedMeshLayer && showMeshLayer) {
      layers.push(preGeneratedMeshLayer)
    }
    
    // Include unified 2D layers only in 2D mode (conditional rendering instead of cloning)
    if (unifiedLayers && unifiedLayers.length > 0) {
      layers.push(...unifiedLayers)
    }
    
    // REMOVED: 3D polygon layer rendering - 3D polygon layers not used
    
    
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
      if (selectedGu && dongData) {
        const dongLabelData = dongData.features?.filter((feature: any) => {
          const guName = getGuName(feature.properties)
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
  }, [showDistrictLabels, showDongLabels, viewState.zoom,
      selectedGu, selectedDong, hoveredDistrict, showMeshLayer, preGeneratedMeshLayer,
      unifiedLayers, layerConfig, dongData])  // REMOVED: is3DMode, dongData3D, createDong3DPolygonLayersOptimized dependencies
  
  // 기존 HexagonLayer 코드 (주석 처리)
  // 툴팁 핸들러 (Context7 권장 패턴)
  const getTooltip = (info: PickingInfo) => {
    if (!info.object) {
      return null
    }
    
    try {
      // 디버깅: 실제 레이어 ID 확인
      console.log('[Tooltip Debug] Layer ID:', info.layer?.id, 'Object keys:', Object.keys(info.object))
      
      // District layer tooltip handling
      // Check for properties existence to determine if it's a district feature
      if (info.object && info.object.properties) {
        const properties = info.object.properties
        
        // 한글과 영문 속성명 모두 체크
        const dongCode = getDistrictCode(properties)
        
        const dongName = getDistrictName(properties) || 
                        properties.H_DONG_NM || 
                        properties.DONG_NM || 
                        properties.EMD_NM ||
                        properties.EMD_KOR_NM ||
                        '행정동 정보 없음'
        
        const guName = getGuName(properties) || 
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
      
      
      // 기존 HexagonLayer의 경우 (폴백) - dongSalesMap 사용하도록 개선
      console.log('[Tooltip Debug] Using fallback logic, dongSalesMap size:', dongSalesMap.size)
      
      // dongSalesMap에서 데이터가 있으면 기본 툴팁 생성
      if (dongSalesMap.size > 0 && info.object.coordinates) {
        // 좌표 기반으로 가장 가까운 동 찾기 (임시 해결책)
        const position = info.object.coordinates || info.object.position
        if (position) {
          const tooltipHtml = `
📍 위치: ${position[1].toFixed(4)}, ${position[0].toFixed(4)}
💰 데이터: ${dongSalesMap.size}개 동 로딩됨
📅 날짜: ${selectedDate || '정보 없음'}
          `.trim()
          
          return {
            html: tooltipHtml,
            style: {
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              color: 'white',
              fontSize: '13px',
              padding: '14px',
              borderRadius: '8px',
              whiteSpace: 'pre-line',
              maxWidth: '320px',
              lineHeight: '1.6',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)'
            }
          }
        }
      }
      
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
  
  // Load district data
  useEffect(() => {
    const loadData = async () => {
      const dong = await loadDistrictData('dong')
      // REMOVED: sgg data loading - not needed
      if (dong) {
        setDongData(dong)
        if (dong.features?.[0]) {
        }
      }
    }
    
    loadData()
  }, [])
  // Binary 형식 사용 여부 (환경변수 또는 기본값 true)
  const USE_BINARY_FORMAT = process.env.NEXT_PUBLIC_USE_BINARY_FORMAT !== 'false'
  
  // 데이터 형식 로깅 (최초 1회만)
  useEffect(() => {
  }, [])
  
  // Binary 형식 데이터 로딩 - 주석 처리 (moved to del)
  // const binaryDataResult = useBinaryOptimizedData({ 
  //   selectedDate: formatSelectedDate,
  //   enabled: USE_BINARY_FORMAT,
  //   useBinary: true
  // })
  
  // Optimized data removed - initialize with empty values
  const optimizedFeatures = null
  const optimizedDongMap = new Map()
  const isOptimizedLoading = false
  const optimizedError = null
  
  // Optimized data debugging removed
  
  // 성능 로깅 - 주석 처리 (binary data removed)
  useEffect(() => {
    if (false) { // Disabled since binary data is removed
    }
  }, []) // Removed dependencies since binary data is removed

  // Sales data loading removed - optimized data deleted
  useEffect(() => {
    // Initialize empty maps since optimized data is removed
    const salesByDong = new Map<number, number>()
    const salesByDongAndType = new Map<number, Map<string, number>>()

    setDongSalesMap(salesByDong)
    setDongSalesByTypeMap(salesByDongAndType)
  }, [])
  
  // Memoize dong colors for performance
  const dongColorMap = useMemo(() => {
    if (!dongData || !dongData.features) return new Map()

    const colorMap = new Map()
    dongData.features.forEach((feature: any) => {
      const dongCode = getDistrictCode(feature.properties)
      
      if (dongCode) {
        // Pre-calculate base color (without hover/selection state)
        const height = feature.properties.height || 0
        const guName = getGuName(feature.properties)
        const dongName = getDistrictName(feature.properties)
        const totalSales = dongSalesMap.get(Number(dongCode)) || 0
        
        // Calculate base color without optimized data
        const baseColor = convertColorExpressionToRGB(height, currentThemeKey, guName || undefined, dongName || undefined, false, false, totalSales)
        
        colorMap.set(dongCode, {
          baseColor,
          guName,
          dongName
        })
      }
    })
    
    return colorMap
  }, [dongData, dongSalesMap, currentThemeKey])

  
  // REMOVED: 3D data preprocessing useEffect - 3D polygon layers not used
  
  
  // Lighting for 3D mode handled by DeckGL lighting effects
  // No Mapbox-specific lighting setup needed
  
  // Layer styling handled by DeckGL unified layers
  // No manual Mapbox layer style updates needed

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      
      // Force React re-render by updating state
      const newTheme = getCurrentTheme()
      const newThemeKey = getCurrentThemeKey()
      setCurrentThemeState(newTheme)
      setCurrentThemeKey(newThemeKey)
      
      // Theme updates now handled by Deck.gl unified layers
      // Colors update automatically through props and updateTriggers
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

  // REMOVED: sggIndex - sgg data not needed

  const dongIndex = useMemo(() => {
    if (!dongData?.features) {
      return new Map()
    }
    
    const index = new Map()
    
    dongData.features.forEach((f: any) => {
      const props = f.properties || {}
      // 행정동 코드로 인덱싱 - 다양한 속성명 지원 (한글 속성명 포함)
      const dongCode = getDistrictCode(props)
      
      if (dongCode) {
        // 코드를 숫자로 변환하여 저장
        const codeNumber = Number(dongCode)
        index.set(codeNumber, f)
        // 디버깅용 - 첫 5개 항목 로깅
        if (index.size <= 5) {
        }
      }
    })
    
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
      
      
      setSelectedDistrictData(selectedFeatureData)
    } else if (!selectedGu && !selectedDong) {
      // Only clear if no filter is selected
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
      //   guCode: selectedGuCode, 
      //   guName: selectedGu,
      //   dongCode: selectedDongCode,
      //   dongName: selectedDong 
      // })
      
      let foundFeature = null
      let foundGuFeature = null // 동 선택시 구 경계도 필요
      
      // Fast lookup using Map index with codes - O(1) instead of O(n)
      // 동이 선택된 경우 동 경계를 하이라이트
      if (selectedDongCode) {
        const dongFeature = dongIndex.get(selectedDongCode)
        if (dongFeature) {
          foundFeature = dongFeature
          
          // REMOVED: sgg feature lookup - sgg data not needed
        } else {
        }
      }
      // 구만 선택된 경우 구 경계를 하이라이트  
      else if (selectedGuCode || selectedGu) {
        // REMOVED: sgg feature lookup - sgg data not needed
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
        
        features.forEach((f, idx) => {
        })
        
        setSelectedDistrictData(selectedFeatureData)
      } else {
        setSelectedDistrictData(null)
      }
    } else {
      // Reset to Seoul overview when no filter is selected
      setSelectedDistrictData(null)
      
      
      // Return to default Seoul view (재사용 함수 사용)
      resetToDefaultView()
    }
  }, [selectedGuCode, selectedDongCode, selectedGu, selectedDong, districtSelection.selectedDistrict, dongIndex, resetToDefaultView]) // Use both codes and names

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
  const layerFilter = useCallback(({ layer, viewport }: any) => {
    // During drag, only render essential layers
    if (isDragging) {
      // Always render mesh and essential layers
      if (layer.id.includes('mesh')) {
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

  // 재생 기능 제거 - 성능 최적화를 위해 비활성화

  return (
    <div className="relative w-full h-screen flex">
      {/* Mesh Loading Overlay */}
      {/* Removed MeshLoadingOverlay */}
      
      {/* Map Section - Flexible Width */}
      <div className={`relative flex-1 transition-all duration-300`}>
        {/* 애니메이션 버튼 제거 - 성능 최적화 */}
        
        {/* DeckGL + Mapbox 통합 (Official deck.gl pattern) */}
        <DeckGL
        viewState={viewState}
        controller={true}
        layers={deckLayers} // Deck.gl layers for visualization
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
          blend: true,
          blendFunc: [770, 771, 1, 771], // [GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA, GL_ONE, GL_ONE_MINUS_SRC_ALPHA]
          depthTest: true,
          depthFunc: 513, // GL_LEQUAL
        } as any}
        _typedArrayManagerProps={{
          overAlloc: 1.2,  // Reduce over-allocation (default 2.0)
          poolSize: 100    // Limit pool size for memory efficiency
        }}
        onClick={handleUnifiedClick}
        onHover={handleUnifiedHover}
        onDragStart={() => {
          setIsDragging(true) // 드래그 상태 설정
        }}
        onDragEnd={() => {
          setIsDragging(false) // 드래그 상태 해제
        }}
        onViewStateChange={useMemo(() => 
          throttle(({ viewState: newViewState }) => {
            
            // Update the viewState - DeckGL and MapGL sync automatically
            setViewState(newViewState as MapViewState)
            
          }, 16), // 60fps
        [setViewState])}
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
          } : currentLayer === 'very-dark' ? 'mapbox://styles/mapbox/dark-v11' : currentLayer}
          {...viewState}
          onDblClick={districtSelection.handleMapReset}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        >
          {/* All layers are now rendered by Deck.gl for better performance */}
          
          {/* District Labels Layer - Now handled by Deck.gl TextLayer in deckLayers */}
          {/* Old Mapbox implementation commented out - replaced with Deck.gl TextLayer
          {showDistrictLabels && (
            <DistrictLabelsLayer 
              visible={viewState.zoom >= 10}
              onClick={handleDistrictLabelClick}
              minZoom={10}
            />
          )}
          */}
          
          {/* 동 레이블은 이제 Deck.gl TextLayer로 처리됨 - 중복 제거 */}
          
          
          {/* Semi-transparent black overlay for very-dark mode - inside MapGL, under DeckGL layers */}
          {currentLayer === 'very-dark' && (
            <div 
              className="absolute inset-0 bg-black/70 pointer-events-none" 
              style={{ mixBlendMode: 'multiply' }}
            />
          )}
        </MapGL>
      </DeckGL>
      
      {/* Center-top overlay: date + average temperature */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '56px' }}>
        <div
          className="bg-black/80 backdrop-blur-sm rounded-md px-2 py-1 border border-gray-800/50 flex items-center gap-2 shadow-lg"
          style={{ margin: '5px' }}
        >
          <div className="text-white text-base font-semibold tracking-wide min-w-[80px] text-center">
            {overlayDateLabel || '—'}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-cyan-300 text-base font-semibold min-w-[56px] text-center">
              {overlayLoading ? '…' : (overlayAvgTemp !== null ? `${overlayAvgTemp.toFixed(1)}°C` : '—')}
            </div>
            <div className="w-24 h-1 bg-gray-800 rounded overflow-hidden">
              <div
                className="h-1"
                style={{ width: `${tempBarPercent}%`, backgroundColor: tempBarColor }}
              />
            </div>
          </div>
        </div>
      </div>


      {/* LocalEconomy Filter Panel - Positioned properly above map */}
      <LocalEconomyFilterPanel
        onFilterChange={handleFilterChange}
        // External sync props for bidirectional updates
        externalSelectedGu={selectedGu}
        externalSelectedDong={selectedDong}
        externalSelectedBusinessType={selectedBusinessType}
        // Timeline animation state
      />



      {/* 통합 컨트롤 패널 */}
      <UnifiedControls
        // Required time props
        onTimeChange={() => {}}
        currentTime={0}
        // 지도 컨트롤 props
        showBoundary={showBoundary}
        onBoundaryToggle={(show) => {
          setShowBoundary(show)
          // Boundary visibility now controlled through Deck.gl layer props
        }}
        onSeoulBaseToggle={(show) => {
          // Seoul base is now removed, this toggle can be deprecated or repurposed
        }}
        // REMOVED: 3D mode props - 3D polygon layers not used
        // 높이 스케일 props
        heightScale={heightScale}
        onHeightScaleChange={setHeightScale}
        // 레이어 컨트롤 props
        visible={layerConfig.visible}
        coverage={layerConfig.coverage}
        upperPercentile={layerConfig.upperPercentile}
        isDataLoading={isDataLoading}
        dataError={dataError}
        onVisibleChange={handlePolygonLayerToggle}
        onCoverageChange={setCoverage}
        onUpperPercentileChange={setUpperPercentile}
        onReset={resetConfig}
        // 색상 모드 props
        colorMode={colorMode === 'alert' ? 'sales' : colorMode}
        onColorModeChange={setColorMode}
        selectedHour={selectedHour}
        onSelectedHourChange={setSelectedHour}
        // 애니메이션 props
        animationSpeed={layerConfig.animationSpeed}
        waveAmplitude={layerConfig.waveAmplitude}
        onAnimationEnabledChange={setAnimationEnabled}
        onAnimationSpeedChange={setAnimationSpeed}
        onWaveAmplitudeChange={setWaveAmplitude}
        
        
        // Mesh layer props
        showMeshLayer={showMeshLayer}
        onShowMeshLayerChange={handleMeshLayerToggle}
        // Wireframe always true - props removed
        // Mesh resolution fixed at 120 - props removed
        meshColor={meshColor}
        onMeshColorChange={setMeshColor}
        useSeasonalMeshColor={useSeasonalMeshColor}
        onUseSeasonalMeshColorChange={setUseSeasonalMeshColor}
        timelineMode={timelineMode}
        onTimelineModeChange={setTimelineMode}
        dailyAvailableCount={availableDailyDates.length}
        selectedDailyIndex={selectedDailyIndex}
        onSelectedDailyIndexChange={setSelectedDailyIndex}
        dailyAutoPlay={dailyAutoPlay}
        onDailyAutoPlayChange={setDailyAutoPlay}
        dailyPlaySpeed={dailyPlaySpeed}
        onDailyPlaySpeedChange={setDailyPlaySpeed}
        transitionMs={transitionMs}
        onTransitionMsChange={setTransitionMs}
        selectedMeshMonth={selectedMeshMonth}
        onMeshMonthChange={setSelectedMeshMonth}
        />

      {/* 지도 초기화 버튼 */}
      <button
        onClick={handleFullReset}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-black/90 hover:bg-gray-900/50 backdrop-blur-md text-gray-200 text-sm font-medium px-4 py-2 rounded-lg border border-gray-800/50 transition-all duration-200 shadow-2xl"
      >
        지도 초기화
      </button>

      {false && (
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
      
      {/* Chart Open Button - Always visible at right edge */}
      {!showChartPanel && (
        <button
          onClick={() => setShowChartPanel(true)}
          className="fixed top-4 right-0 bg-black/90 backdrop-blur-md border-l border-t border-b border-gray-800/50 rounded-l-lg shadow-2xl hover:bg-gray-900/50 transition-all duration-300 z-40 group hover:pl-1"
        >
          <div className="py-6 px-3 flex flex-col items-center justify-center space-y-3">
            {/* Icon */}
            <svg 
              className="w-5 h-5 text-blue-400 transition-transform duration-300"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            
            {/* Vertical Text */}
            <div 
              className="text-gray-200 font-bold text-sm tracking-wider"
              style={{ 
                writingMode: 'vertical-rl',
                textOrientation: 'mixed'
              }}
            >
              차트열기
            </div>
            
            {/* Arrow Indicator */}
            <svg 
              className="w-4 h-4 text-gray-400 transition-transform duration-300 rotate-180"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}
      
      {/* Chart Panel with Wing Button */}
      <div 
        className={`fixed top-0 right-0 h-full flex transition-all duration-500 z-40 ${
          showChartPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Wing Button - Vertical Tab */}
        <button
          onClick={() => setShowChartPanel(!showChartPanel)}
          className="absolute top-4 -left-12 bg-black/90 backdrop-blur-md border-l border-t border-b border-gray-800/50 rounded-l-lg shadow-2xl hover:bg-gray-900/50 transition-all duration-300 group hover:pr-1"
        >
          <div className="py-6 px-3 flex flex-col items-center justify-center space-y-3">
            {/* Icon */}
            <svg 
              className={`w-5 h-5 text-blue-400 transition-transform duration-300 ${
                showChartPanel ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            
            {/* Vertical Text */}
            <div 
              className="text-gray-200 font-bold text-sm tracking-wider"
              style={{ 
                writingMode: 'vertical-rl',
                textOrientation: 'mixed'
              }}
            >
              {showChartPanel ? '차트닫기' : '차트열기'}
            </div>
            
            {/* Arrow Indicator */}
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                showChartPanel ? 'rotate-0' : 'rotate-180'
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
        
        {/* Chart Panel */}
        {showChartPanel && (
          <ResizablePanel
            initialWidth={typeof window !== 'undefined' ? window.innerWidth * 0.4 : 600}
            minWidth={300}
            maxWidth={typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800}
            className="h-screen bg-black/80 border-l border-gray-800/50"
          >
            <div className="h-full p-4 overflow-y-auto">
              <DefaultChartsPanel 
                selectedGu={selectedGu}
                selectedGuCode={selectedGuCode}
                selectedDong={selectedDong}
                selectedDongCode={selectedDongCode}
                selectedBusinessType={selectedBusinessType}
              />
            </div>
          </ResizablePanel>
        )}
      </div>
    </div>
  )
}

"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { throttle, debounce } from 'lodash-es'
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { FlyToInterpolator, LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core'
import UnifiedControls from "./SalesDataControls"
import DualLayerControls from "./DualLayerControls"
import { formatTooltip, formatScatterplotTooltip } from "./LayerManager"
import { usePreGeneratedSeoulMeshLayer, usePredictionMeshLayer } from "./SeoulMeshLayer"
import { useLayerState } from "../hooks/useCardSalesData"
import { formatKoreanCurrency } from '@/src/shared/utils/salesFormatter'
import { getDistrictCode as getDistrictCodeFromMapping, getDongCode as getDongCodeFromMapping } from "../data/districtCodeMappings"
import { createDistrictLabelsTextLayer, createDongLabelsTextLayer } from "./DistrictLabelsTextLayer"
import { MAPBOX_TOKEN } from "@/src/shared/constants/mapConfig"
import { useDistrictSelection } from "@/src/shared/hooks/useDistrictSelection"
import { loadDistrictData, getCurrentTheme, getCurrentThemeKey } from "@/src/shared/utils/districtUtils"
import { getDistrictCenter } from "../data/districtCenters"
import { DEFAULT_SEOUL_VIEW } from "@/src/shared/utils/district3DUtils"
import { getModernDistrictColor, getModernEdgeColor, getModernMaterial, getDimmedColor, getSimpleSalesColor, applyColorAdjustments } from "../utils/modernColorPalette"
import * as turf from '@turf/turf'
import { useUnifiedDeckGLLayers } from "./DeckGLUnifiedLayers"
import { InlineMeshMonthToggle } from "./MeshMonthToggle"
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


export default function CardSalesDistrictMap() {
  const mapRef = useRef<MapRef>(null)
  const mapRefRight = useRef<MapRef>(null)  // Second map ref for AI prediction map
  const cleanupRef = useRef<(() => void)[]>([])
  const [currentThemeState, setCurrentThemeState] = useState(getCurrentTheme)
  const [currentThemeKey, setCurrentThemeKey] = useState('blue') // Default to blue theme for districts
  const [themeAdjustments, setThemeAdjustments] = useState({ opacity: 100, brightness: 0, saturation: 0, contrast: 0 })

  // AI Prediction Mode State
  const [isAIPredictionMode, setIsAIPredictionMode] = useState(false)
  const [predictionDate, setPredictionDate] = useState('20240701') // Default July 1, 2024
  const [temperatureScenario, setTemperatureScenario] = useState('t001') // Default T+0.1°C

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
  
  

  // 서울 좌표
  const SEOUL_COORDINATES: [number, number] = [126.978, 37.5665]

  // Shared throttled handler for viewport changes - used by both maps
  // This MUST be defined at the top level to follow React's Rules of Hooks
  const handleViewStateChange = useMemo(() =>
    throttle(({ viewState: newViewState }) => {
      setViewState(newViewState as MapViewState)
    }, 16), // 60fps
  [setViewState])

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

  // Separate animation states for actual and prediction layers
  // Actual data animation
  const [isActualAnimating, setIsActualAnimating] = useState(false)
  const [actualAnimationType, setActualAnimationType] = useState<'7days' | '31days' | null>(null)
  const [actualAnimationDay, setActualAnimationDay] = useState(1)
  const [actualDate, setActualDate] = useState('20240701') // Actual data date
  const actualAnimationRef = useRef<NodeJS.Timeout | null>(null)

  // Prediction data animation
  const [isPredictionAnimating, setIsPredictionAnimating] = useState(false)
  const [predictionAnimationType, setPredictionAnimationType] = useState<'7days' | '31days' | null>(null)
  const [predictionAnimationDay, setPredictionAnimationDay] = useState(1)
  const predictionAnimationRef = useRef<NodeJS.Timeout | null>(null)

  // REMOVED: 3D polygon data states - 3D polygon layers not used
  
  // 동별 매출 데이터 Map (dongCode -> totalSales)
  const [dongSalesMap, setDongSalesMap] = useState<Map<number, number>>(new Map())
  // 동별 업종별 매출 데이터 Map (dongCode -> (businessType -> sales))
  const [dongSalesByTypeMap, setDongSalesByTypeMap] = useState<Map<number, Map<string, number>>>(new Map())
  
  // 높이 스케일 조정값 (기본값: 1억원 = 1 단위)
  const [heightScale, setHeightScale] = useState<number>(1000000000) // 10억원(1B) 단위로 증가 (높이 감소)
  
  
  // Mesh layer is always on
  const showMeshLayer = true
  
  // Layer configuration
  const handlePolygonLayerToggle = useCallback((visible: boolean) => {
    setVisible(visible)
    // Mesh layer always stays on
  }, [setVisible])
  
  // Mesh layer is always on, no toggle needed
  // Wireframe always true - removed state
  const [meshResolution, setMeshResolution] = useState<number>(120)  // Ultra high resolution 120x120 grid for detailed visualization
  // Separate color states for actual and prediction layers
  const [actualMeshColor, setActualMeshColor] = useState<string>('#FFFFFF')  // Actual data mesh color
  const [predictionMeshColor, setPredictionMeshColor] = useState<string>('#FFD700')  // Prediction mesh color (yellow)
  const [useActualTemperatureColor, setUseActualTemperatureColor] = useState<boolean>(false)  // Temperature color for actual
  const [usePredictionTemperatureColor, setUsePredictionTemperatureColor] = useState<boolean>(false)  // Temperature color for prediction
  const [timelineMode, setTimelineMode] = useState<'monthly'|'daily'>('daily')
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

  // Full year temperature data (365 days)
  const [yearTempData, setYearTempData] = useState<Array<{date: string, temp: number | null}>>([])
  const [isLoadingYearData, setIsLoadingYearData] = useState(true)

  // AI Prediction Toggle Handler (defined after state declarations to avoid initialization errors)
  const handleAIPredictionToggle = useCallback(() => {
    setIsAIPredictionMode(prev => {
      const newValue = !prev
      if (newValue) {
        // AI 모드 진입 시 7월 1일로 초기화
        setPredictionDate('20240701')
        setSelectedMeshMonth(7)
        setTimelineMode('daily')

        // 7월 1일 인덱스 찾기 (availableDailyDates가 로드된 경우)
        if (availableDailyDates.length > 0) {
          const july1Index = availableDailyDates.findIndex(d => d === '20240701' || d.includes('0701'))
          if (july1Index !== -1) {
            setSelectedDailyIndex(july1Index)
          }
        }

        // AI 모드 진입 시 한 단계 줌아웃
        setViewState(prev => ({
          ...prev,
          zoom: Math.max(prev.zoom - 0.3, 8), // 0.3 단계 줌아웃, 최소 줌 레벨 8
          transitionInterpolator: new FlyToInterpolator({ speed: 1.5 }),
          transitionDuration: 800
        } as MapViewState))
      }
      return newValue
    })
  }, [availableDailyDates])

  // Manual date change handler - syncs both left and right layers
  const handlePredictionDateChange = useCallback((dateStr: string) => {
    // Update right layer (prediction)
    setPredictionDate(dateStr)

    // Sync left layer (actual data) to the same date
    const day = parseInt(dateStr.slice(-2))
    setSelectedMeshMonth(7) // July
    setTimelineMode('daily') // Switch to daily mode for precise sync

    // Find and set the corresponding daily index
    if (availableDailyDates.length > 0) {
      const dayIndex = availableDailyDates.findIndex(d =>
        d === dateStr || d.includes(`07${day.toString().padStart(2, '0')}`)
      )
      if (dayIndex !== -1) {
        setSelectedDailyIndex(dayIndex)
      }
    }
  }, [availableDailyDates])

  // Load full year temperature data on mount
  useEffect(() => {
    const loadYearData = async () => {
      setIsLoadingYearData(true)
      const allData: Array<{date: string, temp: number | null}> = []

      // Load all 12 months
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0')
        try {
          const res = await fetch(`/data/local_economy/monthly/2024-${monthStr}.json`)
          if (res.ok) {
            const monthData = await res.json()

            // Group by date and calculate daily average
            const dailyTemps: Record<string, {sum: number, count: number}> = {}

            for (const item of monthData) {
              const date = item['기준일자']
              const temp = item['일평균기온']

              if (date && typeof temp === 'number' && !isNaN(temp)) {
                if (!dailyTemps[date]) {
                  dailyTemps[date] = { sum: 0, count: 0 }
                }
                dailyTemps[date].sum += temp
                dailyTemps[date].count++
              }
            }

            // Convert to array format
            Object.entries(dailyTemps).forEach(([date, data]) => {
              allData.push({
                date,
                temp: data.count > 0 ? data.sum / data.count : null
              })
            })
          }
        } catch (e) {
          // Failed to load month data
        }
      }

      // Sort by date
      allData.sort((a, b) => a.date.localeCompare(b.date))
      setYearTempData(allData)
      setIsLoadingYearData(false)
    }

    loadYearData()
  }, [])

  // Create year temperature graph path
  const yearTempGraphPath = useMemo(() => {
    if (yearTempData.length < 2) return ''

    const width = 200
    const height = 40
    const padding = 2
    const min = -15
    const max = 35

    const xStep = (width - padding * 2) / Math.max(1, yearTempData.length - 1)

    const points = yearTempData.map((d, i) => {
      const x = padding + i * xStep
      const y = d.temp !== null
        ? height - padding - ((d.temp - min) / (max - min)) * (height - padding * 2)
        : height / 2
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }, [yearTempData])

  // Find current date position in year data
  const currentDateIndex = useMemo(() => {
    if (!overlayDateLabel || yearTempData.length === 0) return -1
    return yearTempData.findIndex(d => d.date === overlayDateLabel)
  }, [overlayDateLabel, yearTempData])

  // Get color for temperature (5-degree intervals)
  const getTemperatureColor = (temp: number | null) => {
    if (temp === null) return '#9ca3af' // gray
    if (temp <= 0) return '#60a5fa' // blue - Freezing
    if (temp <= 5) return '#38bdf8' // light blue - Very Cold
    if (temp <= 10) return '#22d3ee' // cyan - Cold
    if (temp <= 15) return '#34d399' // green - Cool
    if (temp <= 20) return '#facc15' // yellow - Mild
    if (temp <= 25) return '#f59e0b' // orange - Warm
    if (temp <= 30) return '#ef4444' // red - Hot
    return '#dc2626' // dark red - Very Hot
  }

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
      // Monthly avg temp load failed
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
      // Daily avg temp load failed
      setOverlayAvgTemp(null)
    } finally {
      setOverlayLoading(false)
    }
  }, [])


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
          setSelectedDailyIndex(prev => {
            const nextIndex = (prev + 1) % availableDailyDates.length
            // Sync dates in AI mode during autoplay
            if (isAIPredictionMode && availableDailyDates[nextIndex]) {
              const dateStr = availableDailyDates[nextIndex]
              setPredictionDate(dateStr)
              setActualDate(dateStr)
            }
            return nextIndex
          })
        })
      }, 0)
    } else {
      const restDelay = Math.max(16, budget) // at least one frame of breathing room
      dailyTimeoutRef.current = setTimeout(() => {
        setSelectedDailyIndex(prev => {
          const nextIndex = (prev + 1) % availableDailyDates.length
          // Sync dates in AI mode during autoplay
          if (isAIPredictionMode && availableDailyDates[nextIndex]) {
            const dateStr = availableDailyDates[nextIndex]
            setPredictionDate(dateStr)
            setActualDate(dateStr)
          }
          return nextIndex
        })
      }, restDelay)
    }
  }, [timelineMode, dailyAutoPlay, availableDailyDates, dailyPlaySpeed, transitionMs, clearDailyTimer, isAIPredictionMode])

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

  // Daily playback control handlers
  const handleDailyPlayPause = useCallback(() => {
    setDailyAutoPlay(prev => !prev)
  }, [])

  const handleDailyIndexChange = useCallback((index: number) => {
    if (index >= 0 && index < availableDailyDates.length) {
      setSelectedDailyIndex(index)

      // Sync with AI prediction when in AI mode
      if (isAIPredictionMode && availableDailyDates[index]) {
        const dateStr = availableDailyDates[index]
        setPredictionDate(dateStr)
        setActualDate(dateStr)
      }
    }
  }, [availableDailyDates, isAIPredictionMode])

  const handleDailySkipToStart = useCallback(() => {
    setSelectedDailyIndex(0)

    // Sync with AI prediction when in AI mode
    if (isAIPredictionMode && availableDailyDates.length > 0) {
      const dateStr = availableDailyDates[0]
      setPredictionDate(dateStr)
      setActualDate(dateStr)
    }
  }, [isAIPredictionMode, availableDailyDates])

  const handleDailySkipToEnd = useCallback(() => {
    if (availableDailyDates.length > 0) {
      const lastIndex = availableDailyDates.length - 1
      setSelectedDailyIndex(lastIndex)

      // Sync with AI prediction when in AI mode
      if (isAIPredictionMode) {
        const dateStr = availableDailyDates[lastIndex]
        setPredictionDate(dateStr)
        setActualDate(dateStr)
      }
    }
  }, [availableDailyDates, isAIPredictionMode])

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
  
  // Separate dynamic colors for actual and prediction mesh layers
  const dynamicActualMeshColor = useMemo(() => {
    // Use temperature-based color only if toggle is enabled
    if (useActualTemperatureColor && overlayAvgTemp !== null) {
      return getTemperatureMeshHexColor(overlayAvgTemp)
    }
    // Otherwise use user-selected color
    return actualMeshColor
  }, [useActualTemperatureColor, overlayAvgTemp, actualMeshColor])

  const dynamicPredictionMeshColor = useMemo(() => {
    // Use temperature-based color only if toggle is enabled
    if (usePredictionTemperatureColor && overlayAvgTemp !== null) {
      return getTemperatureMeshHexColor(overlayAvgTemp)
    }
    // Otherwise use user-selected color
    return predictionMeshColor
  }, [usePredictionTemperatureColor, overlayAvgTemp, predictionMeshColor])

  const { layer: preGeneratedMeshLayer, isLoading: isMeshLoading } = usePreGeneratedSeoulMeshLayer({
    resolution: meshResolution,
    visible: showMeshLayer,
    wireframe: true,  // Always wireframe
    opacity: 1,  // Wireframe opacity
    animatedOpacity: 0.8,  // Fixed opacity
    month: timelineMode === 'monthly' ? (selectedMeshMonth < 10 ? `20240${selectedMeshMonth}` : `2024${selectedMeshMonth}`) : undefined,
    date: isAIPredictionMode ? actualDate : (timelineMode === 'daily' ? availableDailyDates[selectedDailyIndex] : undefined),
    pickable: false,  // Disabled to prevent tooltips and highlighting
    useMask: true,  // Enable masking to clip wireframe at Seoul boundaries
    color: dynamicActualMeshColor,  // Temperature-based sleek color for actual data
    transitionMs: transitionMs,
    // REMOVED: dongBoundaries parameter - no 3D polygon data needed
    dongSalesMap: dongSalesMap,  // Pass sales data map
    salesHeightScale: heightScale  // Use the same height scale as polygon layer
    // onHover and onClick removed - mesh layer is purely visual
  }, undefined)  // REMOVED: dongData3D dependency

  // AI Prediction Mesh Layer
  const { layer: predictionMeshLayer, isLoading: isPredictionLoading } = usePredictionMeshLayer({
    predictionDate,
    temperatureScenario,
    visible: isAIPredictionMode,
    wireframe: true,
    opacity: 1,
    color: dynamicPredictionMeshColor, // Separate color for prediction layer
    salesHeightScale: heightScale,
    transitionMs: transitionMs,  // Add transition duration for smooth animations
    pickable: false  // Disabled to prevent tooltips and highlighting - mesh layer is purely visual
    // No onHover handler needed
  })
  
  
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
  
  // Separate animation control functions for actual and prediction layers
  const startActualAnimation = useCallback((type: '7days' | '31days') => {
    setIsActualAnimating(true)
    setActualAnimationType(type)
    setActualAnimationDay(1)

    const maxDays = type === '7days' ? 7 : 31
    let currentDay = 1

    const animate = () => {
      // Update actual data date
      const dayStr = currentDay.toString().padStart(2, '0')
      const dateStr = `202407${dayStr}`
      setActualAnimationDay(currentDay)
      setActualDate(dateStr)  // Update the actual date for mesh layer

      // Update actual data layer to the corresponding date
      if (availableDailyDates.length > 0) {
        const dayIndex = availableDailyDates.findIndex(d => d === dateStr || d.includes(`07${dayStr}`))
        if (dayIndex !== -1) {
          setSelectedDailyIndex(dayIndex)
        }
      }
      // Also update month for monthly mode fallback
      setSelectedMeshMonth(7)

      // Move to next frame
      currentDay++
      if (currentDay > maxDays) {
        // Animation complete - stop instead of looping
        if (actualAnimationRef.current) {
          clearTimeout(actualAnimationRef.current)
          actualAnimationRef.current = null
        }
        setIsActualAnimating(false)
        setActualAnimationType(null)
        setActualAnimationDay(1)
        return
      }

      // Continue animation
      actualAnimationRef.current = setTimeout(animate, 500) // 500ms per frame
    }

    animate()
  }, [availableDailyDates, setSelectedDailyIndex, setSelectedMeshMonth])

  const startPredictionAnimation = useCallback((type: '7days' | '31days') => {
    setIsPredictionAnimating(true)
    setPredictionAnimationType(type)
    setPredictionAnimationDay(1)

    const maxDays = type === '7days' ? 7 : 31
    let currentDay = 1

    const animate = () => {
      // Update prediction date
      const dayStr = currentDay.toString().padStart(2, '0')
      const dateStr = `202407${dayStr}`
      setPredictionDate(dateStr)
      // Keep the current temperature scenario - don't change it
      setPredictionAnimationDay(currentDay)

      // Move to next frame
      currentDay++
      if (currentDay > maxDays) {
        // Animation complete - stop instead of looping
        if (predictionAnimationRef.current) {
          clearTimeout(predictionAnimationRef.current)
          predictionAnimationRef.current = null
        }
        setIsPredictionAnimating(false)
        setPredictionAnimationType(null)
        setPredictionAnimationDay(1)
        return
      }

      // Continue animation
      predictionAnimationRef.current = setTimeout(animate, 500) // 500ms per frame
    }

    animate()
  }, [setPredictionDate])

  const stopActualAnimation = useCallback(() => {
    if (actualAnimationRef.current) {
      clearTimeout(actualAnimationRef.current)
      actualAnimationRef.current = null
    }
    setIsActualAnimating(false)
    setActualAnimationType(null)
    setActualAnimationDay(1)
  }, [])

  const stopPredictionAnimation = useCallback(() => {
    if (predictionAnimationRef.current) {
      clearTimeout(predictionAnimationRef.current)
      predictionAnimationRef.current = null
    }
    setIsPredictionAnimating(false)
    setPredictionAnimationType(null)
    setPredictionAnimationDay(1)
  }, [])

  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      if (actualAnimationRef.current) {
        clearTimeout(actualAnimationRef.current)
      }
      if (predictionAnimationRef.current) {
        clearTimeout(predictionAnimationRef.current)
      }
    }
  }, [])

  // 기존 HexagonLayer 코드 (주석 처리)
  // 툴팁 핸들러 (Context7 권장 패턴)
  const getTooltip = (info: PickingInfo) => {
    if (!info.object) {
      return null
    }
    
    try {
      // 디버깅: 실제 레이어 ID 확인
      // Debug: Layer tooltip info
      
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
        
        // 날짜 정보
        const date = timelineMode === 'monthly'
          ? (selectedMeshMonth < 10 ? `20240${selectedMeshMonth}` : `2024${selectedMeshMonth}`)
          : (timelineMode === 'daily' ? availableDailyDates[selectedDailyIndex] : '202401')
        
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
      // Using fallback tooltip logic
      
      // dongSalesMap에서 데이터가 있으면 기본 툴팁 생성
      if (dongSalesMap.size > 0 && info.object.coordinates) {
        // 좌표 기반으로 가장 가까운 동 찾기 (임시 해결책)
        const position = info.object.coordinates || info.object.position
        if (position) {
          const tooltipHtml = `
📍 위치: ${position[1].toFixed(4)}, ${position[0].toFixed(4)}
💰 데이터: ${dongSalesMap.size}개 동 로딩됨
📅 날짜: ${timelineMode === 'monthly'
  ? (selectedMeshMonth < 10 ? `2024년 ${selectedMeshMonth}월` : `2024년 ${selectedMeshMonth}월`)
  : (timelineMode === 'daily' ? availableDailyDates[selectedDailyIndex] : '정보 없음')}
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

      {/* Split View Container - Shows two maps when AI Prediction mode is active */}
      <div className={`relative flex w-full h-full ${isAIPredictionMode ? 'gap-1' : ''}`}>
        {/* Left Map (Current Sales) */}
        <div className={`relative transition-all duration-500 ${isAIPredictionMode ? 'w-1/2' : 'w-full'}`}>
          {/* Label for actual values - centered */}
          {isAIPredictionMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-blue-600/80 to-cyan-600/80 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-blue-500/30 shadow-lg text-center">
              <div className="text-white text-sm font-bold tracking-wide">실제 값</div>
              <div className="text-[10px] text-blue-200 mt-0.5">2024년 실측 데이터</div>
            </div>
          )}

          {/* DeckGL + Mapbox 통합 (Official deck.gl pattern) */}
          <DeckGL
        viewState={viewState}
        controller={{
          scrollZoom: {
            speed: 0.005,  // 기본값(0.01)의 절반 - 더 세밀한 줌 컨트롤
            smooth: true    // 부드러운 줌 전환 효과
          },
          // 다른 controller 옵션은 기본값 유지
          dragPan: true,
          dragRotate: true,
          doubleClickZoom: true,
          touchZoom: true,
          touchRotate: true,
          keyboard: true
        }}
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
        onViewStateChange={handleViewStateChange}
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
        </div>

        {/* Right Map (AI Prediction) - Only shown when AI mode is active */}
        {isAIPredictionMode && (
          <div className="relative w-1/2 transition-all duration-500">
            {/* Label for AI prediction map - centered */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-purple-500/30 shadow-lg text-center">
              <div className="text-white text-sm font-bold tracking-wide">AI 예측 값</div>
              <div className="text-[10px] text-purple-200 mt-0.5">온도 변화 시뮬레이션</div>
            </div>

            {/* Temperature Scenario Indicator - centered in right layer */}
            <div className="absolute left-1/2 transform -translate-x-1/2 z-20" style={{ top: '90px' }}>
              <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 p-[2px] rounded-xl shadow-2xl animate-pulse">
                <div className="bg-black/90 backdrop-blur-md rounded-xl px-4 py-1">
                  <div className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent text-center">
                    {temperatureScenario === 't001' && '+0.1°C'}
                    {temperatureScenario === 't005' && '+0.5°C'}
                    {temperatureScenario === 't010' && '+1.0°C'}
                    {temperatureScenario === 't050' && '+5°C'}
                    {temperatureScenario === 't100' && '+10°C'}
                    {temperatureScenario === 't150' && '+15°C'}
                    {temperatureScenario === 't200' && '+20°C'}
                  </div>
                </div>
              </div>
            </div>

            {/* Second DeckGL instance for AI predictions */}
            <DeckGL
              viewState={viewState}
              controller={{
                scrollZoom: {
                  speed: 0.005,
                  smooth: true
                },
                dragPan: true,
                dragRotate: true,
                doubleClickZoom: true,
                touchZoom: true,
                touchRotate: true,
                keyboard: true
              }}
              layers={predictionMeshLayer ? [predictionMeshLayer] : []} // AI prediction mesh layer
              effects={[lightingEffect]}
              getCursor={({isDragging: dragging, isHovering}) => {
                if (dragging) return 'grabbing'
                if (isHovering) return 'pointer'
                return 'grab'
              }}
              parameters={{
                blend: true,
                blendFunc: [770, 771, 1, 771],
                depthTest: true,
                depthFunc: 513,
              } as any}
              _typedArrayManagerProps={{
                overAlloc: 1.2,
                poolSize: 100
              }}
              onViewStateChange={handleViewStateChange}
            >
              <MapGL
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
                reuseMaps
                style={{ width: '100%', height: '100%' }}
              >
                {/* Semi-transparent overlay for very-dark mode */}
                {currentLayer === 'very-dark' && (
                  <div
                    className="absolute inset-0 bg-black/70 pointer-events-none"
                    style={{ mixBlendMode: 'multiply' }}
                  />
                )}
              </MapGL>
            </DeckGL>

            {/* Dual Layer Controls - Show instead of unified panel when AI prediction is active */}
            <DualLayerControls
              // Actual layer props
              isActualAnimating={isActualAnimating}
              actualAnimationType={actualAnimationType}
              actualAnimationDay={actualAnimationDay}
              onStartActualAnimation={startActualAnimation}
              onStopActualAnimation={stopActualAnimation}
              actualMeshColor={actualMeshColor}
              onActualMeshColorChange={setActualMeshColor}
              useActualTemperatureColor={useActualTemperatureColor}
              onUseActualTemperatureColorChange={setUseActualTemperatureColor}
              actualDate={actualDate}
              onActualDateChange={(date) => {
                setActualDate(date)
                // Also update prediction date to keep them in sync
                setPredictionDate(date)

                // Update daily index if in daily mode
                if (timelineMode === 'daily' && availableDailyDates.length > 0) {
                  const index = availableDailyDates.findIndex(d => d === date)
                  if (index !== -1) {
                    setSelectedDailyIndex(index)
                  }
                }
              }}

              // Prediction layer props
              isPredictionAnimating={isPredictionAnimating}
              predictionAnimationType={predictionAnimationType}
              predictionAnimationDay={predictionAnimationDay}
              onStartPredictionAnimation={startPredictionAnimation}
              onStopPredictionAnimation={stopPredictionAnimation}
              predictionMeshColor={predictionMeshColor}
              onPredictionMeshColorChange={setPredictionMeshColor}
              usePredictionTemperatureColor={usePredictionTemperatureColor}
              onUsePredictionTemperatureColorChange={setUsePredictionTemperatureColor}

              // Prediction-specific props
              predictionDate={predictionDate}
              onPredictionDateChange={(date) => {
                setPredictionDate(date)
                // Also update actual date to keep them in sync
                setActualDate(date)

                // Update daily index if in daily mode
                if (timelineMode === 'daily' && availableDailyDates.length > 0) {
                  const index = availableDailyDates.findIndex(d => d === date)
                  if (index !== -1) {
                    setSelectedDailyIndex(index)
                  }
                }
              }}
              temperatureScenario={temperatureScenario}
              onTemperatureScenarioChange={setTemperatureScenario}
            />

          </div>
        )}

        {/* Center Divider Line - Only shown in AI prediction mode */}
        {isAIPredictionMode && (
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 z-30 pointer-events-none bg-gray-400/70"></div>
        )}
      </div>

      {/* Left-top overlay: date + average temperature */}
      <div
        className="absolute z-10"
        style={{
          top: '86px',
          left: isAIPredictionMode ? '25%' : '50%',
          transform: 'translateX(-50%)',
          transition: 'left 0.3s ease-in-out'
        }}
      >
        <div
          className="backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-4 shadow-lg"
          style={{ margin: '5px' }}
        >
          {/* Date and Temperature */}
          <div className="flex items-center gap-3">
            <div className="text-white text-lg font-bold">
              {overlayDateLabel || '—'}
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: getTemperatureColor(overlayAvgTemp) }}
            >
              {overlayLoading ? '…' : (overlayAvgTemp !== null ? `${overlayAvgTemp.toFixed(1)}°C` : '—')}
            </div>
          </div>
        </div>
      </div>


      {/* 통합 컨트롤 패널 - Always show for AI button and basic controls */}
      <UnifiedControls
        // 높이 스케일 props
        heightScale={heightScale}
        onHeightScaleChange={setHeightScale}


        // Mesh layer props (always on, no toggle)
        // Wireframe always true - props removed
        // Mesh resolution fixed at 120 - props removed
        meshColor={actualMeshColor}
        onMeshColorChange={setActualMeshColor}
        useTemperatureColor={useActualTemperatureColor}
        onUseTemperatureColorChange={setUseActualTemperatureColor}
        timelineMode={timelineMode}
        onTimelineModeChange={setTimelineMode}
        selectedMeshMonth={selectedMeshMonth}
        onMeshMonthChange={setSelectedMeshMonth}
        // Daily playback props
        isDailyPlaybackActive={dailyAutoPlay}
        currentDayIndex={selectedDailyIndex}
        totalDays={availableDailyDates.length}
        currentDate={availableDailyDates[selectedDailyIndex] || ''}
        onPlayPause={handleDailyPlayPause}
        onDayChange={handleDailyIndexChange}
        onSkipToStart={handleDailySkipToStart}
        onSkipToEnd={handleDailySkipToEnd}
        // AI Prediction mode - only pass the state for conditional UI
        isAIPredictionMode={isAIPredictionMode}
      />

      {/* AI 예측 활성화 버튼 - 지도 초기화 버튼 위 */}
      <button
        onClick={handleAIPredictionToggle}
        className={`absolute z-30 transition-all duration-300 px-4 py-2 rounded-lg shadow-2xl backdrop-blur-md text-sm font-medium ${
          isAIPredictionMode
            ? 'bg-purple-900/50 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30'
            : 'bg-black/90 hover:bg-gray-900/90 text-gray-200 border border-gray-800/50'
        }`}
        style={{
          bottom: '70px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        <span className="flex items-center gap-2 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <span>AI 예측</span>
          {isAIPredictionMode && <span className="text-xs opacity-75">(활성화)</span>}
        </span>
      </button>

      {/* 지도 초기화 버튼 */}
      <button
        onClick={handleFullReset}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[31] bg-black/90 hover:bg-gray-900/50 backdrop-blur-md text-gray-200 text-sm font-medium px-4 py-2 rounded-lg border border-gray-800/50 transition-all duration-200 shadow-2xl"
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
  )
}

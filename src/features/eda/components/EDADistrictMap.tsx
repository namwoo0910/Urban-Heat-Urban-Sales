/**
 * EDA District Map Component
 *
 * Main map visualization for exploratory data analysis of Seoul districts.
 * Enhanced with card sales filters and charts.
 */

"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { throttle } from 'lodash-es'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { FlyToInterpolator } from '@deck.gl/core'
import type { MapRef } from 'react-map-gl'
import { motion } from 'framer-motion'

// Components
import { MapContainer } from './MapContainer'
import LocalEconomyFilterPanel from '@/src/features/card-sales/components/LocalEconomyFilterPanel'
import type { FilterState } from '@/src/features/card-sales/components/LocalEconomyFilterPanel'

// Lazy load heavy components
const DefaultChartsPanel = lazy(() => import('@/src/features/card-sales/components/charts/DefaultChartsPanel'))
const ResizablePanel = lazy(() => import('@/src/shared/components/ResizablePanel'))

// Hooks
import { useDistrictData } from '../hooks/useDistrictData'

// Data and utilities
import { getDistrictCode, getDongCode } from '@/src/features/card-sales/data/districtCodeMappings'

// Constants
import { DEFAULT_SEOUL_VIEW } from '../constants/mapConfig'

// Layers
import { createDistrictBoundaryLayers } from './layers/DistrictBoundaryLayers'
import type { ThemeKey } from '../utils/edaColorPalette'

// Ambient effects
import { DEFAULT_AMBIENT_CONFIG } from '../utils/ambientEffects'

type RemoteSelect = { level: 'district' | 'neighborhood'; code: string; name?: string }

type Props = {
  role?: 'controller' | 'display'            // 기본 'display'
  interactive?: boolean                      // 컨트롤러에선 true, 디스플레이에선 false
  showChartPanel?: boolean                   // 컨트롤러 false, 디스플레이 true
  selected?: RemoteSelect | null             // (선택) 외부에서 하이라이트 주입
  onRegionClick?: (sel: RemoteSelect) => void// 컨트롤러에서 지역 클릭시 호출
}




export default function EDADistrictMap({
  role = 'display',
  interactive = false,
  showChartPanel: showChartPanelProp,
  selected = null,
  onRegionClick,
}: Props) {
  // Core refs
  const mapRef = useRef<MapRef>(null)

  // Track panel and window dimensions for dynamic centering
  const [chartPanelWidth, setChartPanelWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth * 0.4 : 600
  )
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1920
  )

  // Calculate adjusted map center based on available space
  const calculateAdjustedCenter = useCallback((showPanel: boolean) => {
    if (!showPanel) {
      // If no chart panel, use default center
      return DEFAULT_SEOUL_VIEW.longitude
    }

    // Calculate the center of the available map area
    const mapAreaWidth = windowWidth - chartPanelWidth
    const mapCenterX = mapAreaWidth / 2

    // Move Seoul away from the chart panel for better spacing
    const pixelOffset = chartPanelWidth * 0.25  // 25% of chart width for spacing

    // Convert pixel offset to longitude degrees at zoom level
    const zoom = DEFAULT_SEOUL_VIEW.zoom || 10.5
    const degreesPerPixel = 360 / (256 * Math.pow(2, zoom))
    const longitudeOffset = pixelOffset * degreesPerPixel

    // Add to move right (toward the chart side for better balance)
    return 126.9780 + longitudeOffset
  }, [chartPanelWidth, windowWidth])

  // UI state - moved up to use in initial calculation
  // 기존: const [showChartPanel, setShowChartPanel] = useState(true)
  const [showChartPanel, setShowChartPanel] = useState<boolean>(true)
  const computedShowChartPanel = showChartPanelProp ?? showChartPanel


  // View state with dynamic center
  const [viewState, setViewState] = useState<MapViewState>({
    ...DEFAULT_SEOUL_VIEW,
    longitude: calculateAdjustedCenter(true) // Pass initial showChartPanel value
  })
  const [isDragging, setIsDragging] = useState(false)

  // Selection state
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedGuCode, setSelectedGuCode] = useState<number | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [selectedDongCode, setSelectedDongCode] = useState<number | null>(null)
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null)
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)

  // Theme & interaction state
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('pastelGray')
  const useUniqueColors = currentTheme === 'modern' // Only use unique colors for modern theme

  // Derive selection mode from current selection state
  const selectionMode = useMemo(() => {
    // When a gu is selected, enable dong mode for hover/click interactions
    return selectedGu ? 'dong' : 'gu'
  }, [selectedGu])

  // Ambient effects configuration
  const [enableAmbientEffects, setEnableAmbientEffects] = useState(true)

  // Simplified ambient config without animations to prevent loops
  const ambientConfig = useMemo(() => ({
    ...DEFAULT_AMBIENT_CONFIG,
    intensity: 1.0, // Fixed intensity
    glowRadius: 25, // Fixed radius
    enableAnimation: false // Disable animations to prevent loops
  }), [])

  // Animation temporarily disabled to fix infinite loop
  // TODO: Re-implement with CSS animations or deck.gl transitions
  const animationState = {
    timestamp: 0,
    breathingOpacity: 1.0,
    expansionRadius: 25,
    shimmerColor: null,
    isAnimating: false
  }

  // UI state - Gu boundaries always shown for colors, dong boundaries when a gu is selected
  const showGuBoundaries = true  // Always show gu boundaries for consistent colors
  const showDongBoundaries = selectedGu !== null  // Show dong boundaries when a gu is selected
  const showLabels = true
  // showChartPanel is already defined above

  // Load district data
  const { guData, dongData, isLoading, error } = useDistrictData()

  // Initial state is correctly set with selectedGu as null

  // Helper functions
  const getDistrictName = useCallback((properties: any): string | null => {
    return properties?.ADM_DR_NM ||
           properties?.dongName ||
           properties?.dong_name ||
           properties?.DONG_NM ||
           properties?.H_DONG_NM ||
           properties?.['행정동'] ||
           null
  }, [])

  const getGuName = useCallback((properties: any): string | null => {
    return properties?.guName ||
           properties?.SGG_NM ||
           properties?.SIG_KOR_NM ||
           properties?.SIGUNGU_NM ||
           properties?.['자치구'] ||
           null
  }, [])

  // Handle hover
  const handleHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      const properties = info.object.properties || info.object
      if (selectionMode === 'gu') {
        const guName = getGuName(properties)
        setHoveredDistrict(guName)
      } else {
        const districtName = getDistrictName(properties)
        setHoveredDistrict(districtName)
      }
    } else {
      setHoveredDistrict(null)
    }
  }, [getDistrictName, getGuName, selectionMode])

  // Utility function to get bounds from geometry
  const getBounds = useCallback((geometry: any) => {
    if (!geometry || !geometry.coordinates) return null

    let minLng = Infinity, minLat = Infinity
    let maxLng = -Infinity, maxLat = -Infinity

    const processCoords = (coords: any): void => {
      if (Array.isArray(coords[0])) {
        coords.forEach(processCoords)
      } else {
        const [lng, lat] = coords
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
    }

    processCoords(geometry.coordinates)

    return {
      minLng,
      minLat,
      maxLng,
      maxLat,
      center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
    }
  }, [])

  // Handle filter changes from LocalEconomyFilterPanel
  const handleFilterChange = useCallback((filters: FilterState) => {
    setSelectedGu(filters.selectedGu)
    setSelectedGuCode(filters.selectedGuCode)
    setSelectedDong(filters.selectedDong)
    setSelectedDongCode(filters.selectedDongCode)
    setSelectedBusinessType(filters.selectedBusinessType)
  }, [])

  // 컨트롤러에서 보낸 선택(viz:eda:select) 수신 → 내부 필터/하이라이트 갱신
  useEffect(() => {
    const onSel = (e: Event) => {
      const d = (e as CustomEvent<{ level:'district'|'neighborhood'; code:string; name?:string }>).detail
      if (!d) return

      if (d.level === 'district') {
        handleFilterChange({
          selectedGu: d.name ?? null,
          selectedGuCode: d.code ? Number(d.code) : (d.name ? getDistrictCode(d.name) : null),
          selectedDong: null,
          selectedDongCode: null,
          selectedBusinessType: selectedBusinessType,
        })
      } else {
        // dong 선택: gu가 함께 넘어오면 매핑 정확도↑ (name 없으면 code 기준으로만 처리)
        handleFilterChange({
          selectedGu: selectedGu,
          selectedGuCode: selectedGuCode,
          selectedDong: d.name ?? null,
          selectedDongCode: d.code ? Number(d.code) : (selectedGu && d.name ? getDongCode(selectedGu, d.name) : null),
          selectedBusinessType: selectedBusinessType,
        })
      }
    }

    window.addEventListener('viz:eda:select', onSel as EventListener)
    return () => window.removeEventListener('viz:eda:select', onSel as EventListener)
  }, [handleFilterChange, selectedGu, selectedGuCode, selectedBusinessType])



  // Apply preset filters
  const applyPresetFilter = useCallback((preset: 'vulnerable' | 'culture') => {
    if (preset === 'vulnerable') {
      // 폭염/한파에 취약한 전통상권: 종로구 창신1동 음/식료품
      handleFilterChange({
        selectedGu: '종로구',
        selectedGuCode: getDistrictCode('종로구') || null,
        selectedDong: '창신1동',
        selectedDongCode: getDongCode('종로구', '창신1동') || null,
        selectedBusinessType: '음/식료품'
      })
    } else {
      // 폭염 속에서 찾는 예술 문화: 지역 전체, 오락/공연/서점
      handleFilterChange({
        selectedGu: null,
        selectedGuCode: null,
        selectedDong: null,
        selectedDongCode: null,
        selectedBusinessType: '오락/공연/서점'
      })
    }
  }, [handleFilterChange])

  // Handle click with district code mapping - unified with filter logic
  const handleClick = useCallback((info: PickingInfo) => {
    if (info.object) {
      const properties = info.object.properties || info.object
      const guName = getGuName(properties)
      const dongName = getDistrictName(properties)

      // Build FilterState object to pass to handleFilterChange
      const filterState: FilterState = {
        selectedGu: null,
        selectedGuCode: null,
        selectedDong: null,
        selectedDongCode: null,
        selectedBusinessType: selectedBusinessType  // Preserve current business type
      }

      if (selectionMode === 'gu') {
        // In gu mode, only select gu and clear dong
        if (guName) {
          filterState.selectedGu = guName
          filterState.selectedGuCode = getDistrictCode(guName) || null
        }
      } else {
        // In dong mode, select both gu and dong if available
        if (dongName && guName) {
          filterState.selectedGu = guName
          filterState.selectedGuCode = getDistrictCode(guName) || null
          filterState.selectedDong = dongName
          filterState.selectedDongCode = getDongCode(guName, dongName) || null
        } else if (guName) {
          // If only gu is available (clicked on gu boundary), select just gu
          filterState.selectedGu = guName
          filterState.selectedGuCode = getDistrictCode(guName) || null
        }
      }

      // Use the same filter change handler as the filter panel
      handleFilterChange(filterState)
      if (onRegionClick) {
        const level = selectionMode === 'gu' ? 'district' : 'neighborhood'
        const code =
          level === 'district'
            ? String(filterState.selectedGuCode ?? '')
            : String(filterState.selectedDongCode ?? '')
        const name =
          level === 'district'
            ? filterState.selectedGu ?? undefined
            : filterState.selectedDong ?? undefined

        if (code) onRegionClick({ level, code, name })
      }


    }
  }, [getGuName, getDistrictName, selectionMode, selectedBusinessType, handleFilterChange])

  // Handle theme change
  const [customThemeColor, setCustomThemeColor] = useState<string>('#2980B9')
  const [saturationScale, setSaturationScale] = useState<number>(1.0)
  const handleThemeChange = useCallback((theme: string, customColor?: string, saturationScale?: number) => {
    if (customColor) {
      setCustomThemeColor(customColor)
    }
    if (saturationScale !== undefined) {
      setSaturationScale(saturationScale)
    }
    setCurrentTheme(theme as ThemeKey)
  }, [])


  // Handle chart panel resize
  const handleChartPanelResize = useCallback((newWidth: number) => {
    setChartPanelWidth(newWidth)
  }, [])

  // Zoom to selected district when selectedGu changes
  useEffect(() => {
    if (selectedGu && guData) {
      // Find the selected district feature
      const selectedFeature = guData.features.find((feature: any) => {
        const name = getGuName(feature.properties)
        return name === selectedGu
      })

      if (selectedFeature) {
        const bounds = getBounds(selectedFeature.geometry)
        if (bounds) {
          // Calculate appropriate zoom level based on district size
          const latDiff = bounds.maxLat - bounds.minLat
          const lngDiff = bounds.maxLng - bounds.minLng
          const maxDiff = Math.max(latDiff, lngDiff)

          // Adjust zoom based on district size (Seoul districts vary in size)
          let zoom = 12.5
          if (maxDiff > 0.15) zoom = 11.5
          else if (maxDiff > 0.1) zoom = 12
          else if (maxDiff < 0.05) zoom = 13

          setViewState(prev => ({
            ...prev,
            longitude: bounds.center[0],
            latitude: bounds.center[1],
            zoom: zoom,
            pitch: 0,
            bearing: 0,
            transitionDuration: 1000,
            transitionInterpolator: new FlyToInterpolator()
          }))
        }
      }
    } else if (!selectedGu) {
      // Reset to Seoul overview when no district is selected
      const adjustedLongitude = calculateAdjustedCenter(computedShowChartPanel)
      setViewState(prev => ({
        ...DEFAULT_SEOUL_VIEW,
        longitude: adjustedLongitude,
        transitionDuration: 800,
        transitionInterpolator: new FlyToInterpolator()
      }))
    }
  }, [selectedGu, guData, getGuName, getBounds, calculateAdjustedCenter, computedShowChartPanel])

  // Update map center when panel width or window size changes
  useEffect(() => {
    // Only adjust center if no district is selected (in overview mode)
    if (!selectedGu) {
      const newLongitude = calculateAdjustedCenter(computedShowChartPanel)
      setViewState(prev => ({
        ...prev,
        longitude: newLongitude
      }))
    }
  }, [calculateAdjustedCenter, computedShowChartPanel, selectedGu])

  // Handle window resize
  useEffect(() => {
    const handleWindowResize = () => {
      setWindowWidth(window.innerWidth)
      // Also update max chart panel width
      const newMaxWidth = window.innerWidth * 0.6
      if (chartPanelWidth > newMaxWidth) {
        setChartPanelWidth(newMaxWidth)
      }
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [chartPanelWidth])

  // Reset selection and view
  const handleReset = useCallback(() => {
    // Reset selections
    setSelectedGu(null)
    setSelectedGuCode(null)
    setSelectedDong(null)
    setSelectedDongCode(null)
    setSelectedBusinessType(null)

    // Reset view to initial state with calculated center
    const initialLongitude = calculateAdjustedCenter(computedShowChartPanel)

    // Smooth transition to initial view
    setViewState({
      ...DEFAULT_SEOUL_VIEW,
      longitude: initialLongitude,
      transitionDuration: 800,  // 800ms smooth transition
      transitionInterpolator: new FlyToInterpolator()
    })
  }, [calculateAdjustedCenter, computedShowChartPanel])

  // Create layers
  const layers = useMemo(() => {
    const allLayers = []

    // District boundary layers with sophisticated ambient effects
    const boundaryLayers = createDistrictBoundaryLayers({
      guData,
      dongData,
      showGuBoundaries,
      showDongBoundaries,
      showLabels,
      selectedGu,
      selectedGuCode,
      selectedDong,
      hoveredDistrict,
      viewState,
      onHover: handleHover,
      onClick: handleClick,
      theme: currentTheme,
      useUniqueColors,
      selectionMode,  // Use actual selection mode for proper interaction
      fillEnabled: true,
      ambientConfig,
      animationTimestamp: 0, // Use static value to prevent re-renders
      enableAmbientEffects,
      customThemeColor: currentTheme === 'custom' ? customThemeColor : undefined,
      isBoosted: saturationScale !== 1.0,
      saturationScale: saturationScale
    })

    allLayers.push(...boundaryLayers)

    return allLayers
  }, [
    guData,
    dongData,
    showGuBoundaries,
    showDongBoundaries,
    showLabels,
    selectedGu,
    selectedGuCode,
    selectedDong,
    hoveredDistrict,
    viewState,
    handleHover,
    handleClick,
    currentTheme,
    useUniqueColors,
    selectionMode,
    ambientConfig,
    // Remove animationState.timestamp to prevent continuous re-renders
    enableAmbientEffects,
    saturationScale
  ])

  // Handle view state changes
  const handleViewStateChange = useMemo(() =>
    throttle(({ viewState: newViewState }: { viewState: MapViewState }) => {
      setViewState(newViewState)
    }, 16), // 60fps
    []
  )

  // Handle drag events
  const handleDragStart = useCallback(() => setIsDragging(true), [])
  const handleDragEnd = useCallback(() => setIsDragging(false), [])

  // Tooltip
  const getTooltip = useCallback((info: PickingInfo) => {
    if (!info.object) return null

    const properties = info.object.properties || info.object
    if (selectionMode === 'gu') {
      const guName = getGuName(properties)
      if (!guName) return null
      return {
        text: guName,
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          color: '#333',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }
      }
    }

    const districtName = getDistrictName(properties)

    if (!districtName) return null

    return {
      text: districtName,
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        color: '#333',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }
    }
  }, [getDistrictName, getGuName, selectionMode])


  // Loading state
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-700">지도 데이터 로딩 중...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-red-600">데이터 로드 오류: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        viewState={viewState}
        layers={layers}
        onViewStateChange={handleViewStateChange}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onHover={handleHover}
        onClick={interactive ? handleClick : undefined} 
        getTooltip={getTooltip}
        mapRef={mapRef}
        isDragging={isDragging}
      />

      {/* Preset Filter Buttons */}
      <div className="fixed z-50 flex flex-col gap-2" style={{ top: '76px', left: '26px' }}>
        <motion.button
          onClick={() => applyPresetFilter('vulnerable')}
          className="group flex items-center gap-2 px-4 py-2.5 bg-gray-100 backdrop-blur-sm
                     rounded-lg shadow-lg hover:shadow-xl hover:scale-105 hover:bg-gray-200
                     transition-all duration-200"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-lg">🌡️</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900">
              폭염/한파에 취약한 전통상권
            </div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => applyPresetFilter('culture')}
          className="group flex items-center gap-2 px-4 py-2.5 bg-gray-100 backdrop-blur-sm
                     rounded-lg shadow-lg hover:shadow-xl hover:scale-105 hover:bg-gray-200
                     transition-all duration-200"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-lg">🎭</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900">
              폭염 속에서 찾는 예술 문화
            </div>
          </div>
        </motion.button>
      </div>

      {/* Filter panel */}
      <LocalEconomyFilterPanel
        onFilterChange={handleFilterChange}
        onThemeChange={handleThemeChange}
        currentTheme={currentTheme}
        externalSelectedGu={selectedGu}
        externalSelectedDong={selectedDong}
        externalSelectedBusinessType={selectedBusinessType}
        className="fixed bottom-4 left-4 z-50"
      />

      {/* Info Panel */}
      {(selectedGu || selectedDong) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 z-30">
          <div className="flex items-center gap-3">
            {selectedGu && (
              <div className="font-semibold text-gray-800">{selectedGu}</div>
            )}
            {selectedDong && (
              <div className="font-semibold text-gray-800">{selectedDong}</div>
            )}
            {selectedBusinessType && (
              <>
                <span className="text-gray-400">•</span>
                <div className="font-semibold text-gray-800">{selectedBusinessType}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Charts panel */}
      {computedShowChartPanel && (
        <div
          className="absolute top-16 right-0 bottom-0"
          style={{
            animation: 'slideInFromRight 0.5s ease-out'
          }}
        >
          <Suspense fallback={
            <div className="absolute bottom-4 right-4 bg-gray-100 p-4 rounded-lg shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-gray-700"></div>
                <span className="text-gray-700 text-sm">차트 로딩 중...</span>
              </div>
            </div>
          }>
            <ResizablePanel
              initialWidth={chartPanelWidth}
              minWidth={300}
              maxWidth={windowWidth * 0.6}
              onResize={handleChartPanelResize}
              className="h-full bg-transparent shadow-lg"
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
          </Suspense>
        </div>
      )}

      {/* Map Reset Button - Always visible */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-white/95 hover:bg-blue-50/95 text-slate-700 hover:text-blue-700 rounded-lg shadow-lg transition-all duration-200 backdrop-blur-sm border border-blue-100/50 hover:border-blue-200/70 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>지도 초기화</span>
        </button>
      </div>

      {/* CSS Animation Keyframes */}
      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

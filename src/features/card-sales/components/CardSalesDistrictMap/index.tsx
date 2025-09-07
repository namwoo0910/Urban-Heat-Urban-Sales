/**
 * CardSalesDistrictMap Component
 * 
 * Main orchestrator component for Seoul district sales visualization.
 * Optimized with component splitting and performance enhancements.
 */

"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { throttle } from 'lodash-es'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import type { MapRef } from 'react-map-gl'

// Split components
import { MapContainer } from './MapContainer'
import { InteractionHandler } from './InteractionHandler'
import { UIControls } from './UIControls'

// Hooks
import { useDataProcessor } from '@/src/features/card-sales/hooks/useDataProcessor'
import { useLayerState } from '@/src/features/card-sales/hooks/useCardSalesData'
import { usePreGeneratedSeoulMeshLayer } from '../SeoulMeshLayer'
import { useDistrictSelection } from '@/src/shared/hooks/useDistrictSelection'

// Utils
import { createDong3DPolygonLayers, createDong2DPolygonLayers } from '../../utils/createDeckLayers'
import { createUnifiedDeckGLLayers } from '../DeckGLUnifiedLayers'
import { createDistrictLabelsTextLayer, createDongLabelsTextLayer } from '../DistrictLabelsTextLayer'
import { getDistrictCode, getDongCode } from '../../data/districtCodeMappings'
import { getDistrictCenter } from '../../data/districtCenters'
import { getCurrentTheme, getCurrentThemeKey } from '@/src/shared/utils/districtUtils'

// Constants
import { 
  DEFAULT_SEOUL_VIEW, 
  VIEW_2D, 
  VIEW_3D, 
  LIGHTING_EFFECT,
  ANIMATION_CONFIG,
  LAYER_IDS 
} from './constants'

// Types
import type { FilterState } from '../LocalEconomyFilterPanel'
import type { FeatureCollection } from 'geojson'

// Lazy load heavy components
const DefaultChartsPanel = lazy(() => import('../charts/DefaultChartsPanel'))
const ResizablePanel = lazy(() => import('@/src/shared/components/ResizablePanel'))

// Transition configuration
import { LinearInterpolator, FlyToInterpolator } from '@deck.gl/core'

export default function CardSalesDistrictMap() {
  // Core refs
  const mapRef = useRef<MapRef>(null)
  const isProgrammaticUpdateRef = useRef(false)
  const currentBearingRef = useRef(0)
  
  // View state
  const [viewState, setViewState] = useState<MapViewState>(DEFAULT_SEOUL_VIEW)
  const [is3DMode, setIs3DMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  // Selection state
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedGuCode, setSelectedGuCode] = useState<number | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [selectedDongCode, setSelectedDongCode] = useState<number | null>(null)
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
  
  // UI state
  const [showChartPanel, setShowChartPanel] = useState(true)
  const [showMeshLayer, setShowMeshLayer] = useState(false)
  const [showBoundary, setShowBoundary] = useState(false)
  const [showDistrictLabels, setShowDistrictLabels] = useState(false)
  const [showDongLabels, setShowDongLabels] = useState(false)
  
  // Theme state
  const [currentThemeState, setCurrentThemeState] = useState(getCurrentTheme)
  const [currentThemeKey, setCurrentThemeKey] = useState('blue')
  
  // Layer configuration
  const { layerConfig, setLayerConfig } = useLayerState()
  
  // Data processing
  const { 
    sggData,
    dongData,
    jibData,
    dongData3D,
    seoulBoundaryData,
    dongSalesMap,
    dongSalesByTypeMap,
    isLoading,
    error
  } = useDataProcessor()
  
  // Mesh layer
  const { meshLayer, isLoading: meshLoading } = usePreGeneratedSeoulMeshLayer({
    visible: showMeshLayer && !is3DMode,
    opacity: 0.6,
    colorTheme: currentThemeKey
  })
  
  // District selection helper
  const districtSelection = useDistrictSelection({
    onDistrictSelect: (districtName: string | null) => {
      if (districtName) {
        setSelectedGu(districtName)
        setSelectedGuCode(getDistrictCode(districtName))
      }
    }
  })
  
  // Helper functions
  const getDistrictCodeHelper = useCallback((properties: any): string | null => {
    return properties?.ADM_DR_CD || 
           properties?.dongCode || 
           properties?.dong_code ||
           properties?.['행정동코드'] ||
           properties?.DONG_CD ||
           properties?.H_CODE ||
           null
  }, [])
  
  const getDistrictNameHelper = useCallback((properties: any): string | null => {
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
  
  const getGuNameHelper = useCallback((properties: any): string | null => {
    return properties?.guName || 
           properties?.['자치구'] ||
           properties?.SGG_NM ||
           properties?.SIGUNGU_NM ||
           properties?.SIG_KOR_NM ||
           null
  }, [])
  
  // Handle district zoom
  const handleDistrictZoom = useCallback((guName: string, dongName?: string | null) => {
    const center = dongName 
      ? getDistrictCenter('dong', dongName)
      : getDistrictCenter('gu', guName)
    
    if (center) {
      isProgrammaticUpdateRef.current = true
      
      setViewState({
        ...viewState,
        longitude: center[0],
        latitude: center[1],
        zoom: dongName ? 14 : 12,
        pitch: is3DMode ? 45 : 0,
        bearing: is3DMode ? -10 : 0,
        transitionDuration: ANIMATION_CONFIG.TRANSITION_DURATION,
        transitionInterpolator: new FlyToInterpolator({ speed: ANIMATION_CONFIG.TRANSITION_SPEED }),
        onTransitionEnd: () => {
          isProgrammaticUpdateRef.current = false
        }
      } as any)
    }
  }, [viewState, is3DMode])
  
  // Handle district selection
  const handleDistrictSelect = useCallback((gu: string | null, dong: string | null) => {
    setSelectedGu(gu)
    setSelectedDong(dong)
    
    if (gu) {
      setSelectedGuCode(getDistrictCode(gu))
      if (dong) {
        setSelectedDongCode(getDongCode(gu, dong))
        handleDistrictZoom(gu, dong)
      } else {
        setSelectedDongCode(null)
        handleDistrictZoom(gu)
      }
    } else {
      setSelectedGuCode(null)
      setSelectedDongCode(null)
    }
  }, [handleDistrictZoom])
  
  // Handle filter changes
  const handleFilterChange = useCallback((filters: FilterState) => {
    setSelectedGu(filters.selectedGu)
    setSelectedGuCode(filters.selectedGuCode)
    setSelectedDong(filters.selectedDong)
    setSelectedDongCode(filters.selectedDongCode)
    
    if (filters.selectedGu) {
      handleDistrictZoom(filters.selectedGu, filters.selectedDong)
    }
  }, [handleDistrictZoom])
  
  // Handle reset
  const handleReset = useCallback(() => {
    setSelectedGu(null)
    setSelectedGuCode(null)
    setSelectedDong(null)
    setSelectedDongCode(null)
    setHoveredDistrict(null)
    
    isProgrammaticUpdateRef.current = true
    setViewState({
      ...DEFAULT_SEOUL_VIEW,
      transitionDuration: ANIMATION_CONFIG.TRANSITION_DURATION,
      transitionInterpolator: new FlyToInterpolator({ speed: ANIMATION_CONFIG.TRANSITION_SPEED }),
      onTransitionEnd: () => {
        isProgrammaticUpdateRef.current = false
      }
    } as any)
  }, [])
  
  // Handle 3D mode toggle
  const handle3DModeToggle = useCallback((enabled: boolean) => {
    setIs3DMode(enabled)
    
    isProgrammaticUpdateRef.current = true
    setViewState(prev => ({
      ...prev,
      pitch: enabled ? 45 : 0,
      bearing: enabled ? -10 : 0,
      transitionDuration: ANIMATION_CONFIG.TRANSITION_DURATION,
      transitionInterpolator: new LinearInterpolator(['pitch', 'bearing']),
      onTransitionEnd: () => {
        isProgrammaticUpdateRef.current = false
      }
    } as any))
  }, [])
  
  // Create layers
  const layers = useMemo(() => {
    const allLayers = []
    
    // Mesh layer (2D only)
    if (meshLayer && showMeshLayer && !is3DMode) {
      allLayers.push(meshLayer)
    }
    
    // District layers
    if (is3DMode && dongData3D) {
      // 3D polygon layers
      const dong3DLayers = createDong3DPolygonLayers({
        dongData3D,
        layerConfig,
        dongSalesMap,
        heightScale: 1,
        selectedGu,
        selectedDong,
        selectedGuCode,
        selectedDongCode,
        hoveredDistrict,
        currentThemeKey,
        timelineAnimationEnabled: false,
        isTimelinePlaying: false,
        getDistrictCode: getDistrictCodeHelper,
        getDistrictName: getDistrictNameHelper,
        getGuName: getGuNameHelper
      })
      allLayers.push(...dong3DLayers)
    } else {
      // 2D unified layers
      const unifiedLayers = createUnifiedDeckGLLayers({
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
        sggVisible: true,
        dongVisible: true,
        jibVisible: viewState.zoom > 14,
        showBoundary,
        dongSalesMap,
        heightScale: 1,
        currentThemeKey
      })
      allLayers.push(...unifiedLayers)
    }
    
    // Label layers
    if (showDistrictLabels && viewState.zoom >= 10) {
      allLayers.push(createDistrictLabelsTextLayer({
        visible: true,
        onClick: (info: PickingInfo) => {
          if (info.object?.nameKr) {
            handleDistrictSelect(info.object.nameKr, null)
          }
        }
      }))
    }
    
    if (showDongLabels && viewState.zoom >= 12) {
      allLayers.push(createDongLabelsTextLayer({
        visible: true,
        onClick: (info: PickingInfo) => {
          if (info.object?.name) {
            const guName = getGuNameHelper(info.object)
            handleDistrictSelect(guName, info.object.name)
          }
        }
      }))
    }
    
    return allLayers
  }, [
    meshLayer,
    showMeshLayer,
    is3DMode,
    dongData3D,
    sggData,
    dongData,
    jibData,
    seoulBoundaryData,
    layerConfig,
    dongSalesMap,
    selectedGu,
    selectedDong,
    selectedGuCode,
    selectedDongCode,
    hoveredDistrict,
    currentThemeKey,
    isDragging,
    viewState,
    showBoundary,
    showDistrictLabels,
    showDongLabels,
    handleDistrictSelect,
    getDistrictCodeHelper,
    getDistrictNameHelper,
    getGuNameHelper
  ])
  
  // Handle view state changes
  const handleViewStateChange = useMemo(() => 
    throttle(({ viewState: newViewState }: { viewState: MapViewState }) => {
      if (!isProgrammaticUpdateRef.current) {
        setViewState(newViewState)
        
        if (newViewState.bearing !== undefined) {
          currentBearingRef.current = newViewState.bearing
        }
      }
    }, 16), // 60fps
    []
  )
  
  // Handle hover
  const handleHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      const properties = info.object.properties || info.object
      const districtName = getDistrictNameHelper(properties) || getGuNameHelper(properties)
      setHoveredDistrict(districtName)
    } else {
      setHoveredDistrict(null)
    }
  }, [getDistrictNameHelper, getGuNameHelper])
  
  // Handle click
  const handleClick = useCallback((info: PickingInfo) => {
    if (info.object) {
      const properties = info.object.properties || info.object
      const guName = getGuNameHelper(properties)
      const dongName = getDistrictNameHelper(properties)
      
      if (dongName && guName) {
        handleDistrictSelect(guName, dongName)
      } else if (guName) {
        handleDistrictSelect(guName, null)
      }
    }
  }, [getGuNameHelper, getDistrictNameHelper, handleDistrictSelect])
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentThemeState(getCurrentTheme())
      setCurrentThemeKey(getCurrentThemeKey())
    }
    
    window.addEventListener('themeChange', handleThemeChange)
    return () => window.removeEventListener('themeChange', handleThemeChange)
  }, [])
  
  // Loading state
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading map data...</div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="text-red-500">Error loading map data: {error.message}</div>
      </div>
    )
  }
  
  return (
    <div className="relative h-full w-full overflow-hidden">
      <InteractionHandler
        isDragging={isDragging}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        onDistrictSelect={handleDistrictSelect}
        onHover={handleHover}
        onClick={handleClick}
      >
        <MapContainer
          viewState={viewState}
          layers={layers}
          onViewStateChange={handleViewStateChange}
          effects={is3DMode ? [LIGHTING_EFFECT] : []}
          mapRef={mapRef}
        />
      </InteractionHandler>
      
      <UIControls
        is3DMode={is3DMode}
        onToggle3D={handle3DModeToggle}
        showMeshLayer={showMeshLayer}
        showBoundary={showBoundary}
        showDistrictLabels={showDistrictLabels}
        showDongLabels={showDongLabels}
        onToggleMesh={setShowMeshLayer}
        onToggleBoundary={setShowBoundary}
        onToggleDistrictLabels={setShowDistrictLabels}
        onToggleDongLabels={setShowDongLabels}
        layerConfig={layerConfig}
        onLayerConfigChange={setLayerConfig}
        selectedGu={selectedGu}
        selectedDong={selectedDong}
        selectedBusinessType={null}
        selectedDate={null}
        onFilterChange={handleFilterChange}
        dongSalesMap={dongSalesMap}
        dongSalesByTypeMap={dongSalesByTypeMap}
        onReset={handleReset}
      />
      
      <Suspense fallback={
        <div className="absolute bottom-4 right-4 bg-gray-800 p-4 rounded">
          Loading charts...
        </div>
      }>
        {showChartPanel && (
          <ResizablePanel
            initialWidth={typeof window !== 'undefined' ? window.innerWidth * 0.4 : 600}
            minWidth={300}
            maxWidth={typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800}
            className="h-full bg-black/80"
          >
            <div className="h-full p-4">
              <DefaultChartsPanel />
            </div>
          </ResizablePanel>
        )}
      </Suspense>
    </div>
  )
}
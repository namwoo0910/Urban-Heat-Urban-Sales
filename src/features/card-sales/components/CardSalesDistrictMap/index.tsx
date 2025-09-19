/**
 * CardSalesDistrictMap Component
 * 
 * Main orchestrator component for Seoul district sales visualization.
 * Optimized with component splitting and performance enhancements.
 */

"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
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
import { createUnifiedDeckGLLayers } from '../DeckGLUnifiedLayers'
import { createDistrictLabelsTextLayer, createDongLabelsTextLayer } from '../DistrictLabelsTextLayer'
import { getDistrictCode, getDongCode } from '../../data/districtCodeMappings'
import { getDistrictCenter } from '../../data/districtCenters'
import { getCurrentTheme, getCurrentThemeKey } from '@/src/shared/utils/districtUtils'

// Constants
import {
  DEFAULT_SEOUL_VIEW,
  ANIMATION_CONFIG,
  LAYER_IDS
} from './constants'

// Types
import type { FeatureCollection } from 'geojson'

// Transition configuration
import { LinearInterpolator, FlyToInterpolator } from '@deck.gl/core'

export default function CardSalesDistrictMap() {
  // Core refs
  const mapRef = useRef<MapRef>(null)
  const isProgrammaticUpdateRef = useRef(false)
  const currentBearingRef = useRef(0)
  
  // View state
  const [viewState, setViewState] = useState<MapViewState>(DEFAULT_SEOUL_VIEW)
  const [isDragging, setIsDragging] = useState(false)
  
  // Selection state
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedGuCode, setSelectedGuCode] = useState<number | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [selectedDongCode, setSelectedDongCode] = useState<number | null>(null)
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
  
  // UI state
  const [showMeshLayer, setShowMeshLayer] = useState(false)
  const [showBoundary, setShowBoundary] = useState(false)
  const [showDistrictLabels, setShowDistrictLabels] = useState(false)
  const [showDongLabels, setShowDongLabels] = useState(false)
  
  // Theme state
  const [currentThemeState, setCurrentThemeState] = useState(getCurrentTheme)
  const [currentThemeKey, setCurrentThemeKey] = useState('blue')
  
  // Layer configuration
  const { layerConfig, updateConfig } = useLayerState()
  
  // Data processing
  const {
    sggData,
    dongData,
    jibData,
    seoulBoundaryData,
    dongSalesMap,
    dongSalesByTypeMap,
    isLoading,
    error
  } = useDataProcessor()
  
  // Mesh layer
  const { layer: meshLayer, isLoading: meshLoading } = usePreGeneratedSeoulMeshLayer({
    visible: showMeshLayer,
    opacity: 0.6
  })
  
  // Monitor mesh loading performance
  useEffect(() => {
    if (showMeshLayer && !meshLoading) {
      console.log('Mesh layer loaded:', {
        timestamp: performance.now()
      })
    }
  }, [meshLoading, showMeshLayer])
  
  // Reset has been moved to the main progressive rendering effect above
  
  // District selection helper
  const districtSelection = useDistrictSelection({
    mapRef: { current: null },
    onDistrictSelect: (districtName: string | null) => {
      if (districtName) {
        setSelectedGu(districtName)
        setSelectedGuCode(getDistrictCode(districtName) ?? null)
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
      ? getDistrictCenter('동', dongName)
      : getDistrictCenter('구', guName)
    
    if (center) {
      isProgrammaticUpdateRef.current = true
      
      setViewState({
        ...viewState,
        longitude: center[0],
        latitude: center[1],
        zoom: dongName ? 14 : 12,
        pitch: 0,
        bearing: 0,
        transitionDuration: ANIMATION_CONFIG.TRANSITION_DURATION,
        transitionInterpolator: new FlyToInterpolator({ speed: ANIMATION_CONFIG.TRANSITION_SPEED }),
        onTransitionEnd: () => {
          isProgrammaticUpdateRef.current = false
        }
      } as any)
    }
  }, [viewState])
  
  // Handle district selection
  const handleDistrictSelect = useCallback((gu: string | null, dong: string | null) => {
    setSelectedGu(gu)
    setSelectedDong(dong)
    
    if (gu) {
      setSelectedGuCode(getDistrictCode(gu) ?? null)
      if (dong) {
        setSelectedDongCode(getDongCode(gu, dong) ?? null)
        // 줌 기능 제거 - handleDistrictZoom(gu, dong)
      } else {
        setSelectedDongCode(null)
        // 줌 기능 제거 - handleDistrictZoom(gu)
      }
    } else {
      setSelectedGuCode(null)
      setSelectedDongCode(null)
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
  
  
  // Create layers
  const layers = useMemo(() => {
    const allLayers = []

    // Mesh layer
    if (meshLayer && showMeshLayer) {
      allLayers.push(meshLayer)
    }

    // Boundary layers (simplified - only boundary lines if needed)
    const unifiedLayers = createUnifiedDeckGLLayers({
      seoulBoundaryData,
      isDragging,
      viewState: { ...viewState, pitch: viewState.pitch ?? 0, bearing: viewState.bearing ?? 0 },
      showBoundary,
      onHover: handleHover,
      onClick: handleClick
    })
    allLayers.push(...unifiedLayers)
    
    // Label layers
    if (showDistrictLabels && viewState.zoom >= 10) {
      allLayers.push(createDistrictLabelsTextLayer({
        visible: true,
        viewState,
        selectedGu,
        selectedDong,
        hoveredDistrict,
        onClick: (districtName: string) => {
          handleDistrictSelect(districtName, null)
        }
      }))
    }
    
    if (showDongLabels && viewState.zoom >= 12) {
      allLayers.push(createDongLabelsTextLayer({
        dongData: dongData?.features || [],
        viewState,
        selectedGu,
        selectedDong,
        onClick: (districtName: string) => {
          const [gu, dong] = districtName.split(' ')
          handleDistrictSelect(gu, dong)
        }
      }))
    }
    
    return allLayers
  }, [
    meshLayer,
    showMeshLayer,
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
          effects={[]}
          mapRef={mapRef as any}
        />
      </InteractionHandler>
      
      <UIControls
        showMeshLayer={showMeshLayer}
        showBoundary={showBoundary}
        showDistrictLabels={showDistrictLabels}
        showDongLabels={showDongLabels}
        onToggleMesh={setShowMeshLayer}
        onToggleBoundary={setShowBoundary}
        onToggleDistrictLabels={setShowDistrictLabels}
        onToggleDongLabels={setShowDongLabels}
        layerConfig={layerConfig}
        onLayerConfigChange={updateConfig}
      />
    </div>
  )
}
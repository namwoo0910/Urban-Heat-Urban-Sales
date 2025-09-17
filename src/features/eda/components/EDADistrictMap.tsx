/**
 * EDA District Map Component
 *
 * Main map visualization for exploratory data analysis of Seoul districts.
 * Uses light theme by default for better data visibility.
 */

"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { throttle } from 'lodash-es'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import type { MapRef } from 'react-map-gl'

// Components
import { MapContainer } from './MapContainer'
import { UIControls } from './UIControls'

// Hooks
import { useDistrictData } from '../hooks/useDistrictData'

// Constants
import { DEFAULT_SEOUL_VIEW } from '../constants/mapConfig'

// Layers
import { createDistrictBoundaryLayers } from './layers/DistrictBoundaryLayers'
import type { ThemeKey } from '../utils/edaColorPalette'

export default function EDADistrictMap() {
  // Core refs
  const mapRef = useRef<MapRef>(null)

  // View state
  const [viewState, setViewState] = useState<MapViewState>(DEFAULT_SEOUL_VIEW)
  const [isDragging, setIsDragging] = useState(false)

  // Selection state
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)

  // UI state (fixed defaults without toggles)
  const showGuBoundaries = true
  const showDongBoundaries = true
  const showLabels = true

  // Theme & interaction state
  const currentTheme: ThemeKey = 'ocean'
  const useUniqueColors = true
  const [selectionMode, setSelectionMode] = useState<'gu' | 'dong'>('gu')

  // Load district data
  const { guData, dongData, isLoading, error } = useDistrictData()

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

  // Handle click
  const handleClick = useCallback((info: PickingInfo) => {
    if (info.object) {
      const properties = info.object.properties || info.object
      const guName = getGuName(properties)
      const dongName = getDistrictName(properties)

      if (selectionMode === 'gu') {
        if (guName) {
          setSelectedGu(guName)
          setSelectedDong(null)
        }
      } else {
        if (dongName && guName) {
          setSelectedGu(guName)
          setSelectedDong(dongName)
        } else if (guName) {
          setSelectedGu(guName)
        }
      }
    }
  }, [getGuName, getDistrictName, selectionMode])

  // Create layers
  const layers = useMemo(() => {
    const allLayers = []

    // District boundary layers with theme support
    const boundaryLayers = createDistrictBoundaryLayers({
      guData,
      dongData,
      showGuBoundaries,
      showDongBoundaries,
      showLabels,
      selectedGu,
      selectedDong,
      hoveredDistrict,
      viewState,
      onHover: handleHover,
      onClick: handleClick,
      theme: currentTheme,
      useUniqueColors,
      selectionMode
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
    selectedDong,
    hoveredDistrict,
    viewState,
    handleHover,
    handleClick,
    currentTheme,
    useUniqueColors,
    selectionMode
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

  useEffect(() => {
    setHoveredDistrict(null)
    if (selectionMode === 'gu') {
      setSelectedDong(null)
    }
  }, [selectionMode])

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
        onClick={handleClick}
        getTooltip={getTooltip}
        mapRef={mapRef}
        isDragging={isDragging}
      />

      <UIControls
        selectionMode={selectionMode}
        onSelectionModeChange={setSelectionMode}
      />

      {/* Info Panel */}
      {(selectedGu || selectedDong) && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs">
          <div className="space-y-2">
            {selectedGu && (
              <div>
                <span className="text-xs text-gray-500">선택된 구:</span>
                <div className="font-semibold text-gray-800">{selectedGu}</div>
              </div>
            )}
            {selectedDong && (
              <div>
                <span className="text-xs text-gray-500">선택된 동:</span>
                <div className="font-semibold text-gray-800">{selectedDong}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

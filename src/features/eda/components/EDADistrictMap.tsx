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
import type { MapRef } from 'react-map-gl'

// Components
import { MapContainer } from './MapContainer'
import { UIControls } from './UIControls'
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

export default function EDADistrictMap() {
  // Core refs
  const mapRef = useRef<MapRef>(null)

  // View state
  const [viewState, setViewState] = useState<MapViewState>(DEFAULT_SEOUL_VIEW)
  const [isDragging, setIsDragging] = useState(false)

  // Selection state
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedGuCode, setSelectedGuCode] = useState<number | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [selectedDongCode, setSelectedDongCode] = useState<number | null>(null)
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null)
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)

  // UI state
  const showGuBoundaries = true
  const showDongBoundaries = true
  const showLabels = true
  const [showChartPanel, setShowChartPanel] = useState(false)

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

  // Handle click with district code mapping
  const handleClick = useCallback((info: PickingInfo) => {
    if (info.object) {
      const properties = info.object.properties || info.object
      const guName = getGuName(properties)
      const dongName = getDistrictName(properties)

      if (selectionMode === 'gu') {
        if (guName) {
          setSelectedGu(guName)
          setSelectedGuCode(getDistrictCode(guName) || null)
          setSelectedDong(null)
          setSelectedDongCode(null)
        }
      } else {
        if (dongName && guName) {
          setSelectedGu(guName)
          setSelectedGuCode(getDistrictCode(guName) || null)
          setSelectedDong(dongName)
          setSelectedDongCode(getDongCode(guName, dongName) || null)
        } else if (guName) {
          setSelectedGu(guName)
          setSelectedGuCode(getDistrictCode(guName) || null)
        }
      }
    }
  }, [getGuName, getDistrictName, selectionMode])

  // Handle filter changes from LocalEconomyFilterPanel
  const handleFilterChange = useCallback((filters: FilterState) => {
    setSelectedGu(filters.selectedGu)
    setSelectedGuCode(filters.selectedGuCode)
    setSelectedDong(filters.selectedDong)
    setSelectedDongCode(filters.selectedDongCode)
    setSelectedBusinessType(filters.selectedBusinessType)
  }, [])

  // Handle selection mode change
  const handleSelectionModeChange = useCallback((mode: 'gu' | 'dong') => {
    setSelectionMode(mode)
    // Clear dong selection when switching to gu mode
    if (mode === 'gu') {
      setSelectedDong(null)
      setSelectedDongCode(null)
    }
  }, [])

  // Reset selection
  const handleReset = useCallback(() => {
    setSelectedGu(null)
    setSelectedGuCode(null)
    setSelectedDong(null)
    setSelectedDongCode(null)
    setSelectedBusinessType(null)
  }, [])

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
      setSelectedDongCode(null)
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
        onSelectionModeChange={handleSelectionModeChange}
        showChartPanel={showChartPanel}
        onToggleChartPanel={() => setShowChartPanel(!showChartPanel)}
      />

      {/* Filter panel */}
      <LocalEconomyFilterPanel
        onFilterChange={handleFilterChange}
        externalSelectedGu={selectedGu}
        externalSelectedDong={selectedDong}
        externalSelectedBusinessType={selectedBusinessType}
        className="fixed bottom-4 left-4 z-50"
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
            {selectedBusinessType && (
              <div>
                <span className="text-xs text-gray-500">선택된 업종:</span>
                <div className="font-semibold text-gray-800">{selectedBusinessType}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts panel */}
      {showChartPanel && (
        <div
          className="absolute top-0 right-0 h-full"
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
              initialWidth={typeof window !== 'undefined' ? window.innerWidth * 0.4 : 600}
              minWidth={300}
              maxWidth={typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800}
              className="h-full bg-white/95 backdrop-blur-sm shadow-lg"
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

      {/* Reset button */}
      {(selectedGu || selectedDong || selectedBusinessType) && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>전체 보기</span>
          </button>
        </div>
      )}

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
